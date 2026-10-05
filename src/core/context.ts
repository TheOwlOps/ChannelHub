import type {
  ActionNode,
  IChannelAdapter,
  MediaPayload,
  SendOptions,
  SentMessageResult,
  UnifiedMessage,
} from "./types";
import type { UniversalIdentity } from "./identity";
import type { HumanHandoffManager } from "./handoff";
import { SmartStreamer, type StreamOptions } from "./stream";

export interface MessageContext {
  message: UnifiedMessage;
  channel: IChannelAdapter;
  /** Canonical stitched user identity across all channels */
  identity?: UniversalIdentity;
  /** Whether this chat is currently paused for human takeover */
  isHandedOff?: boolean;
  /** Pause bot/AI from responding to this chat */
  handoff: (durationMs?: number, reason?: string) => void;
  /** Resume bot/AI operations for this chat */
  resume: () => boolean;
  reply: (text: string, options?: SendOptions) => Promise<SentMessageResult>;
  replyWithActions: (text: string, actions: ActionNode[], options?: SendOptions) => Promise<SentMessageResult>;
  replyMedia: (media: MediaPayload, options?: SendOptions) => Promise<SentMessageResult>;
  react: (emoji: string) => Promise<void>;
  sendTyping: () => Promise<void>;
  stream: (
    tokenStream: AsyncIterable<string>,
    options?: StreamOptions,
  ) => Promise<SentMessageResult[]>;
}

export function createMessageContext(
  message: UnifiedMessage,
  channel: IChannelAdapter,
  identity?: UniversalIdentity,
  handoffManager?: HumanHandoffManager,
): MessageContext {
  const isHandedOff = handoffManager ? handoffManager.isPaused(channel.name, message.chat.id) : false;

  return {
    message,
    channel,
    identity,
    isHandedOff,
    handoff: (durationMs?: number, reason?: string) => {
      if (handoffManager) {
        handoffManager.pause(channel.name, message.chat.id, durationMs, reason);
      }
    },
    resume: () => {
      return handoffManager ? handoffManager.resume(channel.name, message.chat.id) : false;
    },
    reply: (text: string, options?: SendOptions) =>
      channel.sendText(message.chat.id, text, {
        replyToId: message.id,
        ...options,
      }),
    replyWithActions: (text: string, actions: ActionNode[], options?: SendOptions) =>
      channel.sendText(message.chat.id, text, {
        replyToId: message.id,
        actions,
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
    sendTyping: async () => {
      if (channel.sendTyping) {
        await channel.sendTyping(message.chat.id);
      }
    },
    stream: async (tokenStream: AsyncIterable<string>, options?: StreamOptions) => {
      const streamer = new SmartStreamer(channel, options);
      return await streamer.stream(message.chat.id, tokenStream, {
        replyToId: message.id,
      });
    },
  };
}
