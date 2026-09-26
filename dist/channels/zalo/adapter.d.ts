import { BaseChannel } from "../../core/adapter";
import type { ChannelType, MediaPayload, SendOptions, SentMessageResult } from "../../core/types";
export interface ZaloAdapterConfig {
    api?: any;
    credentialsPath?: string;
    ownId?: string;
    defaultIsGroup?: boolean;
}
export declare class ZaloChannelAdapter extends BaseChannel {
    readonly name: ChannelType;
    private api;
    private ownId?;
    private config;
    constructor(config?: ZaloAdapterConfig);
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    private setupEventListener;
    private normalizeMessage;
    sendText(chatId: string, text: string, options?: SendOptions): Promise<SentMessageResult>;
    sendMedia(chatId: string, media: MediaPayload, _options?: SendOptions): Promise<SentMessageResult>;
    addReaction(chatId: string, messageId: string, emoji: string): Promise<void>;
}
