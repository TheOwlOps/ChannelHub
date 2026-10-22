import { describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dir, "..", "..");

describe("build artifacts", () => {
  test("main ESM and CJS bundles exist", () => {
    expect(existsSync(join(root, "dist/index.js"))).toBe(true);
    expect(existsSync(join(root, "dist/index.cjs"))).toBe(true);
  });

  test("subpath entrypoints exist", () => {
    expect(existsSync(join(root, "dist/core/index.js"))).toBe(true);
    expect(existsSync(join(root, "dist/channels/zalo/index.js"))).toBe(true);
    expect(existsSync(join(root, "dist/channels/telegram/index.js"))).toBe(true);
    // v2 additions: previously exported-but-unbuilt subpaths now have artifacts
    expect(existsSync(join(root, "dist/channels/tiktok/index.js"))).toBe(true);
    expect(existsSync(join(root, "dist/channels/twilio/index.js"))).toBe(true);
    expect(existsSync(join(root, "dist/channels/messenger-personal/index.js"))).toBe(true);
    expect(existsSync(join(root, "dist/bridges/mcp/index.js"))).toBe(true);
    expect(existsSync(join(root, "dist/legacy/zalo/index.js"))).toBe(true);
    expect(existsSync(join(root, "dist/apps/cli.js"))).toBe(true);
    expect(existsSync(join(root, "dist/apps/mcp-server.js"))).toBe(true);
  });

  test("public API exports ChannelHub and adapters", async () => {
    const mod = await import("../../src/index");
    expect(typeof mod.ChannelHub).toBe("function");
    expect(typeof mod.ZaloChannelAdapter).toBe("function");
    expect(typeof mod.TelegramChannelAdapter).toBe("function");
    expect(typeof mod.BaseChannel).toBe("function");
  });
});
