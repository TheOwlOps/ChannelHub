<div align="center">
  <img src="./assets/banner.svg" alt="ChannelHub Banner" width="100%" />
  <img src="./assets/stats.svg" alt="ChannelHub Realtime Stats" width="100%" style="margin-top: -4px;" />
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
- [Channel Capability Matrix](#-channel-capability-matrix)
- [How It Works Deep Dive](#-how-it-works-deep-dive)
- [Key Features](#-key-features)
- [Installation](#-installation)
- [Quick Start (Zero-Config)](#-quick-start-zero-config)
- [Channel Adapters](#-channel-adapters)
  - [🎵 TikTok for Business & Shop](#-tiktok-for-business-adapter)
  - [💬 Meta Messenger](#-meta-messenger-adapter)
  - [🔵 Zalo (Personal & OA)](#-zalo-adapter)
  - [✈️ Telegram](#-telegram-adapter)
  - [🎮 Discord](#-discord-adapter)
  - [💼 Slack](#-slack-adapter)
  - [📱 Twilio (WhatsApp & SMS)](#-twilio-adapter)
- [Advanced Engine Features (v1.6.0)](#-advanced-engine-features-v160)
- [Rich Media, Stickers & GIFs](#-rich-media-stickers--gifs)
- [SmartStreamer for LLMs](#-smartstreamer-for-llms)
- [CLI Toolkit](#-cli-toolkit)
- [Model Context Protocol (MCP) Server](#-model-context-protocol-mcp-server)
- [Security Hardening](#-security-hardening)
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

## ⚡ Performance Benchmarks

Measured on standard development hardware (Bun v1.4.2 / Node v26.3 runtime, x64 Windows 11). Run `bun run bench` to reproduce locally:

| Subsystem | Metric | Measured Result | Latency / Overhead |
| :--- | :--- | :---: | :---: |
| **Idempotency Cache** | Sliding-window deduplication | **3,500,000+ ops/sec** | ~280 ns / op |
| **Token Bucket Limiter** | Egress rate throttle & burst control | **2,300,000+ ops/sec** | ~430 ns / op |
| **Ingress Pipeline** | Dedup + Context Wrap + Backpressure Queue | **640,000+ msgs/sec** | ~1.5 µs / message |
| **SmartStreamer** | LLM sentence boundary batching & typing pulse | **Instant (< 2ms)** | Sub-millisecond |

```bash
# Execute the benchmark suite
bun run bench
```

---

## 🔬 How It Works Deep Dive

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

## 🌟 Key Features

- **Unified Multi-Platform API**: Write your agent's communication logic once; execute identically across TikTok, Zalo, Telegram, Discord, Messenger, and Slack.
- **AI-Native MCP Daemon**: Built-in Model Context Protocol (MCP) stdio server exposing **10 high-level tools** for Claude Desktop, Hermes Agent, and Codex.
- **SmartStreamer Token Batcher**: Converts LLM token streams into real-time in-place message edits or sentence-boundary chunks with typing indicators without hitting rate limits.
- **Backpressure & Bounded Ingress Queue**: Built-in 2,000 items buffer with async generator drain waiters to avoid memory leaks during message spikes.
- **Large Video Resumable Upload**: Native support for video assets up to **100MB** on Meta Messenger using the Graph API Attachment Upload protocol.
- **Native Sticker & Animated GIF Engine**: Send stickers and GIFs natively across all supported platforms.
- **Zero Heavy Core**: Core engine depends exclusively on Node.js / Bun standard library (`node:events`, native `fetch`, `node:crypto`).

---


## 📦 Installation

If you are adding ChannelHub to an existing Node.js or Bun project, install it via your preferred package manager:

```bash
# Bun (Recommended)
bun add @theowlops/channelhub

# NPM
npm install @theowlops/channelhub

# PNPM
pnpm add @theowlops/channelhub

# Yarn
yarn add @theowlops/channelhub
```

---

## 🚀 Quick Start (Zero-Config)

Get started in 3 simple steps. ChannelHub handles all the boilerplate for you!

### Step 1: Scaffold your project
Run the interactive init command in an empty folder:
```bash
mkdir my-bot && cd my-bot
npx @theowlops/channelhub init
```
*(This automatically creates `.env`, `bot.ts`, and `package.json` for you).*

### Step 2: Add your tokens
Open the newly created `.env` file and paste your bot tokens (e.g., from [@BotFather](https://t.me/BotFather) for Telegram).

### Step 3: Run your Bot & Diagnose
Install dependencies and start the bot:
```bash
bun install  # or npm install
bun bot.ts   # or npx tsx bot.ts
```

**Not working?** ChannelHub comes with a built-in doctor to check your environment and tokens. Run:
```bash
npx @theowlops/channelhub doctor
```

---

## 🔌 Channel Adapters

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

### 💬 Meta Messenger Adapter
ChannelHub provides two native Messenger integrations:

**1. Meta Graph API (Official Page Bot)**
Supports webhook challenge verification, permissions discovery, and large file support.
```typescript
import { MessengerChannelAdapter } from "@theowlops/channelhub/messenger";

const messenger = new MessengerChannelAdapter({
  pageAccessToken: "EAA...",
  verifyToken: "custom_webhook_secret",
  appSecret: "facebook_app_secret",
  autoSubscribePage: true, // Automatically subscribe to webhook events
});
```

**2. Personal Profile Adapter (Playwright Stealth)**
Automates your personal Facebook account. Uses a persistent browser context to emulate human behavior and bypass Meta security checkpoints.
```typescript
import { MessengerPersonalAdapter } from "@theowlops/channelhub/messenger";

// Run 'channelhub login:messenger' first to generate cookies!
const personal = new MessengerPersonalAdapter({
  headless: true,
  maxMessagesPerMinute: 15,
  humanTypingDelayMs: 40,
});
```

### 🔵 Zalo Adapter
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


---

## ⚡ Advanced Engine Features (v1.6.0)

### 1. Onion Middleware Pipeline (`hub.use`)
Express / Koa-style middleware pipeline allows intercepting, modifying, or short-circuiting message dispatching:

```typescript
// Rate limiting or authentication middleware
hub.use(async (ctx, next) => {
  if (ctx.message.content.text.includes("DROP_ME")) {
    return; // Short-circuit, halts pipeline
  }
  await next(); // Proceed to downstream handlers
});
```

### 2. Human Handoff & Takeover (`ctx.handoff`)
Temporarily mute automated bot responses in a specific chat when human customer support steps in:

```typescript
hub.on("message", async (ctx) => {
  if (ctx.message.content.text === "talk to human") {
    // Pause bot in this chat for 30 minutes
    ctx.handoff(30 * 60 * 1000, "Human agent takeover");
    await ctx.reply("Connecting you to a human agent. Bot muted for 30 minutes.");
    return;
  }
});

// Resume bot manually:
// ctx.resume() or hub.handoff.resume(channel, chatId);
```

### 3. Lock-free Multi-Core Rate Limiter (`SharedTokenBucketLimiter`)
Synchronize rate limits across multiple Node/Bun Worker Threads using `SharedArrayBuffer` and CPU `Atomics`:
- **Throughput:** ~3,700,000 ops/second (nano-second memory latency).
- **Zero Redis Dependency:** Pure in-memory zero-cost synchronization on a single machine.

```typescript
import { SharedTokenBucketLimiter } from "@theowlops/channelhub/core";

const limiter = new SharedTokenBucketLimiter(100, 20); // 100 capacity, 20 refills/sec
if (limiter.tryAcquire(1)) {
  // Dispatched safely within provider quota
}
```

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

ChannelHub includes a built-in CLI (`channelhub`) to streamline project scaffolding, account authentication, and environment troubleshooting:

| Command | Purpose | When & How to Use |
| :--- | :--- | :--- |
| `npx @theowlops/channelhub init` | **Project Scaffolder** | Run in an empty folder to auto-generate `.env`, `bot.ts`, and `package.json`. |
| `npx @theowlops/channelhub doctor` | **Environment Diagnostics** | Check missing tokens, inspect Node/Bun runtimes, and verify credential files. |
| `npx @theowlops/channelhub login:zalo` | **Zalo Personal Login** | Generates a terminal QR code. Scan with your phone to extract `credentials.json`. |
| `npx @theowlops/channelhub login:messenger` | **Messenger Personal Login** | Opens a browser window. Log into Facebook to auto-save `messenger.credentials.json`. |
| `npx @theowlops/channelhub start` | **Runtime Runner** | Starts configured ChannelHub services directly from terminal. |
| `npx @theowlops/channelhub version` | **Version Inspector** | Prints current installed version of `@theowlops/channelhub`. |
| `npx @theowlops/channelhub help` | **Command Reference** | Displays list of available CLI commands and usage flags. |

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
11. `channelhub_send_email`: Send emails via Resend or SendGrid with full support for HTML, Subject, CC, and BCC.
12. `channelhub_github_comment`: Post review comments on GitHub issues and pull requests.
13. `channelhub_github_create_issue`: Open new issues on any GitHub repository with tags and description.
14. `channelhub_calendar_quick_add`: Schedule events directly into Google Calendar using natural language.

---

## 🛡 Security Hardening

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
