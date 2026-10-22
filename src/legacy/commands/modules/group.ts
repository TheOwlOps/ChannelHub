import type { Command } from "../types.js";

export const kickCommand: Command = {
  name: "kick",
  description: "Kick member from group via @mention tag",
  groupOnly: true,
  execute: async ({ bot, msg, threadId }) => {
    if (!msg.mentions || msg.mentions.length === 0) {
      await bot.sendText(threadId, "Must tag user to kick: !kick @user", [], true);
      return;
    }

    for (const target of msg.mentions) {
      console.log(`[Mod] Kicking UID: ${target.uid} from group ${threadId}`);
      await bot.removeUserFromGroup(threadId, target.uid);
    }
    await bot.sendText(threadId, "Member kicked successfully.", [], true);
  }
};

export const renameCommand: Command = {
  name: "rename",
  description: "Rename chat group",
  groupOnly: true,
  execute: async ({ bot, args, threadId }) => {
    const newName = args.join(" ").trim();
    if (!newName) {
      await bot.sendText(threadId, "Usage: !rename <New Name>", [], true);
      return;
    }
    await bot.changeGroupName(threadId, newName);
    await bot.sendText(threadId, `Group renamed to: ${newName}`, [], true);
  }
};

export const groupInfoCommand: Command = {
  name: "groupinfo",
  description: "View detailed group chat information",
  groupOnly: true,
  execute: async ({ bot, threadId }) => {
    const info = await bot.getGroupInfo(threadId);
    const gData = info?.gridInfoMap?.[threadId];
    if (gData) {
      const text = `Name: ${gData.name}\nMembers: ${gData.totalMember}/${gData.maxMember}\nOwner UID: ${gData.creatorId}`;
      await bot.sendText(threadId, text, [], true);
    }
  }
};
