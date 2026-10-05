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
export declare class TokenBucketLimiter {
    private _tokens;
    private readonly _capacity;
    private readonly _refillRate;
    private readonly _refillIntervalMs;
    private _lastRefill;
    constructor(options: TokenBucketOptions);
    /**
     * Calculate pending tokens based on time passed.
     */
    private refill;
    /**
     * Attempts to consume N tokens.
     * Resolves immediately if tokens are available.
     * If insufficient tokens, it waits (throttles) until tokens refill, up to maxWaitMs.
     *
     * @param tokens Number of tokens to consume (default 1).
     * @param maxWaitMs Maximum time to wait. Throws if timeout exceeded (default: wait indefinitely).
     * @returns true when tokens are consumed successfully.
     */
    acquire(tokens?: number, maxWaitMs?: number): Promise<boolean>;
    get tokensAvailable(): number;
}
