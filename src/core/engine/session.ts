/**
 * SessionStore — in-memory conversation/session memory for AI agents.
 *
 * One session per (channel, chatId) pair holds:
 * - a free-form key/value `state` bag (wizard steps, slots, flags, …), and
 * - a bounded `history` of recent messages (user / assistant / system),
 *   ready to be fed back to an LLM as conversation context.
 *
 * Sessions expire after a TTL of inactivity; every access slides the
 * expiry forward, so an active conversation never times out mid-flow.
 *
 * Map-backed with zero dependencies. Not persisted — wrap or subclass
 * if you need durable storage.
 */

/** A single message recorded in a session's conversation history. */
export interface SessionMessage {
  role: "user" | "assistant" | "system";
  text: string;
  /** Unix timestamp (ms) when the message was recorded. */
  at: number;
  /** Optional platform user id of the sender. */
  senderId?: string;
}

/** Full state of one conversation session. */
export interface SessionData {
  /** Composite key, `${channel}:${chatId}` (see SessionStore.keyFor). */
  key: string;
  channel: string;
  chatId: string;
  /** Free-form per-session key/value state. */
  state: Record<string, unknown>;
  /** Recent messages, oldest first, trimmed to the store's maxHistory. */
  history: SessionMessage[];
  createdAt: number;
  updatedAt: number;
  /** Unix timestamp (ms) after which the session is considered expired. */
  expiresAt: number;
}

/** Options for {@link SessionStore}. */
export interface SessionStoreOptions {
  /**
   * Idle time-to-live in ms. Each access slides the expiry forward by
   * this amount. Default: 30 minutes.
   */
  ttlMs?: number;
  /** Maximum messages kept per session history. Default: 50. */
  maxHistory?: number;
  /** Clock source, injectable for tests. Default: Date.now. */
  now?: () => number;
}

const DEFAULT_TTL_MS = 30 * 60_000;
const DEFAULT_MAX_HISTORY = 50;

/**
 * In-memory store of conversation sessions, keyed by channel + chatId.
 *
 * @example
 * const sessions = new SessionStore({ ttlMs: 15 * 60_000 });
 * sessions.setState("telegram", "42", "step", "awaiting_address");
 * sessions.pushHistory("telegram", "42", { role: "user", text: "hi" });
 * const history = sessions.history("telegram", "42");
 */
export class SessionStore {
  private readonly sessions = new Map<string, SessionData>();
  private readonly ttlMs: number;
  private readonly maxHistory: number;
  private readonly now: () => number;

  constructor(options: SessionStoreOptions = {}) {
    this.ttlMs = options.ttlMs ?? DEFAULT_TTL_MS;
    this.maxHistory = options.maxHistory ?? DEFAULT_MAX_HISTORY;
    this.now = options.now ?? Date.now;
  }

  /** Composite map key for a (channel, chatId) pair. */
  static keyFor(channel: string, chatId: string): string {
    return `${channel}:${chatId}`;
  }

  /**
   * Returns the live session for the pair, creating a fresh one when it
   * is missing or expired. Access slides the expiry forward.
   */
  getOrCreate(channel: string, chatId: string): SessionData {
    const existing = this.live(SessionStore.keyFor(channel, chatId));
    if (existing) {
      this.touch(existing);
      return existing;
    }
    const at = this.now();
    const session: SessionData = {
      key: SessionStore.keyFor(channel, chatId),
      channel,
      chatId,
      state: {},
      history: [],
      createdAt: at,
      updatedAt: at,
      expiresAt: at + this.ttlMs,
    };
    this.sessions.set(session.key, session);
    return session;
  }

  /**
   * Returns the live session for the pair, or undefined when missing or
   * expired (expired sessions are purged). Never creates a session.
   * Access slides the expiry forward.
   */
  get(channel: string, chatId: string): SessionData | undefined {
    const session = this.live(SessionStore.keyFor(channel, chatId));
    if (!session) return undefined;
    this.touch(session);
    return session;
  }

  /** Sets one key in the session's state bag, creating the session if needed. */
  setState(channel: string, chatId: string, key: string, value: unknown): void {
    this.getOrCreate(channel, chatId).state[key] = value;
  }

  /** Reads one key from the session's state bag; undefined if no live session or key. */
  getState<T>(channel: string, chatId: string, key: string): T | undefined {
    return this.get(channel, chatId)?.state[key] as T | undefined;
  }

  /**
   * Appends a message to the session history (creating the session if
   * needed), stamping `at` with the current time unless provided.
   * History is trimmed to the most recent `maxHistory` entries.
   * Returns the updated session.
   */
  pushHistory(
    channel: string,
    chatId: string,
    msg: Omit<SessionMessage, "at"> & { at?: number },
  ): SessionData {
    const session = this.getOrCreate(channel, chatId);
    session.history.push({ ...msg, at: msg.at ?? this.now() });
    if (session.history.length > this.maxHistory) {
      session.history.splice(0, session.history.length - this.maxHistory);
    }
    return session;
  }

  /** Returns a copy of the session history; [] when there is no live session. */
  history(channel: string, chatId: string): SessionMessage[] {
    return [...(this.get(channel, chatId)?.history ?? [])];
  }

  /** Deletes the session for the pair. Returns true if one existed. */
  clear(channel: string, chatId: string): boolean {
    return this.sessions.delete(SessionStore.keyFor(channel, chatId));
  }

  /** Purges every expired session. Returns how many were removed. */
  sweep(): number {
    let removed = 0;
    for (const [key, session] of this.sessions) {
      if (this.now() > session.expiresAt) {
        this.sessions.delete(key);
        removed++;
      }
    }
    return removed;
  }

  /** Number of sessions currently stored (including not-yet-swept expired ones). */
  get size(): number {
    return this.sessions.size;
  }

  /** Returns the stored session if present and not expired; purges and returns undefined when expired. */
  private live(key: string): SessionData | undefined {
    const session = this.sessions.get(key);
    if (!session) return undefined;
    if (this.now() > session.expiresAt) {
      this.sessions.delete(key);
      return undefined;
    }
    return session;
  }

  /** Slides the expiry forward and stamps the access time. */
  private touch(session: SessionData): void {
    const at = this.now();
    session.updatedAt = at;
    session.expiresAt = at + this.ttlMs;
  }
}
