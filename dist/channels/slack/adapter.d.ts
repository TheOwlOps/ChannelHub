import { BaseChannel } from "../../core/adapter";
import type { ChannelType, MediaPayload, SendOptions, SentMessageResult, UnifiedMessage } from "../../core/types";
export interface SlackAdapterConfig {
    botToken: string;
    accountId?: string;
    appToken?: string;
    signingSecret?: string;
}
export declare class SlackChannelAdapter extends BaseChannel {
    readonly name: ChannelType;
    readonly capabilities: {
        inbound: boolean;
        outbound: boolean;
        media: readonly ["image", "video", "file", "audio"];
        reactions: boolean;
        editing: boolean;
        typing: boolean;
        mode: "webhook";
    };
    private config;
    private apiBase;
    private ws?;
    constructor(config: SlackAdapterConfig);
    connect(signal?: AbortSignal): Promise<void>;
    disconnect(signal?: AbortSignal): Promise<void>;
    /**
     * Verifies Slack request signature (v0=...) with 5-minute replay window check.
     */
    verifySignature(rawBody: string | Buffer, signatureHeader?: string, timestampHeader?: string): boolean;
    normalizeEvent(event: any): UnifiedMessage | null;
    private callApi;
    sendText(chatId: string, text: string, options?: SendOptions): Promise<SentMessageResult>;
    sendMedia(chatId: string, media: MediaPayload, options?: SendOptions): Promise<SentMessageResult>;
    addReaction(chatId: string, messageId: string, emoji: string, options?: {
        signal?: AbortSignal;
    }): Promise<void>;
    sendTyping(chatId: string): Promise<void>;
    editText(chatId: string, messageId: string, text: string, options?: {
        signal?: AbortSignal;
    }): Promise<SentMessageResult>;
}
