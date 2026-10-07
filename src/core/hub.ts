import { ChannelEventBus } from "./bus";
import { createMessageContext, type MessageContext } from "./context";
import { IdempotencyCache, type IdempotencyCacheOptions } from "./dedup";
import { IdentityStitcher } from "./identity";
import { HumanHandoffManager } from "./handoff";
import type { DeadLetterHandler, DeadLetterItem } from "./dlq";
import type { StatsCollector } from "./stats";
import type { DashboardBridge, DashboardBridgeConfig } from "../bridges/dashboard/index";
import type { IChannelAdapter, UnifiedMessage } from "./types";

export type MessageHandler = (ctx: MessageContext) => Promise<void> | void;

export type Middleware = (
  ctx: MessageContext,
  next: () => Promise<void>
) => Promise<void> | void;

export interface ChannelHubOptions {
  /** Enable message deduplication (prevents double processing from webhook retries). Default: false */
  enableDeduplication?: boolean;
  /** Deduplication cache options */
  dedupOptions?: IdempotencyCacheOptions;
  /** Dead Letter Queue callback for unhandled errors in message handlers */
  onDeadLetter?: DeadLetterHandler;
  /** Custom IdentityStitcher for resolving universal user identities. Auto-created if omitted. */
  identityStitcher?: IdentityStitcher;
  /** Optional StatsCollector that records inbound/outbound traffic for the live dashboard. */
  stats?: StatsCollector;
}

export class ChannelHub {
  private _channels = new Map<string, IChannelAdapter>();
  private _bus = new ChannelEventBus();
  private _messageHandlers: MessageHandler[] = [];
  private _middlewares: Middleware[] = [];
  
  // Primitives
  private _dedupCache?: IdempotencyCache;
  private _dlqHandler?: DeadLetterHandler;
  private _identityStitcher: IdentityStitcher;
  private _handoffManager: HumanHandoffManager;
  private _stats: StatsCollector | null;
  private _instrumented = new WeakSet<IChannelAdapter>();

  // Async queue for backpressure support
  private _queue: MessageContext[] = [];
  private _waiters: Array<(ctx: MessageContext | null) => void> = [];
  private _queueDrainWaiters: Array<() => void> = [];
  private _isClosed = false;

  constructor(options: ChannelHubOptions = {}) {
    if (options.enableDeduplication) {
      this._dedupCache = new IdempotencyCache(options.dedupOptions);
    }
    this._dlqHandler = options.onDeadLetter;
    this._identityStitcher = options.identityStitcher ?? new IdentityStitcher();
    this._handoffManager = new HumanHandoffManager();
    this._stats = options.stats ?? null;
  }

  /** Gets the active identity stitcher. */
  get identityStitcher(): IdentityStitcher {
    return this._identityStitcher;
  }

  /** Gets the human handoff manager. */
  get handoff(): HumanHandoffManager {
    return this._handoffManager;
  }

  /** Live traffic collector, when one is attached. */
  get stats(): StatsCollector | null {
    return this._stats;
  }

  /** Attaches (or replaces) the traffic collector and instruments already-registered channels. */
  set stats(collector: StatsCollector | null) {
    this._stats = collector;
    if (collector) {
      for (const ch of new Set(this._channels.values())) {
        this._instrumentOutbound(ch);
      }
    }
  }

  /**
   * Registers a middleware function to the pipeline.
   * Middlewares run sequentially before registered message handlers.
   */
  use(middleware: Middleware): this {
    this._middlewares.push(middleware);
    return this;
  }

  register(channel: IChannelAdapter): this {
    const provider = channel.provider || channel.name;
    const accountId = channel.accountId || "default";
    const fullKey = `${provider}:${accountId}`;

    if (this._channels.has(fullKey)) {
      throw new Error(`Channel '${fullKey}' is already registered in ChannelHub.`);
    }

    this._channels.set(fullKey, channel);
    // Set default provider alias if not present
    if (!this._channels.has(provider)) {
      this._channels.set(provider, channel);
    }
    // Also set by direct name if unique
    if (!this._channels.has(channel.name)) {
      this._channels.set(channel.name, channel);
    }

    this._instrumentOutbound(channel);

    channel.on("message", async (msg: UnifiedMessage) => {
      // 0. Idempotency Check (Dedup)
      if (this._dedupCache && msg.id) {
        const isNew = this._dedupCache.checkAndSet(`${channel.name}:${msg.id}`);
        if (!isNew) {
          return; // Duplicate delivery dropped
        }
      }

      // Record traffic stats after dedup so webhook retries are not double-counted
      this._stats?.recordInbound(msg);

      this._bus.emitMessage(msg);

      // Resolve stitched universal identity
      const identity = this._identityStitcher.resolve(
        channel.name,
        msg.sender.id,
      );

      const ctx = createMessageContext(msg, channel, identity, this._handoffManager);

      // If chat is currently handed off to a human, emit event and do not pass to automated handlers
      if (ctx.isHandedOff) {
        this._bus.emit("handoff", ctx);
      }

      // 1. Dispatch to AsyncIterable queue (Backpressure)
      if (this._waiters.length > 0) {
        const waiter = this._waiters.shift()!;
        waiter(ctx);
      } else {
        while (this._queue.length >= 2000 && !this._isClosed) {
          await new Promise<void>((resolve) => this._queueDrainWaiters.push(resolve));
        }
        if (!this._isClosed) {
          this._queue.push(ctx);
        }
      }

      // 2. Dispatch through Middleware Pipeline + Handlers
      const executePipeline = async (index: number): Promise<void> => {
        if (index < this._middlewares.length) {
          const fn = this._middlewares[index];
          await fn(ctx, () => executePipeline(index + 1));
          return;
        }

        // Only invoke automated bot handlers if the conversation is not paused for human takeover
        if (!ctx.isHandedOff) {
          for (const handler of this._messageHandlers) {
            await handler(ctx);
          }
        }
      };

      try {
        await executePipeline(0);
      } catch (err: any) {
        const errorObj = err instanceof Error ? err : new Error(String(err));
        this._stats?.recordError(channel.name);
        this._bus.emitError(errorObj);

        // 3. Dead Letter Queue handling
        if (this._dlqHandler) {
          try {
            await this._dlqHandler({
              message: msg,
              error: errorObj,
              timestamp: Date.now(),
              retryCount: 0,
              channel: channel.name,
            });
          } catch (dlqErr: any) {
            this._bus.emitError(dlqErr instanceof Error ? dlqErr : new Error(String(dlqErr)));
          }
        }
      }
    });

    channel.on("error", (err: Error) => {
      this._stats?.recordError(channel.name);
      this._bus.emitError(err);
    });

    return this;
  }

