# ChannelHub Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform `@theowlops/zalohub` into `@theowlops/channelhub`, a modular multi-channel messaging SDK and abstraction layer supporting Zalo, Telegram, Discord, and Slack with extensible AI bridges.

**Architecture:** A zero-heavy-dependency core layer (`src/core/`) defines `IChannelAdapter`, `UnifiedMessage`, and an event bus. Specific channel adapters live under `src/channels/`, and external connectors (MCP, Webhook, Hermes) live in `src/bridges/`.

**Tech Stack:** TypeScript 5.7, Bun runtime, Node.js >=18 compat, grammy (Telegram), @discordjs/core & @discordjs/ws (Discord), @slack/web-api & @slack/socket-mode (Slack), zca-js (Zalo).

**Spec:** `docs/specs/2026-09-26-channelhub-architecture.md`

## Global Constraints
- Primary package name: `@theowlops/channelhub`
- Runtime support: Bun, Node.js >= 18, Deno
- Zero-heavy core: `src/core/` relies solely on standard library (`node:events`, native `fetch`)
- Export format: dual ESM + CommonJS with complete `.d.ts` declaration maps
- Working directory: `D:/zalohub` directly (no git worktrees)

---

### Task 1: Package Scaffolding & Core Types

**Files:**
- Modify: `package.json`
- Create: `src/core/types.ts`
- Create: `src/core/adapter.ts`
- Create: `src/core/bus.ts`
- Create: `src/core/index.ts`
- Test: `test/core-types.test.ts`

**Interfaces:**
- Produces: `UnifiedMessage`, `IChannelAdapter`, `BaseChannel`, `ChannelEventBus`, `SendOptions`, `MediaPayload`, `SentMessageResult`

- [ ] **Step 1: Write test for Core Types & EventBus**
- [ ] **Step 2: Run test to verify it fails**
- [ ] **Step 3: Implement package.json rename and src/core modules**
- [ ] **Step 4: Run test to verify it passes**
- [ ] **Step 5: Commit**

---

### Task 2: ChannelHub Engine & MessageContext

**Files:**
- Create: `src/core/context.ts`
- Create: `src/core/hub.ts`
- Modify: `src/core/index.ts`
- Test: `test/hub-engine.test.ts`

**Interfaces:**
- Consumes: `IChannelAdapter`, `UnifiedMessage`, `ChannelEventBus`
- Produces: `ChannelHub`, `MessageContext`

- [ ] **Step 1: Write test for ChannelHub registration and routing**
- [ ] **Step 2: Run test to verify it fails**
- [ ] **Step 3: Implement ChannelHub and MessageContext**
- [ ] **Step 4: Run test to verify it passes**
- [ ] **Step 5: Commit**

---

### Task 3: Migrate Zalo Adapter to `src/channels/zalo/`

**Files:**
- Move & Modify: `src/personal/` -> `src/channels/zalo/personal/`
- Move & Modify: `src/oa/` -> `src/channels/zalo/oa/`
- Create: `src/channels/zalo/adapter.ts`
- Create: `src/channels/zalo/index.ts`
- Test: `test/zalo-adapter.test.ts`

**Interfaces:**
- Consumes: `IChannelAdapter`, `BaseChannel`, `UnifiedMessage`
- Produces: `ZaloChannelAdapter`

- [ ] **Step 1: Write test for ZaloChannelAdapter normalization**
- [ ] **Step 2: Run test to verify it fails**
- [ ] **Step 3: Reorganize Zalo files and implement ZaloChannelAdapter**
- [ ] **Step 4: Run test to verify it passes**
- [ ] **Step 5: Commit**

---

### Task 4: Telegram Channel Adapter (`src/channels/telegram/`)

**Files:**
- Create: `src/channels/telegram/types.ts`
- Create: `src/channels/telegram/adapter.ts`
- Create: `src/channels/telegram/index.ts`
- Test: `test/telegram-adapter.test.ts`

**Interfaces:**
- Consumes: `IChannelAdapter`, `BaseChannel`, `UnifiedMessage`
- Produces: `TelegramChannelAdapter`

- [ ] **Step 1: Write test for Telegram message normalization**
- [ ] **Step 2: Run test to verify it fails**
- [ ] **Step 3: Implement TelegramChannelAdapter**
- [ ] **Step 4: Run test to verify it passes**
- [ ] **Step 5: Commit**

---

### Task 5: Root SDK Entrypoint & Multi-Entry Build Verification

**Files:**
- Modify: `src/index.ts`
- Modify: `scripts/build.ts`
- Modify: `package.json` exports map
- Test: `test/build-artifacts.test.ts`

**Interfaces:**
- Consumes: All channels and core exports
- Produces: Full dual ESM/CJS build artifacts in `dist/`

- [ ] **Step 1: Write build verification test**
- [ ] **Step 2: Run build script and test**
- [ ] **Step 3: Fix export mapping and build bundle**
- [ ] **Step 4: Run verification test to verify clean pass**
- [ ] **Step 5: Commit**
