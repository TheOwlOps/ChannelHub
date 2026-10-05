import { BaseChannel } from "../../core/adapter";
import type { ChannelType, MediaPayload, SendOptions, SentMessageResult, UnifiedMessage } from "../../core/types";
import type { MessengerAdapterConfig, MessengerPermission, MessengerSendOptions } from "./types";
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
     * Verify Facebook webhook subscription challenge with timing-safe comparison
     */
    verifyWebhook(mode: string, token: string, challenge: string): string | null;
    /**
     * Verifies X-Hub-Signature-256 header (HMAC-SHA256)
     */
    verifySignature(rawBody: string | Buffer, signatureHeader?: string): boolean;
    /**
     * Convert Facebook Messenger webhook event/entry to UnifiedMessage
     */
    normalizeEvent(body: any): UnifiedMessage[];
    sendText(chatId: string, text: string, options?: SendOptions & MessengerSendOptions): Promise<SentMessageResult>;
    sendMedia(chatId: string, media: MediaPayload, options?: SendOptions & MessengerSendOptions): Promise<SentMessageResult>;
    sendTyping(chatId: string, options?: {
        signal?: AbortSignal;
    }): Promise<void>;
    /**
     * Fetch granted scopes for the current Page Access Token
     */
    getPermissions(signal?: AbortSignal): Promise<MessengerPermission[]>;
    /**
     * Subscribe the Page to the app's Webhook
     */
    subscribePage(fields?: string[], signal?: AbortSignal): Promise<boolean>;
    /**
     * Sets Messenger Profile (Get Started button, greeting text)
     */
    setMessengerProfile(payload: Record<string, unknown>, signal?: AbortSignal): Promise<boolean>;
    private callApi;
}
