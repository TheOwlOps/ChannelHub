import { ChannelEventBus } from "./bus";
import { createMessageContext, type MessageContext } from "./context";
import type { IChannelAdapter, UnifiedMessage } from "./types";

export type MessageHandler = (ctx: MessageContext) => Promise<void> | void;

export class ChannelHub {
  private _channels = new Map<string, IChannelAdapter>();
  private _bus = new ChannelEventBus();
  private _messageHandlers: MessageHandler[] = [];

  register(channel: IChannelAdapter): this {
    if (this._channels.has(channel.name)) {
      throw new Error(`Channel '${channel.name}' is already registered in ChannelHub.`);
    }
    this._channels.set(channel.name, channel);

    channel.on("message", (msg: UnifiedMessage) => {
      this._bus.emitMessage(msg);
      const ctx = createMessageContext(msg, channel);
      for (const handler of this._messageHandlers) {
        Promise.resolve(handler(ctx)).catch((err) => {
          this._bus.emitError(err);
        });
      }
    });

    channel.on("error", (err: Error) => {
      this._bus.emitError(err);
    });

    return this;
  }

  getChannel(name: string): IChannelAdapter | undefined {
    return this._channels.get(name);
  }

  listChannels(): string[] {
    return Array.from(this._channels.keys());
  }

  onMessage(handler: MessageHandler): this {
    this._messageHandlers.push(handler);
    return this;
  }

  async start(): Promise<void> {
    const promises = Array.from(this._channels.values()).map((ch) => ch.connect());
    await Promise.all(promises);
  }

  async stop(): Promise<void> {
    const promises = Array.from(this._channels.values()).map((ch) => ch.disconnect());
    await Promise.all(promises);
  }
}
