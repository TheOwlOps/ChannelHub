/**
 * High-performance, lock-free Token Bucket Rate Limiter using SharedArrayBuffer.
 * Safe to share across multiple Node.js Worker Threads without external stores like Redis.
 */
export declare class SharedTokenBucketLimiter {
    readonly maxTokens: number;
    readonly refillRatePerSec: number;
    private mem;
    private readonly TOKENS_MASK;
    constructor(maxTokens: number, refillRatePerSec: number, sharedBuffer?: SharedArrayBuffer);
    get buffer(): SharedArrayBuffer;
    private pack;
    private unpack;
    /**
     * Attempts to consume tokens synchronously. Lock-free via Atomics.compareExchange.
     */
    tryAcquire(cost?: number): boolean;
    /**
     * Async acquire that waits if tokens are exhausted.
     */
    acquire(cost?: number, timeoutMs?: number): Promise<boolean>;
}
