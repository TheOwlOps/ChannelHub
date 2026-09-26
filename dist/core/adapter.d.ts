import { EventEmitter } from "node:events";
import type { ChannelType, IChannelAdapter, MediaPayload, SendOptions, SentMessageResult } from "./types";
export declare abstract class BaseChannel extends EventEmitter implements IChannelAdapter {
    abstract readonly name: ChannelType;
    private _connected;
    isConnected(): boolean;
    protected setConnected(value: boolean): void;
    abstract connect(): Promise<void>;
    abstract disconnect(): Promise<void>;
    abstract sendText(chatId: string, text: string, options?: SendOptions): Promise<SentMessageResult>;
    abstract sendMedia(chatId: string, media: MediaPayload, options?: SendOptions): Promise<SentMessageResult>;
}
