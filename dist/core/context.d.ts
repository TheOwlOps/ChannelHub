import type { IChannelAdapter, MediaPayload, SendOptions, SentMessageResult, UnifiedMessage } from "./types";
import { type StreamOptions } from "./stream";
export interface MessageContext {
    message: UnifiedMessage;
    channel: IChannelAdapter;
    reply: (text: string, options?: SendOptions) => Promise<SentMessageResult>;
    replyMedia: (media: MediaPayload, options?: SendOptions) => Promise<SentMessageResult>;
    react: (emoji: string) => Promise<void>;
    sendTyping: () => Promise<void>;
    stream: (tokenStream: AsyncIterable<string>, options?: StreamOptions) => Promise<SentMessageResult[]>;
}
export declare function createMessageContext(message: UnifiedMessage, channel: IChannelAdapter): MessageContext;
