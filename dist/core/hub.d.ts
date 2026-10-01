import { type MessageContext } from "./context";
import type { IChannelAdapter } from "./types";
export type MessageHandler = (ctx: MessageContext) => Promise<void> | void;
export declare class ChannelHub {
    private _channels;
    private _bus;
    private _messageHandlers;
    private _queue;
    private _waiters;
    private _queueDrainWaiters;
    private _isClosed;
    register(channel: IChannelAdapter): this;
    getChannel(providerOrKey: string, accountId?: string): IChannelAdapter | undefined;
    listChannels(): string[];
    onMessage(handler: MessageHandler): this;
    on(event: "message" | "error", handler: any): this;
    /**
     * Async generator yielding incoming MessageContext with full backpressure
     */
    messages(signal?: AbortSignal): AsyncIterable<MessageContext>;
    start(signal?: AbortSignal): Promise<void>;
    startAll(signal?: AbortSignal): Promise<void>;
    stop(signal?: AbortSignal): Promise<void>;
}
