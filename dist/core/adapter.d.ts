import { EventEmitter } from "node:events";
import type { ChannelType, IChannelAdapter, MediaPayload, SendOptions, SentMessageResult, UnifiedMessage } from "./types";
export declare abstract class BaseChannel extends EventEmitter implements IChannelAdapter {
    abstract readonly name: ChannelType;
    get provider(): ChannelType;
    protected dispatchMessage(msg: UnifiedMessage): Promise<void>;
    get accountId(): string;
    private _connected;
    isConnected(): boolean;
    protected setConnected(value: boolean): void;
    protected assertNotAborted(signal?: AbortSignal): void;
    abstract connect(signal?: AbortSignal): Promise<void>;
    abstract disconnect(signal?: AbortSignal): Promise<void>;
    abstract sendText(chatId: string, text: string, options?: SendOptions): Promise<SentMessageResult>;
    abstract sendMedia(chatId: string, media: MediaPayload, options?: SendOptions): Promise<SentMessageResult>;
    sendGif(chatId: string, urlOrPath: string, caption?: string, options?: SendOptions): Promise<SentMessageResult>;
    sendSticker(chatId: string, stickerIdOrUrl: string, options?: SendOptions): Promise<SentMessageResult>;
}
