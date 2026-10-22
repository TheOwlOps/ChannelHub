# Migration Guide — ChannelHub v1.6.x → v2.0.0

V2 is a **repository restructure**. Runtime behavior is unchanged (the full v1 test
suite — 150 tests — passes unmodified in behavior), but **import paths changed**.
This is the complete list of breaking changes.

## 1. Package subpath imports

| v1 | v2 |
|---|---|
| `@theowlops/channelhub` | *(unchanged)* |
| `@theowlops/channelhub/core` | *(unchanged)* |
| `@theowlops/channelhub/zalo` | `@theowlops/channelhub/channels/zalo` |
| `@theowlops/channelhub/telegram` | `@theowlops/channelhub/channels/telegram` |
| `@theowlops/channelhub/discord` | `@theowlops/channelhub/channels/discord` |
| `@theowlops/channelhub/slack` | `@theowlops/channelhub/channels/slack` |
| `@theowlops/channelhub/messenger` | `@theowlops/channelhub/channels/messenger` |
| `@theowlops/channelhub/tiktok` | `@theowlops/channelhub/channels/tiktok` |
| `@theowlops/channelhub/twilio` | `@theowlops/channelhub/channels/twilio` |
| `@theowlops/channelhub/email` | `@theowlops/channelhub/channels/email` |
| `@theowlops/channelhub/github` | `@theowlops/channelhub/channels/github` |
| `@theowlops/channelhub/calendar` | `@theowlops/channelhub/channels/calendar` |
| `@theowlops/channelhub/webhook-generic` | `@theowlops/channelhub/channels/webhook-generic` |
| `@theowlops/channelhub/mcp` | `@theowlops/channelhub/bridges/mcp` |
| `@theowlops/channelhub/webhook` | `@theowlops/channelhub/bridges/webhook` |
| `@theowlops/channelhub/dashboard` | `@theowlops/channelhub/bridges/dashboard` |
| `@theowlops/channelhub/personal` | `@theowlops/channelhub/legacy/zalo` |
| `@theowlops/channelhub/oa` | `@theowlops/channelhub/legacy/zalo` |

**New in v2:** `@theowlops/channelhub/channels/messenger-personal` — the Playwright
personal-Messenger adapter is now its own channel (in v1 it was folded into `messenger`).

**Fixed in v2:** `@theowlops/channelhub/channels/tiktok` and `.../twilio` now actually
ship build artifacts — v1 exported them in `package.json` but `scripts/build.ts` never built them.

## 2. Internal source paths ( monorepo contributors / deep imports )

| v1 | v2 |
|---|---|
| `src/core/types.ts`, `adapter.ts`, `context.ts` | `src/core/contracts/…` |
| `src/core/hub.ts`, `bus.ts`, `handoff.ts`, `stream.ts` | `src/core/engine/…` |
| `src/core/dedup.ts`, `dlq.ts`, `limiter.ts`, `shared-limiter.ts` | `src/core/reliability/…` |
| `src/core/identity.ts`, `group-manager.ts` | `src/core/identity/…` |
| `src/core/video.ts`, `transcoder.ts` | `src/core/media/…` |
| `src/core/stats.ts`, `research.ts` | `src/core/insights/…` |
| `src/channels/messenger/personal.ts` | `src/channels/messenger-personal/adapter.ts` |
| `src/bridges/mcp/index.ts` (920-line monolith) | `src/bridges/mcp/{types,tools,handler}.ts` + barrel |
| `src/bridges/webhook/index.ts` / `dashboard/index.ts` | implementation in `webhook.ts` / `dashboard.ts`, `index.ts` is a barrel |
| `src/personal/`, `src/oa/`, `src/commands/` | `src/legacy/zalo/personal/`, `src/legacy/zalo/oa/`, `src/legacy/commands/` |
| `bin/cli.ts`, `bin/mcp-server.ts` | `apps/cli/main.ts`, `apps/mcp-server/main.ts` |
| `index.ts`, `login.ts` (repo root, legacy bot) | `apps/legacy-zalo-bot/{main,login}.ts` |
| `test/*.test.ts` (flat) | `tests/{core,channels,bridges,security,release}/*.test.ts` |

Discord and Slack adapters now keep their config interfaces in `types.ts`
(`DiscordAdapterConfig`, `SlackAdapterConfig`), matching every other channel.

## 3. Build artifacts & binaries

| v1 | v2 |
|---|---|
| `dist/bin/cli.js` | `dist/apps/cli.js` |
| `dist/bin/mcp-server.js` | `dist/apps/mcp-server.js` |
| `dist/personal/…`, `dist/oa/…` | `dist/legacy/zalo/…` |
| `dist/tiktok`, `dist/twilio` *(missing)* | built and shipped |

npm `bin` entries (`channelhub`, `channelhub-mcp`, `zalohub`) are unchanged for end users.

## 4. What did NOT change

- All exported class/function **names** and signatures (root barrel surface is identical,
  plus `ChannelEventBus` is now also exported from core).
- CLI commands, MCP tool names (34 tools), dashboard routes, webhook contracts.
- Environment variables and the `CONFIG` shape.
- The legacy ZaloHub v1 classes (`ZaloPersonalBot`, `ZaloOABot`, `CommandRouter`) still work.

## 5. Codemod (sed)

```bash
# package imports in your codebase
grep -rl '@theowlops/channelhub/' src | xargs sed -i \
  -e 's|@theowlops/channelhub/\(zalo\|telegram\|discord\|slack\|messenger\|tiktok\|twilio\|email\|github\|calendar\|webhook-generic\)|@theowlops/channelhub/channels/\1|g' \
  -e 's|@theowlops/channelhub/\(mcp\|webhook\|dashboard\)|@theowlops/channelhub/bridges/\1|g' \
  -e 's|@theowlops/channelhub/\(personal\|oa\)|@theowlops/channelhub/legacy/zalo|g'
```