  /**
   * Wraps a channel's send methods so successful outbound sends are
   * counted by the StatsCollector without touching adapter internals.
   * Idempotent per channel; the collector is read late-bound so it can be
   * replaced after channels are registered.
   */
  private _instrumentOutbound(channel: IChannelAdapter): void {
    if (!this._stats || this._instrumented.has(channel)) return;
    this._instrumented.add(channel);
    const hub = this;
    const wrap = <A extends unknown[], R>(fn: (...args: A) => Promise<R>) =>
      async (...args: A): Promise<R> => {
        const result = await fn(...args);
        hub._stats?.recordOutbound(channel.name);
        return result;
      };
    const target = channel as unknown as Record<string, unknown>;
    for (const method of ["sendText", "sendMedia"] as const) {
      const original = target[method];
      if (typeof original === "function") {
        target[method] = wrap((original as (...args: unknown[]) => Promise<unknown>).bind(channel));
      }
    }
  }

  getChannel(providerOrKey: string, accountId?: string): IChannelAdapter | undefined {
    if (accountId) {
      return this._channels.get(`${providerOrKey}:${accountId}`);
    }
    return this._channels.get(providerOrKey);
  }

  listChannels(): string[] {
    // Return unique adapter full keys
    const seen = new Set<IChannelAdapter>();
    const keys: string[] = [];
    for (const [key, ch] of this._channels.entries()) {
      if (!seen.has(ch)) {
        seen.add(ch);
        keys.push(key);
      }
    }
    return keys;
  }

  onMessage(handler: MessageHandler): this {
    this._messageHandlers.push(handler);
    return this;
  }

  on(event: "message" | "error" | "handoff", handler: any): this {
    if (event === "message") {
      this.onMessage(handler);
    } else if (event === "error") {
      this._bus.on("error", handler);
    } else if (event === "handoff") {
      this._bus.on("handoff", handler);
    }
    return this;
  }

  /**
   * Async generator yielding incoming MessageContext with full backpressure
   */
  async *messages(signal?: AbortSignal): AsyncIterable<MessageContext> {
    while (!this._isClosed && !signal?.aborted) {
      if (this._queue.length > 0) {
        const item = this._queue.shift()!;
        if (this._queueDrainWaiters.length > 0) {
          const drain = this._queueDrainWaiters.shift()!;
          drain();
        }
        yield item;
        continue;
      }

      const next = await new Promise<MessageContext | null>((resolve) => {
        const waiter = (ctx: MessageContext | null) => {
          signal?.removeEventListener("abort", onAbort);
          resolve(ctx);
        };
        const onAbort = () => {
          const idx = this._waiters.indexOf(waiter);
          if (idx !== -1) this._waiters.splice(idx, 1);
          signal?.removeEventListener("abort", onAbort);
          resolve(null);
        };
        signal?.addEventListener("abort", onAbort, { once: true });
        this._waiters.push(waiter);
      });

      if (!next || signal?.aborted) break;
      yield next;
    }
  }

  async start(signal?: AbortSignal): Promise<void> {
    this._isClosed = false;
    const connected: IChannelAdapter[] = [];
    const uniqueChannels = Array.from(new Set(this._channels.values()));

    try {
      for (const ch of uniqueChannels) {
        if (signal?.aborted) {
          throw signal.reason || new Error("Startup aborted");
        }
        await ch.connect(signal);
        connected.push(ch);
      }
    } catch (err) {
      // Rollback already connected channels on failure
      await Promise.allSettled(connected.map((ch) => ch.disconnect()));
      throw err;
    }
  }

  async startAll(signal?: AbortSignal): Promise<void> {
    return this.start(signal);
  }

  /**
   * One-liner dashboard: creates, starts and attaches a DashboardBridge
   * to this hub. Equivalent to `new DashboardBridge(this, options)` + `start()`.
   * Returns the running bridge — `bridge.endpoint` is the local URL,
   * `bridge.stats` the underlying StatsCollector.
   */
  async dashboard(options: DashboardBridgeConfig = {}): Promise<DashboardBridge> {
    const { DashboardBridge } = await import("../bridges/dashboard/index");
    const bridge = new DashboardBridge(this, options);
    await bridge.start();
    return bridge;
  }

  async stop(signal?: AbortSignal): Promise<void> {
    this._isClosed = true;
    for (const waiter of this._waiters) {
      waiter(null);
    }
    this._waiters = [];

    while (this._queueDrainWaiters.length > 0) {
      const drain = this._queueDrainWaiters.shift()!;
      drain();
    }

    const uniqueChannels = Array.from(new Set(this._channels.values()));
    await Promise.allSettled(uniqueChannels.map((ch) => ch.disconnect(signal)));
  }
}
