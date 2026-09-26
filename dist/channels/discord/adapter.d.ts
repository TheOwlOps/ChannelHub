import { BaseChannel } from "../../core/adapter";
import type { ChannelType, MediaPayload, SendOptions, SentMessageResult, UnifiedMessage } from "../../core/types";
export interface DiscordAdapterConfig {
    botToken: string;
    intents?: number;
    autoStart?: boolean;
}
/**
 * Lightweight Discord adapter using Discord HTTP REST API.
 * Gateway WS is optional — messages can be pushed via normalizeEvent() for webhook/gateway bridges.
 */
export declare class DiscordChannelAdapter extends BaseChannel {
    readonly name: ChannelType;
    private config;
    private apiBase;
    constructor(config: DiscordAdapterConfig);
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    normalizeEvent(event: any): UnifiedMessage | null;
    private callApi;
    sendText(chatId: string, text: string, options?: SendOptions): Promise<SentMessageResult>;
    sendMedia(chatId: string, media: MediaPayload, options?: SendOptions): Promise<SentMessageResult>;
    addReaction(chatId: string, messageId: string, emoji: string): Promise<void>;
    sendTyping(chatId: string): Promise<void>;
    editText(chatId: string, messageId: string, text: string): Promise<SentMessageResult>;
}
