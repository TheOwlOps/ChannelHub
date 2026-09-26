import type { IChannelAdapter, MediaPayload, SendOptions, SentMessageResult, UnifiedMessage } from "./types";
export interface MessageContext {
    message: UnifiedMessage;
    channel: IChannelAdapter;
    reply: (text: string, options?: SendOptions) => Promise<SentMessageResult>;
    replyMedia: (media: MediaPayload, options?: SendOptions) => Promise<SentMessageResult>;
    react: (emoji: string) => Promise<void>;
}
export declare function createMessageContext(message: UnifiedMessage, channel: IChannelAdapter): MessageContext;
