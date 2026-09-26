import { describe, expect, test } from "bun:test";
import { ChannelHub } from "../src/core/hub";
import { BaseChannel } from "../src/core/adapter";
import type { MediaPayload, SendOptions, SentMessageResult, UnifiedMessage } from "../src/core/types";

class FakeChannel extends BaseChannel {
  readonly name: string;
  sent: Array<{ chatId: string; text: string }> = [];

  constructor(name: string) {
    super();
    this.name = name;
  }

  async connect() {
    this.setConnected(true);
  }

  async disconnect() {
    this.setConnected(false);
  }

  async sendText(chatId: string, text: string, _options?: SendOptions): Promise<SentMessageResult> {
    this.sent.push({ chatId, text });
    return { messageId: `${this.name}-1`, chatId, timestamp: Date.now() };
  }

  async sendMedia(chatId: string, _media: MediaPayload): Promise<SentMessageResult> {
    return { messageId: `${this.name}-m`, chatId, timestamp: Date.now() };
  }

  push(msg: UnifiedMessage) {
    this.emit("message", msg);
  }
}

describe("ChannelHub", () => {
  test("registers channels, starts them, and routes messages with MessageContext", async () => {
    const hub = new ChannelHub();
    const zalo = new FakeChannel("zalo");
    const tele = new FakeChannel("telegram");
    hub.register(zalo);
    hub.register(tele);

    const seen: string[] = [];
    hub.onMessage(async (ctx) => {
      seen.push(`${ctx.message.channel}:${ctx.message.content.text}`);
      await ctx.reply(`echo:${ctx.message.content.text}`);
    });

    await hub.start();
    expect(zalo.isConnected()).toBe(true);
    expect(tele.isConnected()).toBe(true);

    zalo.push({
      id: "1",
      channel: "zalo",
      sender: { id: "u" },
      chat: { id: "c-z", type: "dm" },
      content: { text: "hi" },
      raw: {},
      timestamp: 1,
    });

    // allow async handler
    await new Promise((r) => setTimeout(r, 10));

    expect(seen).toEqual(["zalo:hi"]);
    expect(zalo.sent).toEqual([{ chatId: "c-z", text: "echo:hi" }]);
  });
});
