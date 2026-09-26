import { BaseChannel } from "../../core/adapter";
import type { ChannelType, MediaPayload, SendOptions, SentMessageResult, UnifiedMessage } from "../../core/types";
export interface SlackAdapterConfig {
    botToken: string;
    appToken?: string;
    signingSecret?: string;
}
export declare class SlackChannelAdapter extends BaseChannel {
    readonly name: ChannelType;
    private config;
    private apiBase;
    constructor(config: SlackAdapterConfig);
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    normalizeEvent(event: any): UnifiedMessage | null;
    private callApi;
    sendText(chatId: string, text: string, options?: SendOptions): Promise<SentMessageResult>;
    sendMedia(chatId: string, media: MediaPayload, options?: SendOptions): Promise<SentMessageResult>;
    addReaction(chatId: string, messageId: string, emoji: string): Promise<void>;
}
