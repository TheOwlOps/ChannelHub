# ZaloHub 🚀

> Unified Zalo Automation SDK — **168+ thao tác** cho cả **Tài khoản Cá Nhân** và **Zalo OA**.  
> Cài 1 lệnh. Import 1 dòng. Tương thích **Hermes Agent**, **OpenClaw**, hoặc bất kỳ dự án Node/Bun/Deno nào.

---

## ⚡ Cài đặt

```bash
# npm
npm install zalohub

# bun
bun add zalohub

# yarn
yarn add zalohub
```

---

## 🔌 Tích hợp với Hermes Agent / OpenClaw

### Dùng như SDK (import vào code)

```ts
import { ZaloPersonalBot, ZaloOABot, initPersonalBot } from "zalohub";

// 1. Khởi tạo Bot Cá Nhân (cần credentials.json đã login trước)
const { bot, listenEvents } = await initPersonalBot();
await bot.sendText("group_id", "Hello from ZaloHub!", [], true);
await bot.addReaction("group_id", "msgId", "cliMsgId", "❤️");

// 2. Khởi tạo Bot OA
const oa = new ZaloOABot();
await oa.sendConsultantText("user_id", "Xin chào từ OA!");
```

### Tích hợp Hermes Plugin

```ts
// Trong file plugin Hermes
import { ZaloPersonalBot, initPersonalBot } from "zalohub";

export default async function myPlugin(hermes) {
  const { bot } = await initPersonalBot();

  hermes.on("message", async (msg) => {
    await bot.sendText(msg.threadId, "Bot phản hồi!", [], msg.isGroup);
  });
}
```

### Tích hợp OpenClaw

```ts
// Trong tool handler của OpenClaw
import { ZaloPersonalBot } from "zalohub";

export const zaloSendTool = {
  name: "zalo_send",
  description: "Gửi tin nhắn Zalo",
  execute: async (params, ctx) => {
    const bot = new ZaloPersonalBot(ctx.zaloApi);
    await bot.sendText(params.threadId, params.message, [], params.isGroup);
    return { success: true };
  }
};
```

---

## 🖥️ Dùng CLI (standalone)

```bash
# Đăng nhập quét QR
npx zalohub login

# Chạy bot service
npx zalohub start
```

---

## 🚀 Clone & chạy từ source

### Windows
```bat
git clone https://github.com/TheOwlOps/ZaloHub.git
cd ZaloHub
setup.bat
```

### macOS / Linux
```bash
git clone https://github.com/TheOwlOps/ZaloHub.git
cd ZaloHub
chmod +x setup.sh && ./setup.sh
```

---

## 📋 Cấu hình `.env`

```env
# Zalo OA (lấy từ https://developers.zalo.me)
ZALO_OA_APP_ID=
ZALO_OA_APP_SECRET=
ZALO_OA_ACCESS_TOKEN=
ZALO_OA_REFRESH_TOKEN=

# Bot Cá Nhân
ZALO_CRED_PATH=./credentials.json
```

---

## 🗂 Cấu trúc

```
ZaloHub/
├── src/
│   ├── config/             # Environment config
│   ├── personal/           # Zalo Personal SDK — 157 thao tác
│   │   ├── client.ts       # ZaloPersonalBot class
│   │   └── index.ts
│   ├── oa/                 # Zalo OA SDK — 11 thao tác
│   │   ├── client.ts       # ZaloOABot class
│   │   └── index.ts
│   ├── commands/           # Command Router (extensible)
│   │   ├── router.ts
│   │   └── modules/
│   └── index.ts            # Main export
├── dist/                   # Built output (ESM + CJS + .d.ts)
├── bin/cli.ts              # CLI entrypoint
├── scripts/
├── setup.bat / setup.sh    # 1-click installer
└── package.json
```

---

## ✨ 168+ Thao tác

### Zalo Cá Nhân (157)
| Nhóm | Số lượng | Ví dụ |
|---|---|---|
| Tin nhắn & Media | 14 | `sendText`, `sendImage`, `sendVideo`, `forwardMessage`, `recallMessage` |
| Emoji / Reaction | 7 | `addReaction("❤️")`, `sendSeenEvent`, `sendTypingEvent` |
| Sticker & File | 6 | `sendSticker`, `searchSticker`, `uploadAttachment` |
| Quản trị nhóm | 26 | `createGroup`, `kickMember`, `addDeputy`, `changeGroupAvatar` |
| Poll / Bình chọn | 6 | `createPoll`, `votePoll`, `lockPoll` |
| Bạn bè & Profile | 34 | `findUserByPhone`, `sendFriendRequest`, `blockUser` |
| Hội thoại | 13 | `setPinnedConversations`, `setMute`, `updateAutoDeleteChat` |
| Quick Reply & Auto | 8 | `addQuickMessage`, `createAutoReply` |
| Shop & Catalog | 10 | `createCatalog`, `createProductCatalog` |
| Hệ thống | 12 | `getSettings`, `keepAlive`, `getQR` |

### Zalo OA (11)
| Nhóm | Ví dụ |
|---|---|
| Tin CS | `sendConsultantText`, `sendConsultantImage` |
| Transaction/Promotion | `sendTransactionMessage`, `sendPromotionMessage` |
| User Management | `getProfile`, `getFollowers` |
| Tags | `getTags`, `tagUser`, `removeTag` |
| Media & Auth | `uploadImage`, `refreshAccessToken` |

---

## ⚠️ Bảo mật

- `credentials.json` và `.env` đã nằm trong `.gitignore` — **KHÔNG commit lên git**.
- Zalo Personal dùng **reverse API** (không chính thức) — nên dùng tài khoản phụ.

---

## 📄 License

MIT — [TheOwlOps](https://github.com/TheOwlOps)
