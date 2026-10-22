import { $ } from "bun";

console.log("🚀 Building ChannelHub SDK v2...");

const EXTERNALS = [
  "--external", "playwright",
  "--external", "playwright-core",
  "--external", "zca-js",
  "--external", "sharp",
];

// 1. Build main bundles (ESM & CJS)
await $`bun build src/index.ts --outfile ./dist/index.js --format esm --target node ${EXTERNALS}`;
await $`bun build src/index.ts --outfile ./dist/index.cjs --format cjs --target node ${EXTERNALS}`;

// 2. Build subpath entrypoints (ESM & CJS) — mirrors the package.json "exports" map.
//    v2 fix: tiktok, twilio and messenger-personal are included (v1 build.ts omitted
//    tiktok/twilio even though package.json exported them).
const subpaths: Array<[string, string]> = [
  ["src/core/index.ts", "./dist/core/index"],
  // channels
  ["src/channels/zalo/index.ts", "./dist/channels/zalo/index"],
  ["src/channels/telegram/index.ts", "./dist/channels/telegram/index"],
  ["src/channels/discord/index.ts", "./dist/channels/discord/index"],
  ["src/channels/slack/index.ts", "./dist/channels/slack/index"],
  ["src/channels/messenger/index.ts", "./dist/channels/messenger/index"],
  ["src/channels/messenger-personal/index.ts", "./dist/channels/messenger-personal/index"],
  ["src/channels/tiktok/index.ts", "./dist/channels/tiktok/index"],
  ["src/channels/twilio/index.ts", "./dist/channels/twilio/index"],
  ["src/channels/email/index.ts", "./dist/channels/email/index"],
  ["src/channels/github/index.ts", "./dist/channels/github/index"],
  ["src/channels/calendar/index.ts", "./dist/channels/calendar/index"],
  ["src/channels/webhook-generic/index.ts", "./dist/channels/webhook-generic/index"],
  // bridges
  ["src/bridges/mcp/index.ts", "./dist/bridges/mcp/index"],
  ["src/bridges/webhook/index.ts", "./dist/bridges/webhook/index"],
  ["src/bridges/dashboard/index.ts", "./dist/bridges/dashboard/index"],
  // legacy compat surface
  ["src/legacy/zalo/index.ts", "./dist/legacy/zalo/index"],
];

for (const [src, dst] of subpaths) {
  await $`bun build ${src} --outfile ${dst}.js --format esm --target node ${EXTERNALS}`;
  await $`bun build ${src} --outfile ${dst}.cjs --format cjs --target node ${EXTERNALS}`;
}

// 3. Build app entrypoints (was bin/ in v1)
await $`bun build apps/cli/main.ts --outfile ./dist/apps/cli.js --format esm --target node ${EXTERNALS}`;
await $`bun build apps/mcp-server/main.ts --outfile ./dist/apps/mcp-server.js --format esm --target node ${EXTERNALS}`;

// Mark binaries as executable (Unix)
if (process.platform !== "win32") {
  await $`chmod +x ./dist/apps/cli.js`;
  await $`chmod +x ./dist/apps/mcp-server.js`;
}

// 4. Generate TypeScript declarations (.d.ts)
await $`bun x tsc --emitDeclarationOnly --declaration --outDir dist`;

// 5. Generate Real-time Benchmark Badge
await $`bun run scripts/generate-badge.ts`;

console.log("✅ Build complete! All dist entrypoints ready for npm publish.");
