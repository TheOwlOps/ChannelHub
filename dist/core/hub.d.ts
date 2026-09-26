import { type MessageContext } from "./context";
import type { IChannelAdapter } from "./types";
export type MessageHandler = (ctx: MessageContext) => Promise<void> | void;
export declare class ChannelHub {
    private _channels;
    private _bus;
    private _messageHandlers;
    register(channel: IChannelAdapter): this;
    getChannel(name: string): IChannelAdapter | undefined;
    listChannels(): string[];
    onMessage(handler: MessageHandler): this;
    start(): Promise<void>;
    stop(): Promise<void>;
}
