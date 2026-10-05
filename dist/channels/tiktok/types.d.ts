/** TikTok Business Messaging adapter — config & raw API types. */
export interface TikTokBusinessConfig {
    /** App ID from TikTok for Business developer portal. */
    appId: string;
    /**
     * Client secret used to verify inbound webhook HMAC-SHA256 signatures.
     * Never logged or serialized.
     */
    clientSecret: string;
    /**
     * OAuth2 access token for outbound API calls.
     * Never passed via URL query — header only.
     */
    accessToken: string;
    /** Optional: override API base URL (e.g. for tests). */
    apiRoot?: string;
    /**
     * Maximum age (seconds) for a webhook delivery to be considered fresh.
     * Default: 300 (5 min). Reject stale replays beyond this window.
     */
    maxWebhookAgeSeconds?: number;
}
export type TikTokMessageType = "TEXT" | "IMAGE" | "SHARE_POST" | string;
export interface TikTokRawMessage {
    /** Unique message ID. */
    message_id: string;
    /** Conversation (thread) ID — use as chatId in ChannelHub. */
    conversation_id: string;
    sender_open_id: string;
    sender_display_name?: string;
    message_type: TikTokMessageType;
    /** Present when message_type === "TEXT". */
    text?: string;
    /** Present when message_type === "IMAGE". */
    image_url?: string;
    /** Unix timestamp (seconds). */
    create_time: number;
}
export interface TikTokWebhookBody {
    /** Event type, e.g. "message.receive". */
    event: string;
    /** JSON-encoded string containing the actual event payload. */
    content: string;
}
export interface TikTokSendTextPayload {
    conversation_id: string;
    message_type: "TEXT";
    content: {
        text: string;
    };
}
export interface TikTokSendImagePayload {
    conversation_id: string;
    message_type: "IMAGE";
    content: {
        media_id: string;
    };
}
export type TikTokSendPayload = TikTokSendTextPayload | TikTokSendImagePayload;
export interface TikTokSendResponse {
    code: number;
    message: string;
    request_id: string;
    data?: {
        message_id?: string;
    };
}
