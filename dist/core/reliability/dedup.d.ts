/**
 * High-performance sliding-window in-memory Idempotency Cache.
 * Protects against duplicate processing from webhook retries and network flutter.
 */
export interface IdempotencyCacheOptions {
    /** Maximum number of IDs to remember before evicting oldest. Default: 50,000 */
    maxEntries?: number;
    /** Time-to-live for stored IDs in milliseconds. Default: 300,000 (5 minutes) */
    ttlMs?: number;
}
export declare class IdempotencyCache {
    private readonly _maxEntries;
    private readonly _ttlMs;
    private readonly _map;
    constructor(options?: IdempotencyCacheOptions);
    /**
     * Checks if an ID has already been recorded.
     * If not, records it and returns true (new).
     * If yes and unexpired, returns false (duplicate).
     */
    checkAndSet(id: string): boolean;
    /**
     * Explicitly check if an ID exists without setting it.
     */
    has(id: string): boolean;
    /**
     * Purge expired entries to reclaim memory.
     */
    cleanup(): number;
    get size(): number;
    clear(): void;
}
