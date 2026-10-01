import { describe, expect, test } from "bun:test";
import { ChannelHub } from "../src/core/hub";
import { BaseChannel } from "../src/core/adapter";
import { getChannelHubMcpTools, handleChannelHubMcpCall } from "../src/bridges/mcp/index";
import { WebhookBridge } from "../src/bridges/webhook/index";

class MockChannel extends BaseChannel {
  readonly name = "mock";
  lastSent: any = null;

  async connect() {
    this.setConnected(true);
  }
  async disconnect() {
    this.setConnected(false);
  }
  async sendText(chatId: string, text: string, options?: any) {
    this.lastSent = { chatId, text, options };
    return { messageId: "m-123", chatId, timestamp: Date.now() };
  }
  async sendMedia(chatId: string, media: any, options: any) {
    this.lastSent = { type: media.type, source: media.source, caption: media.caption };
    return { messageId: "m-img", chatId, timestamp: Date.now() };
  }
  async addReaction(_chatId: string, _messageId: string, emoji: string) {
    this.lastSent = { reacted: emoji };
  }
}

describe("MCP Bridge", () => {
  test("lists registered tools", () => {
    const tools = getChannelHubMcpTools();
    expect(tools.length).toBeGreaterThanOrEqual(3);
    const names = tools.map((t) => t.name);
    expect(names).toContain("channelhub_list_channels");
    expect(names).toContain("channelhub_send_message");
    expect(names).toContain("channelhub_add_reaction");
    expect(names).toContain("channelhub_send_sticker");
    expect(names).toContain("channelhub_send_gif");
  });

  test("executes tool calls against registered channels", async () => {
    const hub = new ChannelHub();
    const ch = new MockChannel();
    hub.register(ch);

    const listRes = await handleChannelHubMcpCall(hub, "channelhub_list_channels", {});
    expect(listRes.isError).toBeFalsy();
    expect(listRes.content[0].text).toContain("mock");

    const sendRes = await handleChannelHubMcpCall(hub, "channelhub_send_message", {
      channel: "mock",
      chatId: "chat-456",
      text: "hello from MCP",
    });
    expect(sendRes.isError).toBeFalsy();
    expect(ch.lastSent.text).toBe("hello from MCP");

    // Test sending sticker via MCP
    const stickerRes = await handleChannelHubMcpCall(hub, "channelhub_send_sticker", {
      channel: "mock",
      chatId: "chat-456",
      sticker: "sticker-12345",
    });
    expect(stickerRes.isError).toBeFalsy();
    expect(ch.lastSent.type).toBe("sticker");
    expect(ch.lastSent.source).toBe("sticker-12345");

    // Test sending animated GIF via MCP
    const gifRes = await handleChannelHubMcpCall(hub, "channelhub_send_gif", {
      channel: "mock",
      chatId: "chat-456",
      gifUrl: "https://media.giphy.com/media/test.gif",
      caption: "Funny cat",
    });
    expect(gifRes.isError).toBeFalsy();
    expect(ch.lastSent.type).toBe("animation");
    expect(ch.lastSent.source).toBe("https://media.giphy.com/media/test.gif");
    expect(ch.lastSent.caption).toBe("Funny cat");
  });
});

describe("Webhook Bridge", () => {
  test("health and REST dispatch endpoints", async () => {
    const hub = new ChannelHub();
    const ch = new MockChannel();
    hub.register(ch);

    const bridge = new WebhookBridge(hub, { port: 18991, host: "127.0.0.1" });
    await bridge.start();

    try {
      // 1. GET /health
      const health = await fetch("http://127.0.0.1:18991/health").then((r) => r.json());
      expect(health.ok).toBe(true);

      // 2. GET /channels
      const channels = await fetch("http://127.0.0.1:18991/channels").then((r) => r.json());
      expect(channels.channels).toEqual(["mock"]);

      // 3. POST /send
      const sent = await fetch("http://127.0.0.1:18991/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel: "mock",
          chatId: "room-1",
          text: "ping via REST",
        }),
      }).then((r) => r.json());

      expect(sent.messageId).toBe("m-123");
      expect(ch.lastSent.text).toBe("ping via REST");
    } finally {
      await bridge.stop();
    }
  });
});
