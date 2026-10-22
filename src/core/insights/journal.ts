/**
 * MessageJournal — a bounded in-memory journal / audit log of channel traffic.
 *
 * Records lightweight summaries of inbound messages, outbound sends and
 * channel errors in a fixed-size ring (oldest entries are evicted first), so
 * bots and AI agents can answer "what just happened?" for debugging and
 * observability without unbounded memory growth or a database.
 *
 * Zero dependencies. Pair it with the StatsCollector (aggregated counters)
 * when you need both long-term aggregates and recent raw events.
 */

/** Kind of traffic recorded for a journal entry. */
export type JournalEntryType = "inbound" | "outbound" | "error";

/** One recorded traffic event. */
export interface JournalEntry {
  /** Monotonically increasing id, starting at 1. */
  id: number;
  /** Epoch-ms timestamp of the event. */
  at: number;
  /** Whether this was an inbound message, an outbound send, or an error. */
  type: JournalEntryType;
  /** Channel name, e.g. "telegram". */
  channel: string;
  /** Chat/conversation id the event belongs to, when known. */
  chatId?: string;
  /** Sender id for inbound entries, when known. */
  senderId?: string;
  /** Message text (or a short summary of it), when relevant. */
  text?: string;
  /** Error message for error entries. */
  error?: string;
}

/** Filter for {@link MessageJournal.query}. All specified fields must match. */
export interface JournalQuery {
  channel?: string;
  chatId?: string;
  type?: JournalEntryType;
  /** Max entries to return (newest first). Default: 50. */
  limit?: number;
}

/** Aggregate counts over the entries currently retained in the journal. */
export interface JournalSummary {
  total: number;
  inbound: number;
  outbound: number;
  errors: number;
  /** Total entries (any type) keyed by channel name. */
  perChannel: Record<string, number>;
}

/** Options for {@link MessageJournal}. */
export interface JournalOptions {
  /** Maximum retained entries before the oldest are evicted. Default: 1000. */
  maxEntries?: number;
  /** Clock override, mainly for tests. Default: Date.now. */
  now?: () => number;
}

/** Shape accepted by the inbound/outbound convenience recorders. */
export interface JournalMessageInput {
  channel: string;
  chatId?: string;
  senderId?: string;
  text?: string;
}

export class MessageJournal {
  private readonly _maxEntries: number;
  private readonly _now: () => number;
  private _entries: JournalEntry[] = [];
  private _nextId = 1;

  constructor(options: JournalOptions = {}) {
    this._maxEntries = Math.max(1, options.maxEntries ?? 1000);
    this._now = options.now ?? Date.now;
  }

  /** Records an entry, assigning its id and timestamp. Returns the stored entry. */
  record(entry: Omit<JournalEntry, "id" | "at"> & { at?: number }): JournalEntry {
    const stored: JournalEntry = {
      ...entry,
      id: this._nextId++,
      at: entry.at ?? this._now(),
    };
    this._entries.push(stored);
    if (this._entries.length > this._maxEntries) {
      this._entries.splice(0, this._entries.length - this._maxEntries);
    }
    return stored;
  }

  /** Records an inbound message. */
  inbound(msg: JournalMessageInput): JournalEntry {
    return this.record({ ...msg, type: "inbound" });
  }

  /** Records an outbound send. */
  outbound(msg: JournalMessageInput): JournalEntry {
    return this.record({ ...msg, type: "outbound" });
  }

  /** Records an error on a channel (accepts an Error or a plain message). */
  error(channel: string, err: Error | string, chatId?: string): JournalEntry {
    return this.record({
      type: "error",
      channel,
      chatId,
      error: err instanceof Error ? err.message : err,
    });
  }

  /**
   * Returns retained entries, newest first. Every specified filter must
   * match; `limit` defaults to 50.
   */
  query(q: JournalQuery = {}): JournalEntry[] {
    const limit = q.limit ?? 50;
    const out: JournalEntry[] = [];
    for (let i = this._entries.length - 1; i >= 0 && out.length < limit; i--) {
      const e = this._entries[i];
      if (q.channel !== undefined && e.channel !== q.channel) continue;
      if (q.chatId !== undefined && e.chatId !== q.chatId) continue;
      if (q.type !== undefined && e.type !== q.type) continue;
      out.push(e);
    }
    return out;
  }

  /** The newest n entries (default 50), newest first. */
  recent(n = 50): JournalEntry[] {
    return this.query({ limit: n });
  }

  /** Aggregate counts over the currently retained entries. */
  summary(): JournalSummary {
    const s: JournalSummary = { total: 0, inbound: 0, outbound: 0, errors: 0, perChannel: {} };
    for (const e of this._entries) {
      s.total++;
      if (e.type === "inbound") s.inbound++;
      else if (e.type === "outbound") s.outbound++;
      else s.errors++;
      s.perChannel[e.channel] = (s.perChannel[e.channel] ?? 0) + 1;
    }
    return s;
  }

  /** Serializes retained entries as JSON Lines, oldest → newest. */
  toJSONL(): string {
    return this._entries.map((e) => JSON.stringify(e)).join("\n");
  }

  /** Number of entries currently retained. */
  get size(): number {
    return this._entries.length;
  }

  /** Drops all retained entries (ids keep incrementing). */
  clear(): void {
    this._entries = [];
  }
}
