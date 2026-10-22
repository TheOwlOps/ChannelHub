# ChannelHub v2 — Cấu trúc thư mục / Repository Structure

V2 reorganizes the repository by **concern**, without changing runtime behavior.
Every folder has one job; every channel follows the same template.

```
ChannelHub/
├── src/                        # The library (published as @theowlops/channelhub)
│   ├── index.ts                # Root barrel — the public API surface
│   ├── core/                   # Platform-agnostic engine, grouped by concern:
│   │   ├── contracts/          #   types.ts · adapter.ts (BaseChannel) · context.ts
│   │   ├── engine/             #   hub.ts · bus.ts · handoff.ts · stream.ts (SmartStreamer)
│   │   ├── reliability/        #   dedup.ts · dlq.ts · limiter.ts · shared-limiter.ts
│   │   ├── identity/           #   identity.ts · group-manager.ts
│   │   ├── media/              #   video.ts · transcoder.ts
│   │   ├── insights/           #   stats.ts · research.ts
│   │   └── index.ts            #   Core barrel
│   ├── channels/               # One folder per channel, ALWAYS the same template:
│   │   ├── <channel>/          #   adapter.ts (logic) · types.ts (config) · index.ts (barrel)
│   │   │                       #   zalo, telegram, discord, slack, messenger,
│   │   │                       #   messenger-personal, tiktok, twilio, email,
│   │   │                       #   github, calendar, webhook-generic
│   │   └── index.ts            # All-channels barrel
│   ├── bridges/                # Protocol / UI bridges
│   │   ├── mcp/                #   types.ts · tools.ts (catalogue) · handler.ts (dispatch) · index.ts
│   │   ├── webhook/            #   webhook.ts · index.ts
│   │   └── dashboard/          #   dashboard.ts · html.ts · index.ts
│   ├── legacy/                 # Frozen ZaloHub v1 compatibility surface (no new features)
│   │   ├── zalo/               #   personal/ (client + init) · oa/ (client + init) · index.ts
│   │   └── commands/           #   router.ts · types.ts · modules/
│   └── config/                 # env.ts — environment configuration (CONFIG)
│
├── apps/                       # Runnable applications (not part of the library API)
│   ├── cli/main.ts             # channelhub CLI          → dist/apps/cli.js
│   ├── mcp-server/main.ts      # channelhub-mcp server   → dist/apps/mcp-server.js
│   └── legacy-zalo-bot/        # Standalone ZaloHub v1 bot demo (main.ts + login.ts)
│
├── tests/                      # Mirrors src/ by domain
│   ├── core/  channels/  bridges/  security/  release/
│
├── scripts/                    # build.ts · benchmark.ts · generate-badge.ts · login_*.ts
├── docs/                       # STRUCTURE.md (this file) · MIGRATION-v1-to-v2.md · specs/ · plans/
└── dist/                       # Build output (committed: CI tests run before build)
```

## Rules for contributors

1. **New channel?** Copy any `src/channels/<channel>/` folder — `adapter.ts` extends
   `BaseChannel` from `core/contracts/adapter`, its config goes in `types.ts`,
   and `index.ts` is exactly two `export *` lines. Register it in
   `src/channels/index.ts`, `src/index.ts`, `scripts/build.ts` and `package.json` exports.
2. **New core primitive?** Place it by concern (contracts / engine / reliability /
   identity / media / insights) and export it from `src/core/index.ts` under its group.
3. **Bridges never import channels**; channels never import bridges. Both depend on `core/` only.
4. **`legacy/` is frozen.** Bug-fix only; new capabilities belong in `channels/` or `core/`.
5. **Tests mirror `src/`** — a test for `src/channels/telegram/*` lives in `tests/channels/`.
