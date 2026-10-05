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

## 📖 Mục Lục

- [Overview & Architecture](#-overview--architecture)
- [Channel Capability Matrix](#-channel-capability-matrix)
- [Cơ Chế Hoạt Động](#-how-it-works-deep-dive)
- [Tính Năng Chính](#-key-features)
- [Bắt Đầu Nhanh (Zero-Config)](#-bắt-đầu-nhanh-zero-config)
- [Các Kênh Hỗ Trợ](#-channel-adapters)
  - [🎵 TikTok for Business & Shop](#-tiktok-for-business-adapter)
  - [💬 Meta Messenger](#-meta-messenger-adapter)
  - [🔵 Zalo (Personal & OA)](#-zalo-adapter)
  - [✈️ Telegram](#-telegram-adapter)
  - [🎮 Discord](#-discord-adapter)
  - [💼 Slack](#-slack-adapter)
  - [📱 Twilio (WhatsApp & SMS)](#-twilio-adapter)
- [Rich Media, Stickers & GIFs](#-rich-media-stickers--gifs)
- [SmartStreamer for LLMs](#-smartstreamer-for-llms)
- [Bộ Công Cụ CLI (CLI Toolkit)](#-cli-toolkit)
- [Model Context Protocol (MCP) Server](#-model-context-protocol-mcp-server)
- [Bảo Mật Hệ Thống](#-security-hardening)
- [License](#-license)

---

## 🏛 Overview & Architecture

**ChannelHub** (`@theowlops/channelhub`) is an ultra-lightweight, high-performance messaging abstraction library designed for AI Agents, autonomous systems, and modern backend services. Instead of integrating multiple bespoke SDKs (`grammy`, `discord.js`, `zca-js`, Facebook/TikTok APIs), ChannelHub unifies them all behind a single, ergonomic, and strongly-typed contract with zero unnecessary runtime dependencies.

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
             │ TikTok        │     │ Messenger     │   │ Zalo          │ │ Telegram /    │
             │ Business      │     │ Adapter       │   │ Adapter       │ │ Discord/Slack │
             └───────┬───────┘     └───────┬───────┘   └───────┬───────┘ └───────┬───────┘
                     │                     │                   │                 │
                     ▼                     ▼                   ▼                 ▼
             TikTok Business       Meta Graph API      zca-js Web API      Bot Gateways &
             Messaging API         Resumable Upload    & OA v3 API         REST Webhooks
```

---

## 📊 Channel Capability Matrix

| Channel | Outbound Send | Inbound Ingestion | Rich Media & Attachments | Native Reactions | Streaming & Typing | Auth Mode | Current Status |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| 🔵 **Zalo** | ✅ Full API | ✅ Listener / Polling | ✅ Image, Video, File, Sticker, GIF | ✅ Full Native | ✅ Typing & Sentence Stream | Session Cookie / OA Token | **Stable Inbound/Outbound** |
| ✈️ **Telegram** | ✅ Bot API | ✅ Polling & Webhook | ✅ Photo, Video, File, Sticker, GIF | ✅ Full Native | ✅ In-place Edit Stream | Bot Token | **Stable Inbound/Outbound** |
| 🎵 **TikTok** | ✅ Business API v1.3 | ✅ HMAC Webhook (`message.receive`) | ✅ Images (via `media_id`) | ❌ N/A | ❌ N/A | OAuth2 Access-Token | **Stable Webhook Inbound/Outbound** |
| 💬 **Messenger**| ✅ Graph API v19.0 | ⚡ Webhook Normalizer | ✅ Image, Video (100MB), File, Sticker | ⏳ Planned | ⚡ Typing Indicator | Page Token & Secret | **Stable Outbound + Normalizer** |
| 🎮 **Discord** | ✅ Bot REST API | ⚡ Webhook Normalizer | ✅ Embeds & Attachments | ✅ Full Native | ⚡ In-place Edit Stream | Bot Token | **Stable Outbound + Normalizer** |
| 💼 **Slack** | ✅ Web API / Chat | ⚡ Events Normalizer | ✅ Files & Blocks | ⏳ Planned | ⚡ Typing Indicator | Bot Token | **Stable Outbound + Normalizer** |

---

## ⚡ Đo Lường Hiệu Năng Thực Tế (Benchmarks)

Được đo lường thực tế trên môi trường Bun v1.4.2 / Node v26.3 runtime (x64 Windows 11). Chạy lệnh `bun run bench` để kiểm chứng trực tiếp:

| Thành Phần | Chỉ Số Đo | Kết Quả Thực Tế | Độ Trễ (Latency) |
| :--- | :--- | :---: | :---: |
| **Idempotency Cache** | Lọc trùng lặp sliding-window | **3.500.000+ ops/giây** | ~280 ns / op |
| **Token Bucket Limiter** | Điều tiết tốc độ gửi tin (Egress throttle) | **2.300.000+ ops/giây** | ~430 ns / op |
| **Ingress Pipeline** | Dedup + Bọc MessageContext + Hàng đợi | **640.000+ tin/giây** | ~1.5 µs / tin |
| **SmartStreamer** | Gom cụm câu văn theo token LLM & typing pulse | **Dưới 2ms** | Sub-millisecond |

```bash
# Lệnh chạy suite benchmark
bun run bench
```

---

## 🔬 Cơ Chế Hoạt Động

### 1. Unified Message Protocol (`UnifiedMessage`)
Every incoming payload—regardless of originating protocol (TikTok Webhook, Telegram Polling, Discord WebSocket, Meta Graph API)—is normalized into an immutable, cross-platform standard representation:

```typescript
export interface UnifiedMessage {
  id: string;               // Normalized message identifier
  channel: ChannelType;     // "tiktok" | "zalo" | "telegram" | "discord" | "slack" | "messenger"
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
- Calling `await ctx.reply("Hello")` automatically resolves the originating channel, routes through the target adapter, manages rate-limiting queues, and emits typing indicators.
- Calling `await ctx.sendMedia({ type: "image", source: "./image.png" })` validates local paths against directory traversal, detects MIME headers, and handles chunked file uploading seamlessly.

---

## 🌟 Tính Năng Chính

- **Unified Multi-Platform API**: Write your agent's communication logic once; execute identically across TikTok, Zalo, Telegram, Discord, Messenger, and Slack.
- **AI-Native MCP Daemon**: Built-in Model Context Protocol (MCP) stdio server exposing **10 high-level tools** for Claude Desktop, Hermes Agent, and Codex.
- **SmartStreamer Token Batcher**: Converts LLM token streams into real-time in-place message edits or sentence-boundary chunks with typing indicators without hitting rate limits.
- **Backpressure & Bounded Ingress Queue**: Built-in 2,000 items buffer with async generator drain waiters to avoid memory leaks during message spikes.
- **Large Video Resumable Upload**: Native support for video assets up to **100MB** on Meta Messenger using the Graph API Attachment Upload protocol.
- **Native Sticker & Animated GIF Engine**: Send stickers and GIFs natively across all supported platforms.
- **Zero Heavy Core**: Core engine depends exclusively on Node.js / Bun standard library (`node:events`, native `fetch`, `node:crypto`).

---

## 🚀 Bắt Đầu Nhanh (Zero-Config)

Chỉ cần 3 bước đơn giản. ChannelHub sẽ tự động tạo sẵn toàn bộ source code cho bạn!

### Bước 1: Khởi tạo dự án
Mở terminal, tạo một thư mục trống và chạy lệnh init:
```bash
mkdir my-bot && cd my-bot
npx @theowlops/channelhub init
```
*(Lệnh này sẽ tự động tạo ra file `.env`, `bot.ts` và `package.json` cho bạn).*

### Bước 2: Điền Token của bạn
Mở file `.env` vừa được tạo ra và dán các token của bạn vào (ví dụ: lấy token từ [@BotFather](https://t.me/BotFather) cho Telegram).

### Bước 3: Chạy Bot & Tự bắt bệnh
Cài đặt thư viện và chạy bot:
```bash
bun install  # hoặc npm install
bun bot.ts   # hoặc npx tsx bot.ts
```

**Gặp lỗi? Bot không chạy?** ChannelHub có sẵn công cụ "bắt bệnh" (doctor) tự động kiểm tra xem token hay môi trường của bạn có sai ở đâu không:
```bash
npx @theowlops/channelhub doctor
```

---

## 🔌 Các Kênh Hỗ Trợ

### 🎵 TikTok for Business & Shop
Supports TikTok Business Messaging API v1.3. Handles inbound webhooks with timing-safe HMAC-SHA256 signature verification and replay prevention.

```typescript
import { TikTokBusinessAdapter } from "@theowlops/channelhub/tiktok";

const tiktok = new TikTokBusinessAdapter({
  appId: "YOUR_TIKTOK_APP_ID",
  clientSecret: "YOUR_TIKTOK_CLIENT_SECRET",
  accessToken: "YOUR_TIKTOK_ACCESS_TOKEN",
  maxWebhookAgeSeconds: 300 // Replay attack protection (default 300s)
});

// In your HTTP server (Fastify, Express, Bun.serve)
app.post("/webhook/tiktok", async (req, res) => {
  const verified = await tiktok.handleWebhook(req.rawBody, req.headers["tiktok-signature"]);
  if (!verified) return res.status(401).send("Unauthorized");
  return res.status(200).send("OK");
});
```

### 🔵 Meta Messenger Adapter
Supports Meta Graph API v19.0 with webhook challenge verification, personal Playwright session recovery, and large file support.

```typescript
import { MessengerChannelAdapter } from "@theowlops/channelhub/messenger";

const messenger = new MessengerChannelAdapter({
  pageAccessToken: "EAA...",
  verifyToken: "custom_webhook_secret",
  pageId: "10029384912"
});
```

### 💬 Zalo Adapter
Supports reverse-engineered Web API (`zca-js`) personal sessions and Official Account (OA) v3 OpenAPI. Includes anti-ban jitter algorithms and automatic quote object generation.

```typescript
import { ZaloChannelAdapter } from "@theowlops/channelhub/zalo";

const zalo = new ZaloChannelAdapter({
  credentialsPath: "./credentials.json", // Auto-captured session
  minDelayMs: 300,
  maxDelayMs: 800
});
```

### ✈️ Telegram Adapter
Lightweight bot integration via Telegram Bot API with native webhook and polling dispatchers.

```typescript
import { TelegramChannelAdapter } from "@theowlops/channelhub/telegram";

const telegram = new TelegramChannelAdapter({
  botToken: "123456:ABC-DEF..."
});
```


### 📱 Twilio Adapter
Omnichannel adapter for WhatsApp, SMS, MMS, and RCS via Twilio API. Supports timing-safe HMAC-SHA1 signature verification for webhooks.

```typescript
import { TwilioChannelAdapter } from "@theowlops/channelhub/twilio";

const twilio = new TwilioChannelAdapter({
  accountSid: "AC...",
  authToken: "YOUR_TWILIO_AUTH_TOKEN",
  phoneNumber: "whatsapp:+14155238886" // Or standard SMS number
});
```

### 🎮 Discord & 💼 Slack Adapters
```typescript
import { DiscordChannelAdapter } from "@theowlops/channelhub/discord";
import { SlackChannelAdapter } from "@theowlops/channelhub/slack";

const discord = new DiscordChannelAdapter({ botToken: "DISCORD_TOKEN" });
const slack = new SlackChannelAdapter({ botToken: "xoxb-...", signingSecret: "..." });
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

LLMs generate responses token by token. Direct API calls per token hit rate limits. `SmartStreamer` batches tokens adaptively:
- **Editable Channels** (Discord, Telegram): Streams first chunk, then edits the message at throttled intervals (`updateIntervalMs: 800`).
- **Non-Editable Channels** (Zalo, Messenger, TikTok): Accumulates tokens and flushes them chunk by chunk on sentence boundaries (`.`, `!`, `?`, `\n`) while emitting typing signals.

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

## 🛠️ CLI Toolkit

ChannelHub được tích hợp sẵn một bộ công cụ CLI (`channelhub`) để giúp bạn khởi tạo dự án, đăng nhập tài khoản tự động và kiểm tra lỗi:

```bash
# 1. Khởi tạo dự án mới (tự động tạo .env + bot.ts)
npx @theowlops/channelhub init

# 2. "Bắt bệnh" biến môi trường & kiểm tra kết nối các tài khoản
npx @theowlops/channelhub doctor

# 3. Quét mã QR trên terminal để đăng nhập tài khoản cá nhân Zalo
npx @theowlops/channelhub login:zalo

# 4. Mở trình duyệt để đăng nhập tài khoản cá nhân Facebook Messenger
npx @theowlops/channelhub login:messenger

# 5. Kiểm tra phiên bản đang cài đặt
npx @theowlops/channelhub version
```

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

## 🛡 Bảo Mật Hệ Thống

- **HMAC-SHA256 & Timing-Safe Verification**: All inbound webhooks (TikTok, Messenger, Slack) verify cryptographic signatures via `crypto.timingSafeEqual` to thwart timing attacks.
- **Anti-Replay Attack Protection**: Webhook deliveries outside the allowed time window (default 300s) are immediately discarded.
- **Zero Token Leak in URLs**: Authentication tokens are strictly transmitted in HTTP headers (`Access-Token`, `Authorization: Bearer`), never in URL query strings.
- **Localhost Loopback Default**: Webhook bridge defaults to `127.0.0.1` rather than `0.0.0.0`.
- **DoS Payload Limits**: Enforces a strict 1MB JSON body size ceiling before socket termination.
- **Path Traversal Guard**: All file uploads run through `path.resolve` and verify `fs.statSync().isFile()`, preventing arbitrary file disclosure.
- **Credential Hygiene**: Auto-masks sensitive tokens in logs (`[REDACTED]`) and enforces `.gitignore` rules against credential files.

---

## 📄 License

ChannelHub is licensed under the [MIT License](LICENSE). Maintained by [TheOwlOps Team](https://github.com/TheOwlOps).
