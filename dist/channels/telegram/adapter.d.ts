import { BaseChannel } from "../../core/adapter";
import type { ChannelType, MediaPayload, SendOptions, SentMessageResult, UnifiedMessage } from "../../core/types";
import type { TelegramAdapterConfig } from "./types";
export declare class TelegramChannelAdapter extends BaseChannel {
    readonly name: ChannelType;
    readonly capabilities: {
        inbound: boolean;
        outbound: boolean;
        media: readonly ["image", "video", "document", "audio", "animation", "sticker"];
        reactions: boolean;
        editing: boolean;
        typing: boolean;
        mode: "polling";
    };
    private config;
    private apiRoot;
    private pollTimer;
    private lastUpdateId;
    private isPolling;
    constructor(config: TelegramAdapterConfig);
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    normalizeUpdate(update: any): UnifiedMessage | null;
    private callApi;
    private dispatchMessage;
    private startPolling;
    private stopPolling;
    sendText(chatId: string, text: string, options?: SendOptions): Promise<SentMessageResult>;
    sendMedia(chatId: string, media: MediaPayload, options?: SendOptions): Promise<SentMessageResult>;
    addReaction(chatId: string, messageId: string, emoji: string, options?: {
        signal?: AbortSignal;
    }): Promise<void>;
    sendTyping(chatId: string, options?: {
        signal?: AbortSignal;
    }): Promise<void>;
    editText(chatId: string, messageId: string, text: string, options?: {
        signal?: AbortSignal;
    }): Promise<SentMessageResult>;
}
