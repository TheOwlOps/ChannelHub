import { BaseChannel } from "../../core/adapter";
import type { ChannelType, MediaPayload, SendOptions, SentMessageResult, UnifiedMessage } from "../../core/types";
import type { WebhookGenericAdapterConfig } from "./types";
/**
 * WebhookGenericAdapter — catch-all adapter for any external webhook (Stripe,
 * Shopify, Jira, PagerDuty, Linear, etc.). Normalizes arbitrary payloads into
 * UnifiedMessage via dot-notation field mapping.
 */
export declare class WebhookGenericAdapter extends BaseChannel {
    readonly name: ChannelType;
    private config;
    constructor(config: WebhookGenericAdapterConfig);
    connect(_signal?: AbortSignal): Promise<void>;
    disconnect(): Promise<void>;
    /**
     * Verify signature using HMAC-SHA256 with timing-safe comparison.
     * Fail-closed: returns false if secret configured but header missing/mismatched.
     */
    verifySignature(payload: string | Buffer, headerValue: string): boolean;
    /**
     * Extract value from nested object using dot-notation ("data.object.id").
     */
    private getByPath;
    /**
     * Normalize an arbitrary payload into a UnifiedMessage using fieldMap.
     */
    normalizePayload(payload: Record<string, any>): UnifiedMessage;
    /**
     * Handle outbound sends via sendHandler or fallback to mock result.
     */
    sendText(chatId: string, text: string, _options?: SendOptions): Promise<SentMessageResult>;
    sendMedia(chatId: string, _media: MediaPayload, _options?: SendOptions): Promise<SentMessageResult>;
}
