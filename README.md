<div align="center">

# 🌐 ChannelHub

*The Universal Multi-Channel Messaging SDK for AI Agents & Modern Applications*

[![npm version](https://img.shields.io/npm/v/@theowlops/channelhub?color=blue&style=flat-square)](https://www.npmjs.com/package/@theowlops/channelhub)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg?style=flat-square)](LICENSE)
[![Bun](https://img.shields.io/badge/Runtime-Bun%20%7C%20Node%20%7C%20Deno-black?style=flat-square)](https://bun.sh)
[![AI Native](https://img.shields.io/badge/AI%20Agent-Universal%20MCP%20%7C%20REST-purple?style=flat-square)](#ai-agent-integrations)

Unified messaging protocol & channel adapters across **Zalo**, **Messenger**, **Telegram**, **Discord**, and **Slack**. Connect once, listen everywhere, reply with any AI framework.

[Highlights](#highlights) • [Quick Start](#quick-start) • [Channel Adapters](#channel-adapters) • [AI Integrations & MCP](#ai-agent-integrations) • [REST / SSE Webhook](#webhook-bridge)

</div>

---

## ✨ Highlights

- **Universal Multi-Channel Protocol**: Single `IChannelAdapter` contract and normalized `UnifiedMessage` across Zalo (Personal & OA), Messenger, Telegram, Discord, and Slack.
- **AI Agent Native**: First-class support for Model Context Protocol (MCP), Hermes Agent, OpenClaw, LangChain, CrewAI, and n8n/Dify.
- **Zero Heavy Core**: Lightweight event-driven architecture running on standard Web APIs and `node:events`. Zero bloat.
- **Universal Packaging**: Dual ESM & CommonJS outputs with complete TypeScript declaration maps (`.d.ts`).
- **Backward Compatible**: Retains 100% full API compatibility with existing `@theowlops/zalohub` personal & OA bot callers.

---

## 🚀 Installation

```bash
# bun (recommended)
bun add @theowlops/channelhub

# npm
npm install @theowlops/channelhub

# pnpm
pnpm add @theowlops/channelhub
```

---

## ⚡ Quick Start

### 1. Multi-Channel AI Bot (Native Event Loop)

```ts
import { ChannelHub } from "@theowlops/channelhub";
import { ZaloChannelAdapter } from "@theowlops/channelhub/zalo";
import { TelegramChannelAdapter } from "@theowlops/channelhub/telegram";
import { MessengerChannelAdapter } from "@theowlops/channelhub/messenger";

const hub = new ChannelHub();

// Register channels
hub.register(new ZaloChannelAdapter({ credentialsPath: "./credentials.json" }));
hub.register(new TelegramChannelAdapter({ botToken: process.env.TELEGRAM_BOT_TOKEN! }));
hub.register(new MessengerChannelAdapter({ 
  pageAccessToken: process.env.MESSENGER_PAGE_TOKEN!, 
  verifyToken: "my_secret" 
}));

// Single unified message handler for all platforms
hub.onMessage(async (ctx) => {
  console.log(`[${ctx.message.channel}] ${ctx.message.sender.name}: ${ctx.message.content.text}`);

  // Auto-reply back to the originating chat
  if (ctx.message.content.text === "/ping") {
    await ctx.reply("Pong from ChannelHub! 🚀");
  }

  // React with emoji
  await ctx.react("❤️");
});

await hub.start();
```

---

## 🔌 Channel Adapters

### 💬 Zalo Adapter (`@theowlops/channelhub/zalo`)
Supports both reverse-engineered personal web session (`zca-js`) and Official Account (OA) OpenAPI v3.

```ts
import { ZaloChannelAdapter } from "@theowlops/channelhub/zalo";

const zalo = new ZaloChannelAdapter({
  credentialsPath: "./credentials.json", // Generated via `bun run login:personal`
});
```

### 🔵 Messenger Adapter (`@theowlops/channelhub/messenger`)
Supports Facebook Messenger using the official Meta Graph API (`v19.0`) for both Fanpages and Headless-Personal-Auth logic!

```ts
import { MessengerChannelAdapter } from "@theowlops/channelhub/messenger";

const messenger = new MessengerChannelAdapter({
  pageAccessToken: "EAA...", // Your Page Access Token or Extracted User Token
  verifyToken: "my_verify_secret" // For Webhook validation
});
```

> **💡 Mẹo Đăng Nhập:** Có thể chạy lệnh `bun run login:messenger` để tự động mở Chromium, đăng nhập Facebook và bốc phiên Token một cách nhanh chóng mà không cần cấu hình lằng nhằng!

### ✈️ Telegram Adapter (`@theowlops/channelhub/telegram`)
Zero-dependency Telegram bot engine with automatic long-polling or webhook integration.

```ts
import { TelegramChannelAdapter } from "@theowlops/channelhub/telegram";

const tele = new TelegramChannelAdapter({
  botToken: "123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ",
});
```

### 🎮 Discord Adapter (`@theowlops/channelhub/discord`)
Ultra-lightweight HTTP REST & gateway parser for Discord bots.

```ts
import { DiscordChannelAdapter } from "@theowlops/channelhub/discord";

const discord = new DiscordChannelAdapter({
  botToken: process.env.DISCORD_BOT_TOKEN!,
});
```

### 💼 Slack Adapter (`@theowlops/channelhub/slack`)
Socket-mode & Event API adapter for workspace enterprise bots.

```ts
import { SlackChannelAdapter } from "@theowlops/channelhub/slack";

const slack = new SlackChannelAdapter({
  botToken: process.env.SLACK_BOT_TOKEN!,
});
```

---

## 🤖 AI Agent Integrations

### 🧩 Model Context Protocol (MCP) Server
Expose ChannelHub directly to **Claude Desktop**, **Cursor**, **Codex**, or **Hermes Agent**:

```ts
import { ChannelHub } from "@theowlops/channelhub";
import { getChannelHubMcpTools, handleChannelHubMcpCall } from "@theowlops/channelhub/mcp";

// Tools provided:
// - channelhub_list_channels: Liệt kê các kênh đang hoạt động
// - channelhub_get_status: Kiểm tra trạng thái kết nối từng kênh
// - channelhub_send_message: Gửi tin nhắn hoặc phản hồi
// - channelhub_send_media: Gửi ảnh, video, âm thanh hoặc file tài liệu
// - channelhub_send_typing: Hiển thị trạng thái đang soạn tin (typing)
// - channelhub_edit_message: Chỉnh sửa nội dung tin nhắn đã gửi
// - channelhub_add_reaction: Thả cảm xúc emoji
// - channelhub_broadcast: Gửi tin nhắn đồng loạt tới nhiều kênh/chatId cùng lúc
```

### 🌉 Webhook Bridge (REST & Server-Sent Events)
Run a local REST & SSE server for **n8n**, **Dify**, or **Flowise**:

```ts
import { ChannelHub } from "@theowlops/channelhub";
import { WebhookBridge } from "@theowlops/channelhub/webhook";

const hub = new ChannelHub();
const bridge = new WebhookBridge(hub, { port: 8788 });

await hub.start();
await bridge.start();

// Endpoints available:
// GET  http://localhost:8788/health
// GET  http://localhost:8788/channels
// POST http://localhost:8788/send      { "channel": "telegram", "chatId": "...", "text": "Hi" }
// GET  http://localhost:8788/events    (SSE real-time stream of all incoming messages)
```

---

## 📦 Subpath Imports

```ts
import { ChannelHub, BaseChannel, type UnifiedMessage } from "@theowlops/channelhub";
import { ZaloChannelAdapter } from "@theowlops/channelhub/zalo";
import { MessengerChannelAdapter } from "@theowlops/channelhub/messenger";
import { TelegramChannelAdapter } from "@theowlops/channelhub/telegram";
import { DiscordChannelAdapter } from "@theowlops/channelhub/discord";
import { SlackChannelAdapter } from "@theowlops/channelhub/slack";
import { WebhookBridge } from "@theowlops/channelhub/webhook";
import { getChannelHubMcpTools } from "@theowlops/channelhub/mcp";
```
