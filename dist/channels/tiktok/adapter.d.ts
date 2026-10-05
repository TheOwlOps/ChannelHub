import { BaseChannel } from "../../core/adapter";
import type { ChannelType, MediaPayload, SendOptions, SentMessageResult, UnifiedMessage } from "../../core/types";
import type { TikTokBusinessConfig, TikTokRawMessage } from "./types";
/**
 * TikTok Business Messaging channel adapter.
 *
 * Security:
 * - Inbound webhooks must carry a valid `tiktok-signature` header (HMAC-SHA256).
 *   Verified using timingSafeEqual to avoid timing side-channels.
 * - Replay window enforced: messages older than maxWebhookAgeSeconds (default 300s)
 *   are rejected before signature check.
 * - Outbound calls pass `Access-Token` exclusively in HTTP headers, never in the URL.
 * - Sensitive values (clientSecret, accessToken) are never printed in logs or errors.
 *
 * Concurrency:
 * - Thread-safe / stateless handler: `handleWebhook` can be called concurrently
 *   from any number of HTTP server worker threads.
 * - Messages are pushed to ChannelHub's bounded queue without blocking the webhook response.
 */
export declare class TikTokBusinessAdapter extends BaseChannel {
    readonly name: ChannelType;
    readonly capabilities: {
        inbound: boolean;
        outbound: boolean;
        media: readonly ["image"];
        reactions: boolean;
        editing: boolean;
        typing: boolean;
        mode: "webhook";
    };
    private readonly config;
    private readonly apiRoot;
    private readonly maxAgeSec;
    constructor(config: TikTokBusinessConfig);
    connect(signal?: AbortSignal): Promise<void>;
    disconnect(signal?: AbortSignal): Promise<void>;
    /**
     * Verifies the incoming `tiktok-signature` header against rawBody and clientSecret.
     * Format: `t=<timestamp>,s=<hmac_hex>`
     * Signature payload: `${timestamp}.${rawBody}`
     *
     * @param rawBody - Exact unparsed Buffer or UTF-8 string from the HTTP request.
     * @param signatureHeader - Value of the `tiktok-signature` HTTP header.
     */
    verifySignature(rawBody: Buffer | string, signatureHeader?: string): boolean;
    /**
     * Entrypoint for HTTP webhook endpoints.
     * Validates signature, parses body, converts to UnifiedMessage, dispatches to core.
     *
     * @returns `true` if accepted & signature valid, `false` if unauthorized or unhandled.
     */
    handleWebhook(rawBody: Buffer | string, signatureHeader?: string): Promise<boolean>;
    /**
     * Converts a raw TikTok message object into ChannelHub's UnifiedMessage format.
     */
    normalizeMessage(msg: TikTokRawMessage): UnifiedMessage | null;
    sendText(conversationId: string, text: string, options?: SendOptions): Promise<SentMessageResult>;
    sendMedia(conversationId: string, media: MediaPayload, options?: SendOptions): Promise<SentMessageResult>;
    private postMessage;
}
