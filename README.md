<div align="center">
  <img src="./assets/banner.svg" alt="ChannelHub Banner" width="100%" />
</div>

<div align="center">

# 🌐 ChannelHub

*The Universal Multi-Channel Messaging SDK for AI Agents, Autonomous Systems & Microservices*

[![npm version](https://img.shields.io/npm/v/@theowlops/channelhub?color=blue&style=flat-square)](https://www.npmjs.com/package/@theowlops/channelhub)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg?style=flat-square)](LICENSE)
[![Bun](https://img.shields.io/badge/Runtime-Bun%20%7C%20Node%20%7C%20Deno-black?style=flat-square)](https://bun.sh)
[![AI Native](https://img.shields.io/badge/AI%20Agent-Universal%20MCP%20%7C%20REST-purple?style=flat-square)](#-model-context-protocol-mcp-server)

[English](./README.md) | [Tiếng Việt](./README.vi.md) | [中文](./README.zh.md)

</div>

---

## 📖 Table of Contents

- [Overview & Architecture](#-overview--architecture)
- [How It Works Deep Dive](#-how-it-works-deep-dive)
- [Key Features](#-key-features)
- [Installation](#-installation)
- [Quick Start](#-quick-start)
- [Channel Adapters](#-channel-adapters)
  - [Meta Messenger](#-meta-messenger-adapter)
  - [Zalo (Personal & OA)](#-zalo-adapter)
  - [Telegram](#-telegram-adapter)
  - [Discord](#-discord-adapter)
  - [Slack](#-slack-adapter)
- [Rich Media, Stickers & GIFs](#-rich-media-stickers--gifs)
- [SmartStreamer for LLMs](#-smartstreamer-for-llms)
- [Automated Personal Login](#-automated-personal-login)
- [Model Context Protocol (MCP) Server](#-model-context-protocol-mcp-server)
- [Security Hardening](#-security-hardening)
- [License](#-license)

---

## 🏛 Overview & Architecture

**ChannelHub** is an ultra-lightweight, zero-heavy-dependency messaging abstraction library designed for developers and AI systems. Instead of juggling distinct libraries (`grammy`, `discord.js`, `zca-js`, `facebook-chat-api`), ChannelHub bridges them all behind a single, ergonomic contract.

```
                              ┌──────────────────────────────────────────┐
                              │            Your Application /            │
                              │           AI Agent Framework             │
                              └────────────────────┬─────────────────────┘
                                                   │
                                                   ▼
                              ┌──────────────────────────────────────────┐
                              │                ChannelHub                │
                              │          (Core Event Engine)             │
                              └─────────┬──────────┬──────────┬──────────┘
                                        │          │          │
                     ┌──────────────────┴──┐       │       ┌──┴──────────────────┐
                     ▼                     ▼       ▼       ▼                     ▼
             ┌───────────────┐     ┌───────────────┐   ┌───────────────┐ ┌───────────────┐
             │ Messenger     │     │ Zalo          │   │ Telegram      │ │ Discord/Slack │
             │ Adapter       │     │ Adapter       │   │ Adapter       │ │ Adapters      │
             └───────┬───────┘     └───────┬───────┘   └───────┬───────┘ └───────┬───────┘
                     │                     │                   │                 │
                     ▼                     ▼                   ▼                 ▼
             Meta Graph API /       zca-js Web API        Telegram Bot      Discord/Slack
             Resumable Upload        & Anti-Ban Q           HTTP API           Gateways
```

---

## 📊 Channel Capability Matrix

| Channel | Outbound Send | Inbound Ingestion | Rich Media & Attachments | Native Reactions | Streaming & Typing | Current Status |
| :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| **Zalo** | ✅ Full API (Personal/OA) | ✅ Native Listener / Polling | ✅ Image, Video, File, Sticker, GIF | ✅ Full Native | ✅ Typing & Sentence Stream | **Stable Inbound/Outbound** |
| **Telegram** | ✅ Full Bot API | ✅ Polling & Webhook Handler | ✅ Photo, Video, File, Sticker, GIF | ✅ Native Reactions | ✅ Realtime In-place Edit Stream | **Stable Inbound/Outbound** |
| **Messenger** | ✅ Graph API v19.0 (100MB) | ⚡ Webhook Normalizer (`normalizeEvent`) | ✅ Image, Video, File, Sticker, GIF | ⏳ Planned v2.1 | ⚡ Typing Indicator | **Stable Outbound + Normalizer** |
| **Discord** | ✅ Bot REST API | ⚡ Webhook Normalizer (`normalizeEvent`) | ✅ Embeds & Attachments | ✅ Native Reactions | ⚡ Realtime In-place Edit Stream | **Stable Outbound + Normalizer** |
| **Slack** | ✅ Web API / Chat | ⚡ Events Normalizer (`normalizeEvent`) | ✅ File & Media | ⏳ Planned v2.1 | ⚡ Typing Indicator | **Stable Outbound + Normalizer** |

---

## 🔬 How It Works Deep Dive

### 1. Unified Message Protocol (`UnifiedMessage`)
Every incoming payload—regardless of whether it arrived from a Telegram Webhook, Discord WebSocket, or Meta Graph API payload—is normalized into an immutable, cross-platform standard representation:

```typescript
export interface UnifiedMessage {
  id: string;               // Normalized message identifier
  channel: ChannelType;     // "messenger" | "zalo" | "telegram" | "discord" | "slack"
  sender: {
    id: string;
    name?: string;
    username?: string;
    avatarUrl?: string;
    isBot?: boolean;
  };
  chat: {
    id: string;
    type: "dm" | "group" | "channel";
    title?: string;
  };
  content: {
    text: string;
    attachments?: MediaAttachment[];
    replyToId?: string;
  };
  raw: unknown;             // Original vendor payload preserved for platform-specific access
  timestamp: number;
}
```

### 2. The MessageContext Lifecycle
When an event occurs, ChannelHub constructs a `MessageContext` wrapper around the event. This decouples message reply logic from the underlying protocol:
- Calling `await ctx.reply("Hello")` resolves the originating channel, routes through the target adapter, manages rate-limiting queues, and emits typing indicators automatically.
- Calling `await ctx.sendMedia({ type: "image", source: "./image.png" })` validates local paths against directory traversal, detects MIME headers, and handles chunked file uploading seamlessly.

---

## 🌟 Key Features

- **Unified Multi-Platform API**: Write business logic once; execute identically on Messenger, Zalo, Telegram, Discord, and Slack.
- **AI-Native MCP Daemon**: Built-in stdio Model Context Protocol (MCP) server exposing **10 high-level tools** for Claude Desktop, Hermes Agent, and Codex.
- **SmartStreamer Token Batcher**: Seamlessly converts LLM token streams into real-time in-place message edits or sentence-boundary chunks with typing indicators.
- **Large Video Resumable Upload**: Native support for video assets up to **100MB** on Meta Messenger using the Graph API Attachment Upload protocol.
- **Native Sticker & Animated GIF Engine**: Send stickers and GIFs natively across all supported platforms.
- **Zero Heavy Core**: Core engine depends exclusively on Node.js / Bun standard library (`node:events`, native `fetch`).

---

## 📦 Installation

```bash
# Recommended (Bun)
bun add @theowlops/channelhub

# NPM
npm install @theowlops/channelhub

# PNPM
pnpm add @theowlops/channelhub
```

---

## ⚡ Quick Start

```typescript
import { ChannelHub } from "@theowlops/channelhub/core";
import { MessengerChannelAdapter } from "@theowlops/channelhub/channels/messenger";
import { TelegramChannelAdapter } from "@theowlops/channelhub/channels/telegram";

const hub = new ChannelHub();

// 1. Register Telegram
hub.register(new TelegramChannelAdapter({
  botToken: process.env.TELEGRAM_BOT_TOKEN!
}));

// 2. Register Facebook Messenger
hub.register(new MessengerChannelAdapter({
  pageId: process.env.MESSENGER_PAGE_ID!,
  pageAccessToken: process.env.MESSENGER_PAGE_TOKEN!,
  verifyToken: "my_webhook_secret"
}));

// 3. Central message dispatcher
hub.on("message", async (ctx) => {
  console.log(`[${ctx.channel}] ${ctx.message.sender.name}: ${ctx.message.content.text}`);

  if (ctx.message.content.text.startsWith("/echo ")) {
    const replyText = ctx.message.content.text.replace("/echo ", "");
    await ctx.reply(replyText);
  }
});

await hub.startAll();
```

---

## 🔌 Channel Adapters

### 🔵 Meta Messenger Adapter
Supports Meta Graph API v19.0 with webhook challenge verification, personal Playwright session recovery, and large file support.

```typescript
import { MessengerChannelAdapter } from "@theowlops/channelhub/channels/messenger";

const messenger = new MessengerChannelAdapter({
  pageAccessToken: "EAA...",
  verifyToken: "custom_token",
  pageId: "10029384912"
});
```

### 💬 Zalo Adapter
Supports reverse-engineered Web API (`zca-js`) personal sessions and Official Account (OA) v3 OpenAPI. Includes anti-ban jitter algorithms and automatic quote object generation.

```typescript
import { ZaloChannelAdapter } from "@theowlops/channelhub/channels/zalo";

const zalo = new ZaloChannelAdapter({
  credentialsPath: "./credentials.json", // Auto-captured session
  minDelayMs: 300,
  maxDelayMs: 800
});
```

### ✈️ Telegram Adapter
Lightweight bot integration via Telegram Bot API with native webhook and polling dispatchers.

```typescript
import { TelegramChannelAdapter } from "@theowlops/channelhub/channels/telegram";

const telegram = new TelegramChannelAdapter({
  botToken: "123456:ABC-DEF..."
});
```

---

## 🎨 Rich Media, Stickers & GIFs

ChannelHub normalizes rich media transmission across all platforms:

```typescript
// 1. Send Images / Files via URL or Local Path
await ctx.sendMedia({
  type: "image",
  source: "https://example.com/art.png",
  caption: "Concept Art"
});

// 2. Send Large Videos (Meta Resumable Upload up to 100MB)
await ctx.sendMedia({
  type: "video",
  source: "/var/media/demo_video.mp4"
});

// 3. Send Native Stickers
// Supports Telegram file_id, Zalo sticker ID, or Messenger sticker ID
await ctx.sendSticker("369239263222822");

// 4. Send Animated GIFs
await ctx.sendGif("https://media.giphy.com/media/cat.gif", "Cat Dancing");
```

---

## 🌊 SmartStreamer for LLMs

LLMs generate responses token by token. Direct API calls per token will hit rate-limits and get your bots banned. `SmartStreamer` solves this:
- **Editable Channels** (Discord, Telegram): Streams first chunk, then edits message at throttled intervals (`updateIntervalMs: 800`).
- **Non-Editable Channels** (Zalo, Messenger): Accumulates tokens and flushes them chunk by chunk on sentence boundaries (`.`, `!`, `?`, `\n`) while emitting typing signals.

```typescript
import { SmartStreamer } from "@theowlops/channelhub/core";

const streamer = new SmartStreamer(ctx, {
  chunkSentences: true,
  updateIntervalMs: 800
});

// Pipe tokens directly from OpenAI / Anthropic / Local LLM
for await (const chunk of llmTokenStream) {
  await streamer.write(chunk);
}
await streamer.end();
```

---

## 🔑 Automated Personal Login

ChannelHub provides built-in browser automation via Playwright Chromium to extract sessions for personal accounts without requiring developer app verification.

### Messenger Personal Login
```bash
bun run login:messenger
```
Launches an automated Chromium browser. Once you log into Facebook, it securely intercepts your `c_user` session cookies and writes `messenger.credentials.json`.

### Zalo Personal Login
```bash
bun run zalohub --login
```
Renders a terminal QR code for instant scan-and-connect authentication.

---

## 🤖 Model Context Protocol (MCP) Server

ChannelHub ships with a standalone stdio JSON-RPC MCP server. Connect your AI agent directly to all your chat channels with zero boilerplate.

### Starting the Daemon
```bash
channelhub-mcp
```

### Claude Desktop / Hermes Agent Config
Add to `claude_desktop_config.json`:
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

### 10 Standard MCP Tools
1. `channelhub_list_channels`: List active registered channels.
2. `channelhub_get_status`: Health-check channel connectivity.
3. `channelhub_send_message`: Send or reply to messages with text.
4. `channelhub_send_media`: Send photos, audio, documents, and videos.
5. `channelhub_send_sticker`: Send native stickers to any channel.
6. `channelhub_send_gif`: Send animated GIFs.
7. `channelhub_send_typing`: Simulate human-like typing status.
8. `channelhub_edit_message`: Edit previously dispatched messages.
9. `channelhub_add_reaction`: React to messages with emojis.
10. `channelhub_broadcast`: Broadcast a message across multiple channels in a single call.

---

## 🛡 Security Hardening

- **Localhost Loopback Default**: Webhook bridge defaults to `127.0.0.1` rather than `0.0.0.0`.
- **DoS Payload Limits**: Enforces a strict 1MB JSON body size ceiling before socket termination.
- **Path Traversal Guard**: All file uploads run through `path.resolve` and verify `fs.statSync().isFile()`, preventing arbitrary file disclosure.
- **Credential Hygiene**: Auto-masks sensitive tokens in logs (`[REDACTED]`) and enforces `.gitignore` rules against credential files.

---

## 📄 License

ChannelHub is licensed under the [MIT License](LICENSE). Maintained by [TheOwlOps Team](https://github.com/TheOwlOps).