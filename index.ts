import { Zalo, ThreadType, Reactions } from "zca-js";
import type { AttachmentSource } from "zca-js";
import fs from "node:fs";
import path from "node:path";

const CRED_PATH = path.resolve("./credentials.json");

export class ZaloHubBot {
  public api: any;

  constructor(apiInstance: any) {
    this.api = apiInstance;
  }

  // 1. Gửi tin nhắn text (hỗ trợ mention)
  async sendText(threadId: string, text: string, mentions: any[] = [], isGroup = true) {
    const threadType = isGroup ? ThreadType.Group : ThreadType.User;
    return await this.api.sendMessage({ msg: text, mentions }, threadId, threadType);
  }

  // 2. Gửi ảnh (đường dẫn file local)
  async sendImage(threadId: string, imagePath: string, caption = "", isGroup = true) {
    const threadType = isGroup ? ThreadType.Group : ThreadType.User;
    return await this.api.sendMessage(
      {
        msg: caption,
        attachments: [imagePath] as AttachmentSource[]
      },
      threadId,
      threadType
    );
  }

  // 3. Thả reaction/icon vào tin nhắn (HEART, LIKE, HAHA, WOW, SAD, ANGRY)
  async addReaction(
    threadId: string,
    msgId: string,
    cliMsgId: string,
    reaction: Reactions = Reactions.HEART,
    isGroup = true
  ) {
    const threadType = isGroup ? ThreadType.Group : ThreadType.User;
    return await this.api.addReaction(reaction, {
      data: { msgId, cliMsgId },
      threadId,
      type: threadType
    });
  }

  // 4. Thu hồi tin nhắn (Undo / Thu hồi phía mọi người)
  async recallMessage(msgObj: any) {
    return await this.api.undo(msgObj);
  }

  // 5. Xóa tin nhắn (chỉ phía tôi hoặc cả nhóm)
  async deleteMessage(msgObj: any, onlyMe = false) {
    return await this.api.deleteMessage(msgObj, onlyMe);
  }

  // 6. Gửi Sticker
  async sendSticker(threadId: string, stickerDetail: any, isGroup = true) {
    const type = isGroup ? ThreadType.Group : ThreadType.User;
    return await this.api.sendSticker(stickerDetail, threadId, type);
  }

  // 7. Lấy danh sách / search sticker theo keyword
  async getStickers(keyword: string) {
    return await this.api.getStickers(keyword);
  }

  // 8. Kick thành viên khỏi nhóm
  async kickMember(groupId: string, memberId: string | string[]) {
    const members = Array.isArray(memberId) ? memberId : [memberId];
    return await this.api.removeUserFromGroup(members, groupId);
  }

  // 9. Thêm thành viên vào nhóm
  async addMember(groupId: string, memberId: string | string[]) {
    const members = Array.isArray(memberId) ? memberId : [memberId];
    return await this.api.addUserToGroup(groupId, members);
  }

  // 10. Tạo nhóm chat mới
  async createGroup(groupName: string, memberIds: string[] = []) {
    return await this.api.createGroup({ name: groupName, members: memberIds });
  }

  // 11. Đổi tên nhóm
  async changeGroupName(groupId: string, newName: string) {
    return await this.api.changeGroupName(newName, groupId);
  }

  // 12. Đổi Avatar nhóm
  async changeGroupAvatar(groupId: string, avatarPath: string) {
    return await this.api.changeGroupAvatar(groupId, avatarPath);
  }

  // 13. Lấy thông tin nhóm chi tiết (members, admins, setting)
  async getGroupInfo(groupId: string | string[]) {
    return await this.api.getGroupInfo(groupId);
  }

  // 14. Lấy tất cả nhóm bot đang tham gia
  async getAllGroups() {
    return await this.api.getAllGroups();
  }

  // 15. Tìm kiếm người dùng qua số điện thoại
  async findUserByPhone(phone: string) {
    return await this.api.findUser(phone);
  }

  // 16. Lấy thông tin tài khoản bot hiện tại
  async getOwnId() {
    return await this.api.getOwnId();
  }

  // 17. Lấy thông tin profile người dùng theo UID
  async getUserInfo(userId: string) {
    return await this.api.getUserInfo(userId);
  }

