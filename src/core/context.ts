import type {
  IChannelAdapter,
  MediaPayload,
  SendOptions,
  SentMessageResult,
  UnifiedMessage,
} from "./types";

export interface MessageContext {
  message: UnifiedMessage;
  channel: IChannelAdapter;
  reply: (text: string, options?: SendOptions) => Promise<SentMessageResult>;
  replyMedia: (media: MediaPayload, options?: SendOptions) => Promise<SentMessageResult>;
  react: (emoji: string) => Promise<void>;
}

export function createMessageContext(
  message: UnifiedMessage,
  channel: IChannelAdapter,
): MessageContext {
  return {
    message,
    channel,
    reply: (text: string, options?: SendOptions) =>
      channel.sendText(message.chat.id, text, {
        replyToId: message.id,
        ...options,
      }),
    replyMedia: (media: MediaPayload, options?: SendOptions) =>
      channel.sendMedia(message.chat.id, media, {
        replyToId: message.id,
        ...options,
      }),
    react: async (emoji: string) => {
      if (channel.addReaction) {
        await channel.addReaction(message.chat.id, message.id, emoji);
      }
    },
  };
}
