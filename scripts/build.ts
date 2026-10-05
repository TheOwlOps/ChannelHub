import { $ } from "bun";
import fs from "node:fs";
import path from "node:path";

console.log("🚀 Building ChannelHub SDK...");

// 1. Build main bundles (ESM & CJS)
await $`bun build src/index.ts --outfile ./dist/index.js --format esm --target node --external playwright --external playwright-core --external zca-js`;
await $`bun build src/index.ts --outfile ./dist/index.cjs --format cjs --target node --external playwright --external playwright-core --external zca-js`;

// 2. Build subpath entrypoints (ESM & CJS)
const subpaths = [
  ["src/core/index.ts", "./dist/core/index"],
  ["src/channels/zalo/index.ts", "./dist/channels/zalo/index"],
  ["src/channels/telegram/index.ts", "./dist/channels/telegram/index"],
  ["src/channels/discord/index.ts", "./dist/channels/discord/index"],
  ["src/channels/slack/index.ts", "./dist/channels/slack/index"],
  ["src/channels/messenger/index.ts", "./dist/channels/messenger/index"],
  ["src/bridges/mcp/index.ts", "./dist/bridges/mcp/index"],
  ["src/bridges/webhook/index.ts", "./dist/bridges/webhook/index"],
  ["src/personal/index.ts", "./dist/personal/index"],
  ["src/oa/index.ts", "./dist/oa/index"],
];

for (const [src, dst] of subpaths) {
  await $`bun build ${src} --outfile ${dst}.js --format esm --target node --external playwright --external playwright-core --external zca-js`;
  await $`bun build ${src} --outfile ${dst}.cjs --format cjs --target node --external playwright --external playwright-core --external zca-js`;
}

// 3. Build CLI and MCP entrypoints
// Bundle @modelcontextprotocol/sdk into mcp-server.js so it runs without peer dependencies!
await $`bun build bin/cli.ts --outfile ./dist/bin/cli.js --format esm --target node --external playwright --external playwright-core --external zca-js`;
await $`bun build bin/mcp-server.ts --outfile ./dist/bin/mcp-server.js --format esm --target node --external playwright --external playwright-core --external zca-js`;

// Mark binaries as executable (Unix)
if (process.platform !== "win32") {
  await $`chmod +x ./dist/bin/cli.js`;
  await $`chmod +x ./dist/bin/mcp-server.js`;
}

// 4. Generate TypeScript declarations (.d.ts)
await $`bun x tsc --emitDeclarationOnly --declaration --outDir dist`;

console.log("✅ Build complete! All dist entrypoints ready for npm publish.");
