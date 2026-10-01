import type { Command } from "../types.js";
import { ZaloReactions as Reactions, type Reactions as ReactionType } from "../../channels/zalo/types.js";

// Common Unicode emoji mapping to Zalo Reaction icon code
export const EMOJI_TO_REACTION: Record<string, ReactionType | string> = {
  // Frequently used
  "❤️": Reactions.HEART,
  "💖": Reactions.HEART,
  "👍": Reactions.LIKE,
  "😆": Reactions.HAHA,
  "😂": Reactions.TEARS_OF_JOY,
  "😮": Reactions.WOW,
  "😭": Reactions.CRY,
  "😡": Reactions.ANGRY,
  "😘": Reactions.KISS,
  "💩": Reactions.SHIT,
  "🌹": Reactions.ROSE,
  "💔": Reactions.BROKEN_HEART,
  "👎": Reactions.DISLIKE,
  "😍": Reactions.LOVE,
  "🤔": Reactions.CONFUSED,
  "😉": Reactions.WINK,
  "☀️": Reactions.SUN,
  "🎂": Reactions.BIRTHDAY,
  "💣": Reactions.BOMB,
  "👌": Reactions.OK,
  "✌️": Reactions.PEACE,
  "🙏": Reactions.PRAY,
  "👏": Reactions.HANDCLAP,
  "😎": Reactions.SUNGLASSES,
  "👋": Reactions.BYE,
  "😴": Reactions.SLEEPY,
  // Alias text
  "heart": Reactions.HEART,
  "like": Reactions.LIKE,
  "haha": Reactions.HAHA,
  "wow": Reactions.WOW,
  "cry": Reactions.CRY,
  "angry": Reactions.ANGRY,
};

export const reactCommand: Command = {
  name: "react",
  aliases: ["emoji", "drop"],
  description: "React to message with emoji: !react ❤️ or quote a message and type !react 😂",
  execute: async ({ bot, msg, args, threadId, isGroup }) => {
    const emojiInput = args[0] || "❤️";
    const reactionCode = (EMOJI_TO_REACTION[emojiInput] || emojiInput) as any;

    // Priority 1: React to quoted/replied message
    if (msg.quote && msg.quote.msgId && msg.quote.cliMsgId) {
      await bot.addReaction(threadId, msg.quote.msgId, msg.quote.cliMsgId, reactionCode, isGroup);
      return;
    }

    // Priority 2: React directly to command message
    if (msg.msgId && msg.cliMsgId) {
      await bot.addReaction(threadId, msg.msgId, msg.cliMsgId, reactionCode, isGroup);
    }
  }
};
