import { ChannelEventBus } from "./bus";
import { createMessageContext, type MessageContext } from "./context";
import type { IChannelAdapter, UnifiedMessage } from "./types";

export type MessageHandler = (ctx: MessageContext) => Promise<void> | void;

export class ChannelHub {
  private _channels = new Map<string, IChannelAdapter>();
  private _bus = new ChannelEventBus();
  private _messageHandlers: MessageHandler[] = [];
  
  // Async queue for backpressure support
  private _queue: MessageContext[] = [];
  private _waiters: Array<(ctx: MessageContext | null) => void> = [];
  private _isClosed = false;

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

    channel.on("message", async (msg: UnifiedMessage) => {
      this._bus.emitMessage(msg);
      const ctx = createMessageContext(msg, channel);

      // 1. Dispatch to AsyncIterable queue (Backpressure)
      if (this._waiters.length > 0) {
        const waiter = this._waiters.shift()!;
        waiter(ctx);
      } else {
        this._queue.push(ctx);
        // Bounded queue limit to prevent unbounded memory growth
        if (this._queue.length > 2000) {
          this._queue.shift(); // Drop oldest under extreme unconsumed pressure
        }
      }

      // 2. Dispatch to registered callbacks awaiting sequentially
      for (const handler of this._messageHandlers) {
        try {
          await handler(ctx);
        } catch (err: any) {
          this._bus.emitError(err instanceof Error ? err : new Error(String(err)));
        }
      }
    });

    channel.on("error", (err: Error) => {
      this._bus.emitError(err);
    });

    return this;
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

  on(event: "message" | "error", handler: any): this {
    if (event === "message") {
      this.onMessage(handler);
    } else if (event === "error") {
      this._bus.on("error", handler);
    }
    return this;
  }

  /**
   * Async generator yielding incoming MessageContext with full backpressure
   */
  async *messages(signal?: AbortSignal): AsyncIterable<MessageContext> {
    while (!this._isClosed && !signal?.aborted) {
      if (this._queue.length > 0) {
        yield this._queue.shift()!;
        continue;
      }

      const next = await new Promise<MessageContext | null>((resolve) => {
        const onAbort = () => {
          signal?.removeEventListener("abort", onAbort);
          resolve(null);
        };
        signal?.addEventListener("abort", onAbort, { once: true });
        this._waiters.push((ctx) => {
          signal?.removeEventListener("abort", onAbort);
          resolve(ctx);
        });
      });

      if (!next || signal?.aborted) break;
      yield next;
    }
  }

  async start(signal?: AbortSignal): Promise<void> {
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

  async stop(signal?: AbortSignal): Promise<void> {
    this._isClosed = true;
    for (const waiter of this._waiters) {
      waiter(null);
    }
    this._waiters = [];

    const uniqueChannels = Array.from(new Set(this._channels.values()));
    await Promise.allSettled(uniqueChannels.map((ch) => ch.disconnect(signal)));
  }
}
