# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.4.3] - 2026-10-01

### Added
- **Core Contract**: Added `AbortSignal` to `connect`, `disconnect`, `sendText`, `sendMedia` in `IChannelAdapter`.
- **Core Contract**: Upgraded `EventEmitter` to async queue with backpressure using `AsyncIterable` in `hub.messages()`.
- **Core Contract**: Handlers via `hub.onMessage()` now safely await and process sequentially.
- **Core Contract**: Identifiers are now `(provider, accountId)`, supporting multiple bots of the same type.
- **Inbound Ingestion**: Slack Socket Mode WebSocket ingestion.
- **Inbound Ingestion**: Discord Gateway WebSocket ingestion.
- **Inbound Ingestion**: Messenger built-in webhook HTTP ingestion server.
- **CI**: Added GitHub Actions test matrix across Node 18, 20, 22, and Bun.

### Changed
- **Dependencies**: Removed `crypto-js` and `zca-js` from production dependencies. `zca-js` and `@modelcontextprotocol/sdk` are now optional peer dependencies to drastically reduce install size.

---

## [1.4.2] - 2026-10-01

### Fixed
- **Repository Artifacts**: Tracked `dist/bin/cli.js`, `dist/bin/mcp-server.js`, and `test/clean-install.test.ts` into git for full npm/test reproducibility.
- **Cleanup**: Removed stale local `.tgz` archive from repo.

---

## [1.4.1] - 2026-10-01

### Added
- **NPM Release Smoke Tests**: Added `test/clean-install.test.ts` executing compiled binaries directly with Node.js runtime.
- **Channel Capability Matrix**: Added comprehensive compatibility tables across `README.md`, `README.vi.md`, and `README.zh.md` classifying channel implementation status (Inbound/Outbound, Outbound-only, Planned).
- **Diagnostics CLI Command**: Added `channelhub doctor` to inspect runtime Node version, environment variables, and authentication credential files.

### Fixed
- **CLI & MCP Binaries for Node.js (P0)**:
  - Replaced TypeScript targets in `package.json` `bin` fields with pre-compiled JavaScript artifacts (`./dist/bin/cli.js`, `./dist/bin/mcp-server.js`).
  - Changed shebangs from `#!/usr/bin/env bun` to `#!/usr/bin/env node` for Node.js ≥ 18 compatibility.
  - Bundled CLI dependencies cleanly with `--external` flags for `playwright`, `zca-js`, and `@modelcontextprotocol/sdk`.
- **Messenger Security & Token Leakage**:
  - Removed `?access_token=` query parameters from all Meta Graph API requests.
  - Shifted all Graph API requests to `Authorization: Bearer <token>` HTTP headers.
- **Webhook Bridge Hardening**:
  - Removed insecure `?api_key=` query parameter authentication.
  - Enforced constant-time token comparison via `timingSafeEqual()` for Bearer tokens.
  - Automatically stripped `raw` vendor payload from SSE event stream broadcasts.
  - Enforced max limit of 50 concurrent SSE clients with HTTP 429 backoff.
- **MCP Version Alignment**: Fixed hardcoded version in MCP daemon from `1.2.0` to match package version.
- **CLI Branding**: Updated all CLI logs and messages from legacy "ZaloHub" to "ChannelHub".

---

## [1.4.0] - 2026-10-01

### Added
- **Native Stickers & Animated GIFs**:
  - Added `sticker` and `animation` to core `MediaType`.
  - Implemented `sendSticker` and `sendGif` across Messenger, Telegram, Zalo, and Discord.
  - Added dedicated MCP tools: `channelhub_send_sticker` and `channelhub_send_gif`.
- **Tri-lingual Documentation**: Added full documentation in English (`README.md`), Vietnamese (`README.vi.md`), and Chinese (`README.zh.md`).

---

## [1.3.1] - 2026-10-01

### Fixed
- **Automated GitHub Release Permissions**: Added `permissions: contents: write` to GitHub Actions workflow for automatic Release creation.

---

## [1.3.0] - 2026-10-01

### Added
- **MCP Tools Expansion**: Expanded stdio MCP toolset from 3 to 8 tools (`channelhub_send_media`, `channelhub_send_typing`, `channelhub_edit_message`, `channelhub_broadcast`, `channelhub_get_status`).
- **Large Video Resumable Upload**: Support for uploads up to 100MB on Meta Messenger via Attachment Upload API.
- **Exotic Webhook Ingestion**: Normalized Location pins, shared Reels, Posts, and Facebook Stickers into standard `UnifiedMessage`.

---

## [1.2.0] - 2026-10-01

### Added
- **Meta Messenger Adapter**: Native Facebook Messenger Graph API v19.0 adapter with webhook challenge verification.
- **Automated Headless Login**: Playwright script `bun run login:messenger` to extract cookies for personal Facebook accounts.
- **Initial MCP Bridge**: Stdio JSON-RPC server with core messaging tools.

---

## [1.1.0] - 2026-09-28

### Added
- **SmartStreamer**: Token streaming engine with in-place editing for Telegram/Discord and sentence batching with typing indicators for Zalo.

---

## [1.0.0] - 2026-09-26

### Added
- Initial public release of ChannelHub SDK unifying Zalo, Telegram, Discord, and Slack.
