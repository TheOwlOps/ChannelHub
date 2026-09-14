import { Zalo, ThreadType, Reactions } from "zca-js";
import fs from "fs";
import path from "path";

const CRED_PATH = path.resolve("./credentials.json");

if (!fs.existsSync(CRED_PATH)) {
  console.error("Chua co credentials.json! Chay `node login.js` de quet QR truoc.");
  process.exit(1);
}

const creds = JSON.parse(fs.readFileSync(CRED_PATH, "utf-8"));
const zalo = new Zalo();
const api = await zalo.login(creds);

console.log("[ZaloHub] Bot da dang nhap va san sang lang nghe!");

export class ZaloActions {
  constructor(apiInstance) {
    this.api = apiInstance;
  }

  // 1. Gui tin nhan text kem mention
  async sendText(threadId, text, mentions = [], isGroup = true) {
    const threadType = isGroup ? ThreadType.Group : ThreadType.User;
    return await this.api.sendMessage({ msg: text, mentions }, threadId, threadType);
  }

  // 2. Gui anh (file local hoac buffer)
  async sendImage(threadId, imageFilePath, caption = "", isGroup = true) {
    const threadType = isGroup ? ThreadType.Group : ThreadType.User;
    return await this.api.sendMessage(
      {
        msg: caption,
        attachments: [imageFilePath]
      },
      threadId,
      threadType
    );
  }

  // 3. Tha tim / Tha icon / Reaction vao tin nhan
  // icon: Reactions.HEART, Reactions.LIKE, Reactions.HAHA, Reactions.WOW, Reactions.SAD, Reactions.ANGRY
  async addReaction(threadId, msgId, cliMsgId, reactionType = Reactions.HEART, isGroup = true) {
    const threadType = isGroup ? ThreadType.Group : ThreadType.User;
    return await this.api.addReaction(reactionType, {
      data: { msgId, cliMsgId },
      threadId,
      type: threadType
    });
  }

  // 4. Kick thanh vien khoi nhom (yeu cau bot phai lam Truong/Pho nhom)
  async kickMember(groupId, memberId) {
    const members = Array.isArray(memberId) ? memberId : [memberId];
    return await this.api.removeUserFromGroup(members, groupId);
  }

  // 5. Chan thanh vien vao lai nhom
  async blockMember(groupId, memberId) {
    return await this.api.addGroupBlockedMember(memberId, groupId);
  }

  // 6. Bo nhiem / Thu hoi Pho nhom
  async promoteDeputy(groupId, memberId) {
    return await this.api.addGroupDeputy(memberId, groupId);
  }

  async demoteDeputy(groupId, memberId) {
    return await this.api.removeGroupDeputy(memberId, groupId);
  }

  // 7. Doi ten nhom
  async changeGroupName(groupId, newName) {
    return await this.api.changeGroupName(newName, groupId);
  }
}

const bot = new ZaloActions(api);

// Listener lang nghe su kien tin nhan
api.listener.on("message", async (msg) => {
  try {
    const content = typeof msg.content === "string" ? msg.content : "";
    const threadId = msg.threadId;
    const isGroup = msg.type === ThreadType.Group;

    console.log(`[Message] From: ${msg.uidFrom} | Content: ${content}`);

    // Mau 1: Tu dong tha tim tat ca tin nhan
    if (msg.msgId && msg.cliMsgId) {
      // await bot.addReaction(threadId, msg.msgId, msg.cliMsgId, Reactions.HEART, isGroup);
    }

    // Mau 2: Lenh !kick @mention
    if (content.startsWith("!kick") && isGroup) {
      if (msg.mentions && msg.mentions.length > 0) {
        for (const target of msg.mentions) {
          console.log(`Kicking ${target.uid} khoi nhom ${threadId}`);
          await bot.kickMember(threadId, target.uid);
        }
        await bot.sendText(threadId, "Da kick thanh vien vi pham.", [], true);
      }
    }

    // Mau 3: Lenh !ping
    if (content === "!ping") {
      await bot.sendText(threadId, "Pong! ZaloHub bot active.", [], isGroup);
    }
  } catch (err) {
    console.error("[Bot Error]:", err);
  }
});

api.listener.start();
