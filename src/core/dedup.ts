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

export class IdempotencyCache {
  private readonly _maxEntries: number;
  private readonly _ttlMs: number;
  private readonly _map = new Map<string, number>();

  constructor(options: IdempotencyCacheOptions = {}) {
    this._maxEntries = options.maxEntries ?? 50_000;
    this._ttlMs = options.ttlMs ?? 300_000;
  }

  /**
   * Checks if an ID has already been recorded.
   * If not, records it and returns true (new).
   * If yes and unexpired, returns false (duplicate).
   */
  checkAndSet(id: string): boolean {
    const now = Date.now();
    const existing = this._map.get(id);

    if (existing !== undefined) {
      if (now < existing) {
        return false; // Already seen and still valid -> duplicate
      }
      // Expired -> treat as new and overwrite
    }

    // Capacity bound: evict oldest entry if full
    if (this._map.size >= this._maxEntries) {
      const oldestKey = this._map.keys().next().value;
      if (oldestKey) this._map.delete(oldestKey);
    }

    this._map.set(id, now + this._ttlMs);
    return true;
  }

  /**
   * Explicitly check if an ID exists without setting it.
   */
  has(id: string): boolean {
    const expiresAt = this._map.get(id);
    if (expiresAt === undefined) return false;
    if (Date.now() >= expiresAt) {
      this._map.delete(id);
      return false;
    }
    return true;
  }

  /**
   * Purge expired entries to reclaim memory.
   */
  cleanup(): number {
    const now = Date.now();
    let purged = 0;
    for (const [key, expiresAt] of this._map.entries()) {
      if (now >= expiresAt) {
        this._map.delete(key);
        purged++;
      }
    }
    return purged;
  }

  get size(): number {
    return this._map.size;
  }

  clear(): void {
    this._map.clear();
  }
}
