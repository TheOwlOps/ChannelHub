/**
 * Token Bucket Rate Limiter.
 * Prevents channel account bans by controlling egress burst and sustained rate.
 */
export interface TokenBucketOptions {
  /** Maximum burst capacity. */
  capacity: number;
  /** Number of tokens added per refill interval. */
  refillRate: number;
  /** Time between refills in milliseconds (e.g., 1000 = 1 sec). */
  refillIntervalMs: number;
}

export class TokenBucketLimiter {
  private _tokens: number;
  private readonly _capacity: number;
  private readonly _refillRate: number;
  private readonly _refillIntervalMs: number;
  private _lastRefill: number;

  constructor(options: TokenBucketOptions) {
    this._capacity = Math.max(1, options.capacity);
    this._tokens = this._capacity; // Start full
    this._refillRate = Math.max(1, options.refillRate);
    this._refillIntervalMs = Math.max(1, options.refillIntervalMs);
    this._lastRefill = Date.now();
  }

  /**
   * Calculate pending tokens based on time passed.
   */
  private refill(): void {
    const now = Date.now();
    const elapsed = now - this._lastRefill;

    if (elapsed >= this._refillIntervalMs) {
      const intervals = Math.floor(elapsed / this._refillIntervalMs);
      const addedTokens = intervals * this._refillRate;
      this._tokens = Math.min(this._capacity, this._tokens + addedTokens);
      this._lastRefill += intervals * this._refillIntervalMs;
    }
  }

  /**
   * Attempts to consume N tokens.
   * Resolves immediately if tokens are available.
   * If insufficient tokens, it waits (throttles) until tokens refill, up to maxWaitMs.
   *
   * @param tokens Number of tokens to consume (default 1).
   * @param maxWaitMs Maximum time to wait. Throws if timeout exceeded (default: wait indefinitely).
   * @returns true when tokens are consumed successfully.
   */
  async acquire(tokens = 1, maxWaitMs?: number): Promise<boolean> {
    if (tokens > this._capacity) {
      throw new Error(`Cannot acquire ${tokens} tokens; exceeds bucket capacity of ${this._capacity}.`);
    }

    return new Promise((resolve, reject) => {
      let timeoutId: any;
      let intervalId: any;
      const start = Date.now();

      const tryAcquire = () => {
        this.refill();
        if (this._tokens >= tokens) {
          this._tokens -= tokens;
          cleanup();
          resolve(true);
          return true;
        }

        if (maxWaitMs !== undefined && Date.now() - start > maxWaitMs) {
          cleanup();
          reject(new Error(`Timeout of ${maxWaitMs}ms exceeded while waiting for rate limiter token.`));
          return true;
        }

        return false;
      };

      const cleanup = () => {
        if (timeoutId) clearTimeout(timeoutId);
        if (intervalId) clearInterval(intervalId);
      };

      // Try immediately
      if (tryAcquire()) return;

      // Otherwise, poll at the refill rate
      const pollMs = Math.min(this._refillIntervalMs, 50);
      intervalId = setInterval(tryAcquire, pollMs);

      if (maxWaitMs !== undefined) {
        timeoutId = setTimeout(() => {
          cleanup();
          reject(new Error(`Timeout of ${maxWaitMs}ms exceeded while waiting for rate limiter token.`));
        }, maxWaitMs);
      }
    });
  }

  get tokensAvailable(): number {
    this.refill();
    return this._tokens;
  }
}
