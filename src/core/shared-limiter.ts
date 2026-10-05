const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * High-performance, lock-free Token Bucket Rate Limiter using SharedArrayBuffer.
 * Safe to share across multiple Node.js Worker Threads without external stores like Redis.
 */
export class SharedTokenBucketLimiter {
  private mem: BigInt64Array;
  private readonly TOKENS_MASK = (1n << 22n) - 1n;

  constructor(
    public readonly maxTokens: number,
    public readonly refillRatePerSec: number,
    sharedBuffer?: SharedArrayBuffer
  ) {
    if (maxTokens > 4_000_000) {
      throw new Error("SharedTokenBucketLimiter supports max 4,000,000 tokens per bucket.");
    }

    const buffer = sharedBuffer ?? new SharedArrayBuffer(8); // 64-bit integer
    this.mem = new BigInt64Array(buffer);

    if (!sharedBuffer) {
      // Initialize if we are the creator
      const initialPacked = this.pack(BigInt(Date.now()), BigInt(maxTokens));
      Atomics.store(this.mem, 0, initialPacked);
    }
  }

  public get buffer(): SharedArrayBuffer {
    return this.mem.buffer as SharedArrayBuffer;
  }

  private pack(timestampMs: bigint, tokens: bigint): bigint {
    return (timestampMs << 22n) | (tokens & this.TOKENS_MASK);
  }

  private unpack(packed: bigint): { timestampMs: bigint; tokens: bigint } {
    const tokens = packed & this.TOKENS_MASK;
    const timestampMs = packed >> 22n;
    return { timestampMs, tokens };
  }

  /**
   * Attempts to consume tokens synchronously. Lock-free via Atomics.compareExchange.
   */
  public tryAcquire(cost = 1): boolean {
    const costBn = BigInt(cost);
    let currentPacked = Atomics.load(this.mem, 0);

    while (true) {
      let { timestampMs, tokens } = this.unpack(currentPacked);
      const now = BigInt(Date.now());
      
      const elapsedMs = Number(now - timestampMs);
      if (elapsedMs > 0) {
        const added = Math.floor((elapsedMs / 1000) * this.refillRatePerSec);
        if (added > 0) {
          tokens = BigInt(Math.min(this.maxTokens, Number(tokens) + added));
          // Only move timestamp forward for the chunks we actually refilled
          const msConsumed = (added * 1000) / this.refillRatePerSec;
          timestampMs = timestampMs + BigInt(Math.floor(msConsumed));
        }
      }

      if (tokens < costBn) {
        return false; // Not enough tokens
      }

      const newPacked = this.pack(timestampMs, tokens - costBn);
      const actual = Atomics.compareExchange(this.mem, 0, currentPacked, newPacked);
      
      if (actual === currentPacked) {
        return true; // Atomic swap successful
      }
      
      // Contention occurred (another thread modified it). Retry loop.
      currentPacked = actual;
    }
  }

  /**
   * Async acquire that waits if tokens are exhausted.
   */
  public async acquire(cost = 1, timeoutMs = 5000): Promise<boolean> {
    const start = Date.now();
    while (true) {
      if (this.tryAcquire(cost)) return true;
      if (Date.now() - start > timeoutMs) return false;
      await delay(Math.max(10, Math.floor(1000 / this.refillRatePerSec)));
    }
  }
}