  // 18. Lấy toàn bộ danh sách bạn bè
  async getAllFriends() {
    return await this.api.getAllFriends();
  }

  // 19. Chặn người dùng
  async blockUser(userId: string) {
    return await this.api.blockUser(userId);
  }

  // 20. Bỏ chặn người dùng
  async unblockUser(userId: string) {
    return await this.api.unblockUser(userId);
  }
}

async function main() {
  if (!fs.existsSync(CRED_PATH)) {
    console.error("Chưa có credentials.json. Chạy `bun run login` để quét QR trước.");
    process.exit(1);
  }

  const creds = JSON.parse(fs.readFileSync(CRED_PATH, "utf-8"));
  const zalo = new Zalo();
  const api = await zalo.login(creds);

  console.log("[Bun ZaloHub] Bot đã đăng nhập thành công!");

  const bot = new ZaloHubBot(api);
  const ownId = await bot.getOwnId();
  console.log(`[Bun ZaloHub] Bot ID: ${ownId}`);

  // Listener sự kiện tin nhắn
  api.listener.on("message", async (msg: any) => {
    try {
      const content = typeof msg.content === "string" ? msg.content.trim() : "";
      const threadId = msg.threadId;
      const isGroup = msg.type === ThreadType.Group;

      console.log(`[Tin nhắn] From: ${msg.uidFrom} | Nhóm: ${isGroup} | Nội dung: ${content}`);

      // 1. !ping - Kiểm tra bot sống
      if (content === "!ping") {
        await bot.sendText(threadId, "Pong! ZaloHub bot đang online trên Bun runtime.", [], isGroup);
      }

      // 2. !heart - Thả tim tin nhắn
      if (content === "!heart" && msg.msgId && msg.cliMsgId) {
        await bot.addReaction(threadId, msg.msgId, msg.cliMsgId, Reactions.HEART, isGroup);
      }

      // 3. !haha - Thả icon haha
      if (content === "!haha" && msg.msgId && msg.cliMsgId) {
        await bot.addReaction(threadId, msg.msgId, msg.cliMsgId, Reactions.HAHA, isGroup);
      }

      // 4. !kick @mention - Kích thành viên
      if (content.startsWith("!kick") && isGroup && msg.mentions?.length > 0) {
        for (const target of msg.mentions) {
          console.log(`[Kick] Đang kick UID ${target.uid} khỏi ${threadId}`);
          await bot.kickMember(threadId, target.uid);
        }
        await bot.sendText(threadId, "Đã kích thành viên vi phạm khỏi nhóm.", [], true);
      }

      // 5. !rename <tên mới> - Đổi tên nhóm
      if (content.startsWith("!rename ") && isGroup) {
        const newName = content.replace("!rename ", "").trim();
        if (newName) {
          await bot.changeGroupName(threadId, newName);
          await bot.sendText(threadId, `Đã đổi tên nhóm thành: ${newName}`, [], true);
        }
      }

      // 6. !groupinfo - Lấy thông tin nhóm
      if (content === "!groupinfo" && isGroup) {
        const info = await bot.getGroupInfo(threadId);
        const gData = info?.gridInfoMap?.[threadId];
        if (gData) {
          const text = `Nhóm: ${gData.name}\nThành viên: ${gData.totalMember}/${gData.maxMember}\nTrưởng nhóm: ${gData.creatorId}`;
          await bot.sendText(threadId, text, [], true);
        }
      }

      // 7. !findphone <sđt> - Tra cứu info qua SĐT
      if (content.startsWith("!findphone ")) {
        const phone = content.replace("!findphone ", "").trim();
        const user = await bot.findUserByPhone(phone);
        if (user) {
          await bot.sendText(threadId, `Tìm thấy: ${user.display_name} (UID: ${user.uid})`, [], isGroup);
        } else {
          await bot.sendText(threadId, "Không tìm thấy user với SĐT này.", [], isGroup);
        }
      }

      // 8. !undo - Thu hồi tin nhắn của bot (nếu trả lời quote)
      if (content === "!undo" && msg.quote) {
        await bot.recallMessage(msg.quote);
      }
    } catch (err) {
      console.error("[Bot Error]:", err);
    }
  });

  api.listener.start();
}

main().catch(console.error);
