# ChannelHub Architecture Specification

- **Document Version**: 1.0.0
- **Date**: 2026-09-26
- **Package**: `@theowlops/channelhub` (migrated from `@theowlops/zalohub`)
- **Status**: Draft - Pending Implementation

---

## 1. Executive Summary

`ChannelHub` is an open-source, modular, multi-channel messaging abstraction layer and SDK for TypeScript/JavaScript runtimes (Bun, Node.js >= 18, Deno). It provides a unified, normalized interface (`IChannelAdapter`) across chat platforms including **Zalo** (Personal & Official Account), **Telegram**, **Discord**, and **Slack**, allowing AI agents (Hermes Agent, OpenClaw, LangChain, Claude Desktop via MCP, ElizaOS) and standalone automations to connect, listen, and dispatch messages seamlessly without platform-specific coupling.

---

## 2. Directory Structure

```text
D:/zalohub/
├── bin/
│   └── cli.ts                     # CLI launcher (channelhub login, channelhub start)
├── docs/
│   └── specs/
│       └── 2026-09-26-channelhub-architecture.md
├── scripts/
│   └── build.ts                   # Multi-entry build script (ESM, CJS, d.ts)
├── src/
│   ├── index.ts                   # Public root entrypoint
│   ├── core/                      # Platform-agnostic core abstractions
│   │   ├── index.ts
│   │   ├── types.ts               # UnifiedMessage, ChannelEvent, SendOptions
│   │   ├── adapter.ts             # IChannelAdapter interface & BaseChannel class
│   │   ├── bus.ts                 # ChannelEventBus (typed event emitter)
│   │   ├── registry.ts            # ChannelRegistry (lifecycle & routing)
│   │   └── context.ts             # MessageContext helper (ctx.reply, ctx.react)
│   ├── channels/                  # Platform adapters
│   │   ├── zalo/                  # Zalo Personal (zca-js) & OA
│   │   │   ├── index.ts
│   │   │   ├── adapter.ts         # ZaloChannel implements IChannelAdapter
│   │   │   ├── personal/          # Ported from current src/personal/
│   │   │   └── oa/                # Ported from current src/oa/
│   │   ├── telegram/              # Telegram Adapter (Grammy-based)
│   │   │   ├── index.ts
│   │   │   └── adapter.ts
│   │   ├── discord/               # Discord Adapter (@discordjs light)
│   │   │   ├── index.ts
│   │   │   └── adapter.ts
│   │   └── slack/                 # Slack Adapter (@slack/web-api + socket-mode)
│   │       ├── index.ts
│   │       └── adapter.ts
│   └── bridges/                   # External protocol bridges
│       ├── mcp/                   # Universal Model Context Protocol Server
│       │   └── index.ts
│       ├── webhook/               # HTTP / SSE webhook server
│       │   └── index.ts
│       ├── hermes/                # Hermes Agent native gateway integration
│       │   └── index.ts
│       └── openclaw/              # OpenClaw toolset definitions
│           └── index.ts
├── package.json
├── tsconfig.json
└── README.md
```

---

## 3. Core Contract & Interfaces (`src/core/`)

### 3.1 Unified Message Model

Every incoming message from any supported channel is normalized into `UnifiedMessage`:

```ts
export type ChannelType = 'zalo' | 'telegram' | 'discord' | 'slack' | string;
export type ChatType = 'dm' | 'group' | 'channel';
export type MediaType = 'image' | 'video' | 'audio' | 'file';

export interface MediaAttachment {
  type: MediaType;
  url: string;
  filename?: string;
  mimeType?: string;
  size?: number;
}

export interface UnifiedMessage {
  id: string;                      // Platform message ID
  channel: ChannelType;            // Origin channel identifier
  sender: {
    id: string;
    name?: string;
    username?: string;
    avatarUrl?: string;
    isBot?: boolean;
  };
  chat: {
    id: string;                    // Unified chat identifier
    type: ChatType;
    title?: string;
  };
  content: {
    text: string;
    attachments?: MediaAttachment[];
    replyToId?: string;
  };
  raw: unknown;                    // Raw unmodified event payload
  timestamp: number;               // Epoch in milliseconds
}
```

### 3.2 Channel Adapter Interface

All channel implementations must conform to `IChannelAdapter`:

