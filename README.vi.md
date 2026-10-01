<div align="center">
  <img src="./assets/banner.svg" alt="ChannelHub Banner" width="100%" />
</div>

<div align="center">
  <img src="https://img.shields.io/npm/v/@theowlops/channelhub.svg?style=for-the-badge&logo=npm" alt="NPM Version" />
  <img src="https://img.shields.io/github/license/TheOwlOps/ChannelHub?style=for-the-badge" alt="License" />
  <img src="https://img.shields.io/npm/dw/@theowlops/channelhub?style=for-the-badge" alt="Downloads" />
</div>

# ChannelHub 🦉 (Vietnamese)

[English](./README.md) | [Tiếng Việt](./README.vi.md) | [中文](./README.zh.md)

**ChannelHub** là một SDK nhắn tin đa kênh (Multi-channel Messaging SDK) siêu nhẹ, được thiết kế đặc biệt cho các AI Agent, Bot độc lập và tự động hóa doanh nghiệp. Nó trừu tượng hoá API của các nền tảng chat phổ biến (Messenger, Zalo, Telegram, Discord, Slack) thành một chuẩn chung duy nhất: **UnifiedMessage**.

## 🌟 Tính năng cốt lõi

- 🎯 **Giao diện chuẩn hoá (Unified API)**: Code một lần, chạy mọi nền tảng. Xử lý tin nhắn đến và đi qua một interface `UnifiedMessage` chung.
- 🤖 **Thiết kế riêng cho AI & LLM (AI-Native)**:
  - Tích hợp sẵn **SmartStreamer**: tự động gom token từ LLM (streaming) theo độ dài câu trước khi gửi, hoặc edit message realtime (Discord, Telegram).
  - Tích hợp sẵn **MCP Server**: 10 công cụ (tools) JSON-RPC qua stdio giúp mọi LLM (Claude, Hermes, ChatGPT) kết nối ngay vào chat mà không cần code thêm.
- 📦 **Xử lý đa phương tiện (Rich Media & Attachments)**: 
  - Gửi ảnh, âm thanh, tệp tài liệu.
  - Tự động fallback và nén dung lượng lớn (Hỗ trợ upload video Meta Messenger lên đến 100MB qua Resumable API).
  - Hỗ trợ gửi **Sticker bản địa** (Native Sticker) và **GIF động** mượt mà trên Telegram, Zalo và Messenger.
  - Phân tích và trích xuất mọi tệp tin dị thường từ webhook (Location, Share link, Reel).
- 🔐 **Bảo mật tối đa (Hardened Security)**: Kiểm tra Path Traversal, tự động loại bỏ null bytes, và giới hạn payload DoS cho webhook.

## 🛠 Cách hoạt động (Architecture)

ChannelHub hoạt động dựa trên mô hình **Hub & Adapter**:

1. **Adapter Layer (`IChannelAdapter`)**: Mỗi kênh (Messenger, Zalo, Telegram...) là một Adapter. Nó có nhiệm vụ dịch API đặc thù của kênh đó (Graph API, zca-js, grammy, discord.js) thành format `UnifiedMessage`.
2. **ChannelHub (Core Engine)**: Trái tim của hệ thống. Nó quản lý nhiều Adapter cùng lúc. Khi có tin nhắn đến từ bất kỳ Adapter nào, nó phát (emit) sự kiện `message` kèm theo `MessageContext`.
3. **MessageContext**: Cung cấp các hàm `reply()`, `sendMedia()`, `react()` giúp nhà phát triển phản hồi tin nhắn mà không cần quan tâm tin nhắn đó đến từ Zalo hay Telegram.
4. **Bridges (Cầu nối)**: Các module giúp ChannelHub kết nối ra ngoài:
   - **WebhookBridge**: Lắng nghe Webhook (HTTP POST) từ Meta, Telegram, Slack. (Bao gồm bảo mật Bearer token và ngăn chặn DoS).
   - **MCP Bridge**: Khởi chạy một tiến trình con (stdio) cung cấp Tools cho các mô hình ngôn ngữ (LLM).

---

## 📊 Ma trận tính năng từng kênh (Capability Matrix)

