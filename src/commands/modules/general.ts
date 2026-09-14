import type { Command } from "../types.js";
import { Reactions } from "zca-js";

export const heartCommand: Command = {
  name: "heart",
  description: "Thả tim vào tin nhắn được gửi",
  execute: async ({ bot, msg, threadId, isGroup }) => {
    if (msg.msgId && msg.cliMsgId) {
      await bot.addReaction(threadId, msg.msgId, msg.cliMsgId, Reactions.HEART, isGroup);
    }
  }
};

export const hahaCommand: Command = {
  name: "haha",
  description: "Thả icon haha vào tin nhắn",
  execute: async ({ bot, msg, threadId, isGroup }) => {
    if (msg.msgId && msg.cliMsgId) {
      await bot.addReaction(threadId, msg.msgId, msg.cliMsgId, Reactions.HAHA, isGroup);
    }
  }
};

export const pingCommand: Command = {
  name: "ping",
  description: "Kiểm tra độ trễ và trạng thái bot",
  execute: async ({ bot, threadId, isGroup }) => {
    await bot.sendText(threadId, "Pong! ZaloHub module online ⚡", [], isGroup);
  }
};
