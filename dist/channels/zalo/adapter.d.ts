import { BaseChannel } from "../../core/adapter";
import type { ChannelType, MediaPayload, SendOptions, SentMessageResult } from "../../core/types";
export interface ZaloAdapterConfig {
    api?: any;
    credentialsPath?: string;
    accountId?: string;
    ownId?: string;
    defaultIsGroup?: boolean;
    minDelayMs?: number;
    maxDelayMs?: number;
    cacheLimit?: number;
    proxy?: string;
    autoReconnect?: boolean;
}
export declare const EMOJI_TO_ZALO: Record<string, string>;
export declare class ZaloChannelAdapter extends BaseChannel {
    readonly name: ChannelType;
    readonly capabilities: {
        inbound: boolean;
        outbound: boolean;
        media: readonly ["image", "video", "file", "audio", "animation", "sticker"];
        reactions: boolean;
        editing: boolean;
        typing: boolean;
        mode: "gateway";
    };
    private api;
    private ownId?;
    private config;
    private threadTypeCache;
    private groupTitleCache;
    private stickerUrlCache;
    private messageCache;
    private reconnectAttempts;
    private isReconnecting;
    private reconnectTimer?;
    private sendQueue;
    constructor(config?: ZaloAdapterConfig);
    connect(signal?: AbortSignal): Promise<void>;
    disconnect(signal?: AbortSignal): Promise<void>;
    private setupEventListener;
    private recordInbound;
    private resolveThreadType;
    private resolveQuote;
    private enqueueSend;
    private normalizeMessage;
    sendText(chatId: string, text: string, options?: SendOptions): Promise<SentMessageResult>;
    sendMedia(chatId: string, media: MediaPayload, options?: SendOptions): Promise<SentMessageResult>;
    addReaction(chatId: string, messageId: string, emoji: string, options?: {
        signal?: AbortSignal;
    }): Promise<void>;
    sendTyping(chatId: string, options?: {
        signal?: AbortSignal;
    }): Promise<void>;
}