| Kênh (Channel) | Gửi tin (Outbound) | Nhận tin (Inbound) | File & Đa phương tiện | Thả cảm xúc | Typing & Streaming | Trạng thái hiện tại |
| :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| **Zalo** | ✅ Full API (Cá nhân/OA) | ✅ Native Listener / Polling | ✅ Ảnh, Video, File, Sticker, GIF | ✅ Native Zalo | ✅ Typing & Sentence Stream | **Toàn diện (Inbound/Outbound)** |
| **Telegram** | ✅ Full Bot API | ✅ Polling & Webhook Handler | ✅ Ảnh, Video, File, Sticker, GIF | ✅ Native Emoji | ✅ Realtime In-place Edit Stream | **Toàn diện (Inbound/Outbound)** |
| **Messenger** | ✅ Graph API v19.0 (100MB) | ⚡ Webhook Normalizer (`normalizeEvent`) | ✅ Ảnh, Video, File, Sticker, GIF | ⏳ Dự kiến v2.1 | ⚡ Typing Indicator | **Ổn định Outbound + Normalizer** |
| **Discord** | ✅ Bot REST API | ⚡ Webhook Normalizer (`normalizeEvent`) | ✅ Embeds & Attachments | ✅ Native PUT Reaction | ⚡ Realtime In-place Edit Stream | **Ổn định Outbound + Normalizer** |
| **Slack** | ✅ Web API / Chat | ⚡ Events Normalizer (`normalizeEvent`) | ✅ File & Media | ⏳ Dự kiến v2.1 | ⚡ Typing Indicator | **Ổn định Outbound + Normalizer** |

---

## 🚀 Cài đặt

```bash
# Sử dụng Bun (Khuyến nghị)
bun add @theowlops/channelhub

# Sử dụng NPM
npm install @theowlops/channelhub
```

## 💻 Hướng dẫn sử dụng

### 1. Khởi tạo Hub và nhận tin nhắn

```typescript
import { ChannelHub } from "@theowlops/channelhub/core";
import { MessengerChannelAdapter } from "@theowlops/channelhub/channels/messenger";
import { TelegramChannelAdapter } from "@theowlops/channelhub/channels/telegram";

const hub = new ChannelHub();

// Cấu hình Telegram
hub.register(new TelegramChannelAdapter({
  botToken: "YOUR_TELEGRAM_BOT_TOKEN"
}));

// Cấu hình Messenger
hub.register(new MessengerChannelAdapter({
  pageId: "YOUR_PAGE_ID",
  pageAccessToken: "YOUR_PAGE_TOKEN",
  verifyToken: "YOUR_WEBHOOK_VERIFY_TOKEN"
}));

// Bắt sự kiện tin nhắn chung
hub.on("message", async (ctx) => {
  console.log(`[${ctx.channel}] ${ctx.message.sender.name}: ${ctx.message.content.text}`);
  
  // Trả lời lại người dùng
  await ctx.reply(`Xin chào! Bạn vừa nói: ${ctx.message.content.text}`);
});

await hub.startAll();
```

### 2. Gửi đa phương tiện (Ảnh, Video, Sticker, GIF)

```typescript
// Gửi ảnh qua link
await ctx.sendMedia({
  type: "image",
  source: "https://example.com/image.png",
  caption: "Ảnh đẹp"
});

// Gửi file từ ổ cứng cục bộ
await ctx.sendMedia({
  type: "video",
  source: "/path/to/video.mp4" // Tự động chặn path traversal
});

// Gửi Sticker hoặc GIF
await ctx.sendSticker("12345678"); // Sticker ID Zalo/Messenger hoặc Telegram file_id
await ctx.sendGif("https://media.giphy.com/media/funny-cat.gif", "Meo meo");
```

### 3. Tự động hóa đăng nhập Zalo & Messenger cá nhân

Khác với bot truyền thống (thường cần Fanpage/Bot Token), ChannelHub hỗ trợ các tài khoản cá nhân thông qua Playwright Chromium (tự động mở trình duyệt ẩn lấy Cookie).

**Lấy Cookie Messenger (Playwright):**
```bash
bun run login:messenger
```
Script sẽ sinh ra file `messenger.credentials.json` để hệ thống tự load.

**Lấy Cookie Zalo:**
Tương tự ZCA, chạy lệnh quét QR:
```bash
bun run zalohub --login
```

### 4. Tích hợp AI (MCP Server)

Khởi chạy MCP Daemon độc lập (cung cấp 10 Tools):

```bash
channelhub-mcp
```
Hoặc cấu hình vào `claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "channelhub": {
      "command": "bun",
      "args": ["run", "channelhub-mcp"]
    }
  }
}
```
**10 Công cụ AI (MCP Tools) được cung cấp:**
- `channelhub_list_channels`: Liệt kê các kênh
- `channelhub_get_status`: Xem trạng thái kết nối
- `channelhub_send_message`: Gửi Text
- `channelhub_send_media`: Gửi File / Ảnh
- `channelhub_send_sticker`: Gửi Sticker bản địa
- `channelhub_send_gif`: Gửi ảnh động
- `channelhub_send_typing`: Bật trạng thái "Đang gõ..."
- `channelhub_edit_message`: Sửa tin nhắn
- `channelhub_add_reaction`: Thả tim/emoji
- `channelhub_broadcast`: Bắn tin nhắn hàng loạt

## 📚 Giấy phép

Được phát hành dưới giấy phép MIT. Phát triển bởi TheOwlOps Team.