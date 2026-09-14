import type { Command } from "../types.js";

export const kickCommand: Command = {
  name: "kick",
  description: "Kích thành viên khỏi nhóm theo tag @mention",
  groupOnly: true,
  execute: async ({ bot, msg, threadId }) => {
    if (!msg.mentions || msg.mentions.length === 0) {
      await bot.sendText(threadId, "Cần tag người cần kick: !kick @user", [], true);
      return;
    }

    for (const target of msg.mentions) {
      console.log(`[Mod] Kicking UID: ${target.uid} from group ${threadId}`);
      await bot.kickMember(threadId, target.uid);
    }
    await bot.sendText(threadId, "Đã xử lý kick thành viên vi phạm.", [], true);
  }
};

export const renameCommand: Command = {
  name: "rename",
  description: "Đổi tên nhóm chat",
  groupOnly: true,
  execute: async ({ bot, args, threadId }) => {
    const newName = args.join(" ").trim();
    if (!newName) {
      await bot.sendText(threadId, "Cú pháp: !rename <Tên mới>", [], true);
      return;
    }
    await bot.changeGroupName(threadId, newName);
    await bot.sendText(threadId, `Đã đổi tên nhóm thành: ${newName}`, [], true);
  }
};

export const groupInfoCommand: Command = {
  name: "groupinfo",
  description: "Xem thông tin phòng chat chi tiết",
  groupOnly: true,
  execute: async ({ bot, threadId }) => {
    const info = await bot.getGroupInfo(threadId);
    const gData = info?.gridInfoMap?.[threadId];
    if (gData) {
      const text = `Tên: ${gData.name}\nThành viên: ${gData.totalMember}/${gData.maxMember}\nTrưởng nhóm UID: ${gData.creatorId}`;
      await bot.sendText(threadId, text, [], true);
    }
  }
};
