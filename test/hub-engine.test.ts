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

  test("supports multiple accounts via provider and accountId", async () => {
    const hub = new ChannelHub();
    const tele1 = new FakeChannel("telegram");
    Object.defineProperty(tele1, "accountId", { get: () => "bot1" });
    const tele2 = new FakeChannel("telegram");
    Object.defineProperty(tele2, "accountId", { get: () => "bot2" });

    hub.register(tele1);
    hub.register(tele2);

    expect(hub.listChannels()).toEqual(["telegram:bot1", "telegram:bot2"]);
    expect(hub.getChannel("telegram", "bot1")).toBe(tele1);
    expect(hub.getChannel("telegram", "bot2")).toBe(tele2);
    // Fallback to default
    expect(hub.getChannel("telegram")).toBe(tele1);
  });

  test("supports async iteration for backpressure and AbortSignal cancellation", async () => {
    const hub = new ChannelHub();
    const ch = new FakeChannel("zalo");
    hub.register(ch);
    await hub.start();

    const ac = new AbortController();

    let count = 0;
    const consumer = async () => {
      for await (const ctx of hub.messages(ac.signal)) {
        count++;
        if (count === 2) {
          ac.abort("done");
        }
      }
    };

    const runPromise = consumer();

    ch.push({ id: "1", channel: "zalo", sender: { id: "u" }, chat: { id: "c1", type: "dm" }, content: { text: "t1" }, raw: {}, timestamp: 1 });
    ch.push({ id: "2", channel: "zalo", sender: { id: "u" }, chat: { id: "c2", type: "dm" }, content: { text: "t2" }, raw: {}, timestamp: 2 });
    
    // Should cancel after processing the 2nd message
    await expect(runPromise).resolves.toBeUndefined();
    expect(count).toBe(2);
  });
});
