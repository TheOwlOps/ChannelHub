import { describe, expect, test } from "bun:test";
import { ChannelHub } from "../src/core/hub";
import { BaseChannel } from "../src/core/adapter";
import type { ChannelType, UnifiedMessage, MediaType } from "../src/core/types";
import { TelegramChannelAdapter } from "../src/channels/telegram/adapter";
import { DiscordChannelAdapter } from "../src/channels/discord/adapter";
import { SlackChannelAdapter } from "../src/channels/slack/adapter";
import { MessengerChannelAdapter } from "../src/channels/messenger/adapter";
import { ZaloChannelAdapter } from "../src/channels/zalo/adapter";

class MockChannel extends BaseChannel {
  readonly name: ChannelType = "telegram";
  
  async connect(): Promise<void> {
    this.setConnected(true);
  }
  async disconnect(): Promise<void> {
    this.setConnected(false);
  }
  async sendText(): Promise<any> {
    return { messageId: "1", chatId: "c", timestamp: 1 };
  }
  async sendMedia(): Promise<any> {
    return { messageId: "1", chatId: "c", timestamp: 1 };
  }
  push(msg: UnifiedMessage) {
    this.emit("message", msg);
  }
}

describe("v1.4.4 Complete Fixes & Verification", () => {
  test("backpressure does not deadlock when exceeding 2,000 messages", async () => {
    const hub = new ChannelHub();
    const ch = new MockChannel();
    hub.register(ch);
    await hub.start();

    const TOTAL_MESSAGES = 2005;
    let receivedCount = 0;

    // Start consumer via messages() generator
    const consumerPromise = (async () => {
      for await (const ctx of hub.messages()) {
        receivedCount++;
        if (receivedCount === TOTAL_MESSAGES) {
          break;
        }
      }
    })();

    // Push TOTAL_MESSAGES asynchronously
    (async () => {
      for (let i = 1; i <= TOTAL_MESSAGES; i++) {
        ch.push({
          id: String(i),
          channel: "telegram",
          sender: { id: "u" },
          chat: { id: "c", type: "dm" },
          content: { text: `msg-${i}` },
          raw: {},
          timestamp: Date.now(),
        });
        // Tiny yield every 500 items so event loop breathes
        if (i % 500 === 0) {
          await new Promise((r) => setTimeout(r, 1));
        }
      }
    })();

    await expect(consumerPromise).resolves.toBeUndefined();
    expect(receivedCount).toBe(TOTAL_MESSAGES);
  });

  test("capabilities of all adapters match valid MediaType union", () => {
    const validMediaTypes: MediaType[] = ["image", "video", "audio", "file", "sticker", "animation"];
    
    const adapters = [
      new TelegramChannelAdapter({ botToken: "dummy" }),
      new DiscordChannelAdapter({ botToken: "dummy" }),
      new SlackChannelAdapter({ botToken: "dummy" }),
      new MessengerChannelAdapter({ pageAccessToken: "dummy" }),
      new ZaloChannelAdapter({ credentialsPath: "dummy.json" }),
    ];

    for (const adapter of adapters) {
      expect(adapter.capabilities).toBeDefined();
      expect(typeof adapter.capabilities.inbound).toBe("boolean");
      expect(typeof adapter.capabilities.outbound).toBe("boolean");
      for (const m of adapter.capabilities.media) {
        expect(validMediaTypes).toContain(m as MediaType);
        expect(m).not.toBe("document");
      }
    }
  });

  test("multi-account works for Telegram and Zalo with accountId in config", () => {
    const tele1 = new TelegramChannelAdapter({ botToken: "t1", accountId: "alpha" });
    const tele2 = new TelegramChannelAdapter({ botToken: "t2", accountId: "beta" });
    const zalo1 = new ZaloChannelAdapter({ credentialsPath: "c1.json", accountId: "personal1" });
    const zalo2 = new ZaloChannelAdapter({ credentialsPath: "c2.json", accountId: "personal2" });

    expect(tele1.accountId).toBe("alpha");
    expect(tele2.accountId).toBe("beta");
    expect(zalo1.accountId).toBe("personal1");
    expect(zalo2.accountId).toBe("personal2");

    const hub = new ChannelHub();
    hub.register(tele1);
    hub.register(tele2);
    hub.register(zalo1);
    hub.register(zalo2);

    expect(hub.listChannels()).toEqual([
      "telegram:alpha",
      "telegram:beta",
      "zalo:personal1",
      "zalo:personal2",
    ]);

    expect(hub.getChannel("telegram", "alpha")).toBe(tele1);
    expect(hub.getChannel("telegram", "beta")).toBe(tele2);
    expect(hub.getChannel("zalo", "personal1")).toBe(zalo1);
    expect(hub.getChannel("zalo", "personal2")).toBe(zalo2);
  });

  test("AbortSignal aborts sendText across adapters", async () => {
    const tele = new TelegramChannelAdapter({ botToken: "dummy" });
    const ac = new AbortController();
    ac.abort();

    await expect(tele.sendText("chat", "hello", { signal: ac.signal })).rejects.toThrow();
  });
});
