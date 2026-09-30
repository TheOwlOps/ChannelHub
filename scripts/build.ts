import { $ } from "bun";

console.log("🚀 Building ChannelHub SDK...");

// 1. Build main bundles (ESM & CJS)
await $`bun build src/index.ts --outfile ./dist/index.js --format esm --target node`;
await $`bun build src/index.ts --outfile ./dist/index.cjs --format cjs --target node`;

// 2. Build subpath entrypoints
await $`bun build src/core/index.ts --outfile ./dist/core/index.js --format esm --target node`;
await $`bun build src/channels/zalo/index.ts --outfile ./dist/channels/zalo/index.js --format esm --target node`;
await $`bun build src/channels/telegram/index.ts --outfile ./dist/channels/telegram/index.js --format esm --target node`;
await $`bun build src/channels/discord/index.ts --outfile ./dist/channels/discord/index.js --format esm --target node`;
await $`bun build src/channels/slack/index.ts --outfile ./dist/channels/slack/index.js --format esm --target node`;
await $`bun build src/channels/messenger/index.ts --outfile ./dist/channels/messenger/index.js --format esm --target node`;
await $`bun build src/bridges/mcp/index.ts --outfile ./dist/bridges/mcp/index.js --format esm --target node`;
await $`bun build src/bridges/webhook/index.ts --outfile ./dist/bridges/webhook/index.js --format esm --target node`;
await $`bun build src/personal/index.ts --outfile ./dist/personal/index.js --format esm --target node`;
await $`bun build src/oa/index.ts --outfile ./dist/oa/index.js --format esm --target node`;

// 3. Generate TypeScript declarations (.d.ts)
await $`bun x tsc --emitDeclarationOnly --declaration --outDir dist`;

console.log("✅ Build complete! All dist entrypoints ready for npm publish.");
