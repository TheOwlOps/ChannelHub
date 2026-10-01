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
    private ws?;
    constructor(config: SlackAdapterConfig);
    connect(signal?: AbortSignal): Promise<void>;
    disconnect(signal?: AbortSignal): Promise<void>;
    normalizeEvent(event: any): UnifiedMessage | null;
    private callApi;
    sendText(chatId: string, text: string, options?: SendOptions): Promise<SentMessageResult>;
    sendMedia(chatId: string, media: MediaPayload, options?: SendOptions): Promise<SentMessageResult>;
    addReaction(chatId: string, messageId: string, emoji: string): Promise<void>;
    sendTyping(chatId: string): Promise<void>;
    editText(chatId: string, messageId: string, text: string): Promise<SentMessageResult>;
}
