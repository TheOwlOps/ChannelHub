import type { DeadLetterHandler, DeadLetterItem } from "./dlq";

/** Options for {@link DeadLetterStore}. */
export interface DeadLetterStoreOptions {
  /** Maximum number of items kept in memory. Oldest items are evicted first. Default: 100 */
  maxEntries?: number;
}

/**
 * In-memory store for dead-lettered messages.
 *
 * `dlq.ts` defines the `DeadLetterItem` / `DeadLetterHandler` contract; this
 * store is the missing persistence half of that contract. Items produced by
 * the hub's DLQ callback can be collected here, inspected, and later
 * **replayed** through a handler once the underlying problem is fixed —
 * successfully replayed items are removed, while items that fail again stay
 * in the store with their `retryCount` incremented.
 *
 * The store is bounded (default 100 entries, oldest evicted first) so a
 * permanently broken handler cannot grow memory without limit.
 */
export class DeadLetterStore {
  private readonly _maxEntries: number;
  private _items: DeadLetterItem[] = [];

  constructor(options: DeadLetterStoreOptions = {}) {
    this._maxEntries = Math.max(1, options.maxEntries ?? 100);
  }

  /** Adds an item, evicting the oldest entries when the store is full. */
  add(item: DeadLetterItem): void {
    this._items.push(item);
    while (this._items.length > this._maxEntries) {
      this._items.shift();
    }
  }

  /**
   * Returns stored items in insertion order (oldest → newest), optionally
   * filtered by channel. The result is a copy — mutating it does not affect
   * the store.
   */
  list(filter?: { channel?: string }): DeadLetterItem[] {
    if (filter?.channel === undefined) {
      return [...this._items];
    }
    return this._items.filter((item) => item.channel === filter.channel);
  }

  /** Number of items currently stored. */
  get size(): number {
    return this._items.length;
  }

  /** Removes all stored items. */
  clear(): void {
    this._items = [];
  }

  /**
   * Replays every stored item through `handler`, in insertion order.
   *
   * - Success: the item is removed from the store and counted as `replayed`.
   * - Failure: the item is kept, its `retryCount` is incremented in place,
   *   and it is counted as `failed`.
   *
   * A failing item never stops the replay — remaining items are still tried.
   * Items added to the store while a replay is in progress are not part of
   * this pass.
   */
  async replay(handler: DeadLetterHandler): Promise<{ replayed: number; failed: number }> {
    const snapshot = [...this._items];
    let replayed = 0;
    let failed = 0;

    for (const item of snapshot) {
      try {
        await handler(item);
        const idx = this._items.indexOf(item);
        if (idx !== -1) this._items.splice(idx, 1);
        replayed++;
      } catch {
        item.retryCount++;
        failed++;
      }
    }

    return { replayed, failed };
  }

  /** Returns all stored items and removes them from the store (drain). */
  takeFailed(): DeadLetterItem[] {
    const drained = this._items;
    this._items = [];
    return drained;
  }
}
