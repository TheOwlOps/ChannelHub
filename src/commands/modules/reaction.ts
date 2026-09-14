import type { Command } from "../types.js";
import { Reactions } from "zca-js";

// Mapping emoji unicode phổ biến sang Zalo Reaction icon code
export const EMOJI_TO_REACTION: Record<string, Reactions | string> = {
  // Thường dùng
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
  description: "Thả emoji vào tin nhắn: !react ❤️ hoặc quote tin nhắn rồi gõ !react 😂",
  execute: async ({ bot, msg, args, threadId, isGroup }) => {
    const emojiInput = args[0] || "❤️";
    const reactionCode = (EMOJI_TO_REACTION[emojiInput] || emojiInput) as any;

    // Ưu tiên 1: Thả vào tin nhắn đang quote/reply
    if (msg.quote && msg.quote.msgId && msg.quote.cliMsgId) {
      await bot.addReaction(threadId, msg.quote.msgId, msg.quote.cliMsgId, reactionCode, isGroup);
      return;
    }

    // Ưu tiên 2: Thả thẳng vào chính tin nhắn vừa gửi lệnh
    if (msg.msgId && msg.cliMsgId) {
      await bot.addReaction(threadId, msg.msgId, msg.cliMsgId, reactionCode, isGroup);
    }
  }
};
