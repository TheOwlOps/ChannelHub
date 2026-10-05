import { BaseChannel } from "../../core/adapter";
import type { ChannelType, MediaPayload, SendOptions, SentMessageResult, UnifiedMessage } from "../../core/types";
import type { EmailAdapterConfig, EmailSendOptions } from "./types";
export declare class EmailChannelAdapter extends BaseChannel {
    readonly name: ChannelType;
    private config;
    constructor(config: EmailAdapterConfig);
    connect(signal?: AbortSignal): Promise<void>;
    disconnect(): Promise<void>;
    sendText(chatId: string, text: string, options?: SendOptions & EmailSendOptions): Promise<SentMessageResult>;
    sendMedia(chatId: string, media: MediaPayload, options?: SendOptions & EmailSendOptions): Promise<SentMessageResult>;
    /**
     * Inbound webhook parser for received emails (Resend / SendGrid Inbound Parse)
     */
    handleInboundWebhook(rawPayload: any): UnifiedMessage;
}
