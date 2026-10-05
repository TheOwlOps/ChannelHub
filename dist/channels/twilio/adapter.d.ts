import { BaseChannel } from "../../core/adapter";
import type { ChannelType, MediaPayload, SendOptions, SentMessageResult, UnifiedMessage } from "../../core/types";
import type { TwilioAdapterConfig, TwilioInboundPayload } from "./types";
/**
 * Twilio Omnichannel Adapter.
 * Connects 10+ channels (WhatsApp, SMS, MMS, RCS) via a single integration point.
 */
export declare class TwilioChannelAdapter extends BaseChannel {
    readonly name: ChannelType;
    readonly capabilities: {
        inbound: boolean;
        outbound: boolean;
        media: readonly ["image", "video", "audio", "file"];
        reactions: boolean;
        editing: boolean;
        typing: boolean;
        mode: "webhook";
    };
    private readonly config;
    private readonly apiRoot;
    constructor(config: TwilioAdapterConfig);
    connect(signal?: AbortSignal): Promise<void>;
    disconnect(signal?: AbortSignal): Promise<void>;
    /**
     * Twilio HMAC-SHA1 webhook signature verification.
     * Requires exact webhook URL and x-www-form-urlencoded parsed object.
     */
    verifySignature(signatureHeader: string | undefined, url: string, postData: Record<string, string>): boolean;
    /**
     * Main webhook entrypoint.
     */
    handleWebhook(postData: TwilioInboundPayload, signatureHeader?: string, exactUrl?: string): Promise<boolean>;
    normalizeMessage(msg: TwilioInboundPayload): UnifiedMessage | null;
    sendText(chatId: string, text: string, options?: SendOptions): Promise<SentMessageResult>;
    sendMedia(chatId: string, media: MediaPayload, options?: SendOptions): Promise<SentMessageResult>;
    private postTwilioMessage;
}
