import type { Command } from "../types.js";
import { ZaloReactions as Reactions } from "../../channels/zalo/types.js";

export const heartCommand: Command = {
  name: "heart",
  description: "React with heart to the message",
  execute: async ({ bot, msg, threadId, isGroup }) => {
    if (msg.msgId && msg.cliMsgId) {
      await bot.addReaction(threadId, msg.msgId, msg.cliMsgId, Reactions.HEART, isGroup);
    }
  }
};

export const hahaCommand: Command = {
  name: "haha",
  description: "React with laugh to the message",
  execute: async ({ bot, msg, threadId, isGroup }) => {
    if (msg.msgId && msg.cliMsgId) {
      await bot.addReaction(threadId, msg.msgId, msg.cliMsgId, Reactions.HAHA, isGroup);
    }
  }
};

export const pingCommand: Command = {
  name: "ping",
  description: "Check latency and bot health status",
  execute: async ({ bot, threadId, isGroup }) => {
    await bot.sendText(threadId, "Pong! ChannelHub module online ⚡", [], isGroup);
  }
};
