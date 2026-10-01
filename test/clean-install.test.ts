import { describe, expect, test } from "bun:test";
import { $ } from "bun";
import fs from "node:fs";

describe("NPM Release Smoke Test", () => {
  test("CLI binary runs successfully via pure node", async () => {
    expect(fs.existsSync("./dist/bin/cli.js")).toBe(true);
    const { stdout, exitCode } = await $`node ./dist/bin/cli.js help`.quiet();
    expect(exitCode).toBe(0);
    expect(stdout.toString()).toContain("ChannelHub CLI");
  });

  test("MCP server binary runs successfully via pure node", async () => {
    expect(fs.existsSync("./dist/bin/mcp-server.js")).toBe(true);
    // Send a JSON-RPC list tools payload to the MCP server
    const payload = '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}';
    const { stdout, exitCode } = await $`echo ${payload} | node ./dist/bin/mcp-server.js`.quiet();
    expect(exitCode).toBe(0);
    expect(stdout.toString()).toContain("channelhub_list_channels");
  });
});