```ts
export interface SendOptions {
  replyToId?: string;
  quote?: boolean;
  metadata?: Record<string, unknown>;
}

export interface MediaPayload {
  type: MediaType;
  source: string | Buffer | Uint8Array;
  filename?: string;
  caption?: string;
  mimeType?: string;
}

export interface SentMessageResult {
  messageId: string;
  chatId: string;
  timestamp: number;
}

export interface IChannelAdapter {
  readonly name: ChannelType;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;

  // Actions
  sendText(chatId: string, text: string, options?: SendOptions): Promise<SentMessageResult>;
  sendMedia(chatId: string, media: MediaPayload, options?: SendOptions): Promise<SentMessageResult>;
  addReaction?(chatId: string, messageId: string, emoji: string): Promise<void>;

  // Event handlers
  on(event: 'message', handler: (msg: UnifiedMessage) => Promise<void> | void): this;
  on(event: 'error', handler: (err: Error) => void): this;
  on(event: 'status', handler: (status: 'connected' | 'disconnected' | 'reconnecting') => void): this;
}
```

### 3.3 Message Context & Event Loop

```ts
export interface MessageContext {
  message: UnifiedMessage;
  channel: IChannelAdapter;
  reply: (text: string, options?: SendOptions) => Promise<SentMessageResult>;
  replyMedia: (media: MediaPayload) => Promise<SentMessageResult>;
  react: (emoji: string) => Promise<void>;
}
```

---

## 4. Channel Adapters Detail

### 4.1 Zalo Adapter (`src/channels/zalo/`)
- Encapsulates existing `zca-js` personal web protocol and official OA REST API.
- Implements QR code terminal login and cookie persistence.
- Auto-maps unicode emojis to Zalo internal reaction codes.

### 4.2 Telegram Adapter (`src/channels/telegram/`)
- Powered by `grammy` (lightweight, zero-bloat, native Bun/Node support).
- Supports bot token polling and webhook mode.
- Maps markdown formatting cleanly to/from standard text.

### 4.3 Discord Adapter (`src/channels/discord/`)
- Built on `@discordjs/core` and `@discordjs/ws` for minimal footprint (avoiding heavy desktop/voice modules of monolithic `discord.js`).
- Handles gateway heartbeats, reconnects, and rate limits.

### 4.4 Slack Adapter (`src/channels/slack/`)
- Built on `@slack/web-api` and `@slack/socket-mode` for firewall-friendly event ingestion without requiring a public IP.

---

## 5. External Bridges (`src/bridges/`)

1. **Universal MCP (`src/bridges/mcp/`)**:
   - Exposes tools: `channelhub_send_message`, `channelhub_list_channels`, `channelhub_add_reaction`.
   - Compatible with Claude Desktop, Cursor, Codex, OpenClaw, Hermes.
2. **HTTP Webhook / SSE (`src/bridges/webhook/`)**:
   - Ingests and dispatches messages over REST/JSON and Server-Sent Events for n8n, Dify, Flowise, and custom Python scripts.
3. **Hermes Native Bridge (`src/bridges/hermes/`)**:
   - Direct drop-in replacing existing single-purpose Zalo gateway bridge with multi-platform streaming.

---

## 6. Build, Packaging & Dependencies

- **Package Name**: `@theowlops/channelhub`
- **Zero-Heavy Core**: Core package imports only `node:events` and standard fetch.
- **Subpath Exports**:
  ```json
  "exports": {
    ".": "./dist/index.js",
    "./zalo": "./dist/channels/zalo/index.js",
    "./telegram": "./dist/channels/telegram/index.js",
    "./discord": "./dist/channels/discord/index.js",
    "./slack": "./dist/channels/slack/index.js",
    "./mcp": "./dist/bridges/mcp/index.js"
  }
  ```
- **Dual Build**: CommonJS and ESM outputs with complete TypeScript declaration maps (`.d.ts`).

---

## 7. Migration & Rollout Plan

1. **Phase 1**: Rename package and establish `src/core/` contracts and interfaces.
2. **Phase 2**: Move existing Zalo code into `src/channels/zalo/` adhering to `IChannelAdapter`.
3. **Phase 3**: Implement `src/channels/telegram/`.
4. **Phase 4**: Implement `src/channels/discord/` and `src/channels/slack/`.
5. **Phase 5**: Build MCP & HTTP Webhook bridges in `src/bridges/`.
6. **Phase 6**: Update build scripts, documentation, and verify test suite.
