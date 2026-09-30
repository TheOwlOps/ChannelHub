import { BaseChannel } from "../../core/adapter";
import type { ChannelType, MediaPayload, SendOptions, SentMessageResult, UnifiedMessage } from "../../core/types";
import type { MessengerAdapterConfig } from "./types";
export declare class MessengerChannelAdapter extends BaseChannel {
    readonly name: ChannelType;
    private config;
    private apiBase;
    constructor(config: MessengerAdapterConfig);
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    /**
     * Verify Facebook webhook subscription challenge
     */
    verifyWebhook(mode: string, token: string, challenge: string): string | null;
    /**
     * Convert Facebook Messenger webhook event/entry to UnifiedMessage
     */
    normalizeEvent(body: any): UnifiedMessage[];
    sendText(chatId: string, text: string, options?: SendOptions): Promise<SentMessageResult>;
    sendMedia(chatId: string, media: MediaPayload, options?: SendOptions): Promise<SentMessageResult>;
    sendTyping(chatId: string): Promise<void>;
    private callApi;
}
