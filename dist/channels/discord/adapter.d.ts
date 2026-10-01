import { BaseChannel } from "../../core/adapter";
import type { ChannelType, MediaPayload, SendOptions, SentMessageResult, UnifiedMessage } from "../../core/types";
export interface DiscordAdapterConfig {
    botToken: string;
    accountId?: string;
    intents?: number;
    autoStart?: boolean;
}
/**
 * Lightweight Discord adapter using Discord HTTP REST API.
 * Gateway WS is optional — messages can be pushed via normalizeEvent() for webhook/gateway bridges.
 */
export declare class DiscordChannelAdapter extends BaseChannel {
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
    private config;
    private apiBase;
    private ws?;
    private heartbeatTimer?;
    private sequence;
    constructor(config: DiscordAdapterConfig);
    connect(signal?: AbortSignal): Promise<void>;
    private connectGateway;
    disconnect(signal?: AbortSignal): Promise<void>;
    normalizeEvent(event: any): UnifiedMessage | null;
    private callApi;
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
