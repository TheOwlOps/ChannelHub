import { $ } from "bun";

console.log("🚀 Building ZaloHub SDK...");

// 1. Build ESM bundle
await $`bun build src/index.ts --outdir ./dist --format esm --target node`;

// 2. Build CJS bundle
await $`bun build src/index.ts --outfile ./dist/index.cjs --format cjs --target node`;

// 3. Generate TypeScript types (.d.ts)
await $`bun x tsc --emitDeclarationOnly --declaration --outDir dist`;

console.log("✅ Build complete! Dist files ready for npm publish.");
