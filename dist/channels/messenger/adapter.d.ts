import { BaseChannel } from "../../core/adapter";
import type { ChannelType, MediaPayload, SendOptions, SentMessageResult, UnifiedMessage } from "../../core/types";
import type { MessengerAdapterConfig } from "./types";
export declare class MessengerChannelAdapter extends BaseChannel {
    readonly name: ChannelType;
    readonly capabilities: {
        inbound: boolean;
        outbound: boolean;
        media: readonly ["image", "video", "file", "audio", "animation", "sticker"];
        reactions: boolean;
        editing: boolean;
        typing: boolean;
        mode: "webhook";
    };
    private config;
    private apiBase;
    private server?;
    constructor(config: MessengerAdapterConfig);
    connect(signal?: AbortSignal): Promise<void>;
    disconnect(signal?: AbortSignal): Promise<void>;
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
    sendTyping(chatId: string, options?: {
        signal?: AbortSignal;
    }): Promise<void>;
    private callApi;
}
