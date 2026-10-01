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
  async push(msg: UnifiedMessage) {
    await this.dispatchMessage(msg);
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
        await ch.push({
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

  test("aborted consumer removes waiter and does not swallow subsequent messages", async () => {
    const hub = new ChannelHub();
    const ch = new MockChannel();
    hub.register(ch);
    await hub.start();

    const ac1 = new AbortController();
    // Consumer 1 waits for message, but gets aborted
    const consumer1 = (async () => {
      for await (const msg of hub.messages(ac1.signal)) {
        return msg;
      }
      return null;
    })();

    // Yield to let consumer1 register its waiter in hub
    await new Promise((r) => setTimeout(r, 10));

    // Abort consumer 1
    ac1.abort();
    await expect(consumer1).resolves.toBeNull();

    // Now start consumer 2
    let received: any = null;
    const consumer2 = (async () => {
      for await (const msg of hub.messages()) {
        received = msg;
        break;
      }
    })();

    // Yield to let consumer 2 register
    await new Promise((r) => setTimeout(r, 10));

    // Push new message
    ch.push({
      id: "probe-1",
      channel: "telegram",
      sender: { id: "u" },
      chat: { id: "c", type: "dm" },
      content: { text: "probe-message" },
      raw: {},
      timestamp: Date.now(),
    });

    await consumer2;
    expect(received).not.toBeNull();
    expect(received.message.content.text).toBe("probe-message");
  });

  test("hub stop and restart resets _isClosed and allows messages to resume", async () => {
    const hub = new ChannelHub();
    const ch = new MockChannel();
    hub.register(ch);

    await hub.start();
    await hub.stop();
    // Restart hub
    await hub.start();

    let received: any = null;
    const consumer = (async () => {
      for await (const msg of hub.messages()) {
        received = msg;
        break;
      }
    })();

    await new Promise((r) => setTimeout(r, 10));

    ch.push({
      id: "restart-1",
      channel: "telegram",
      sender: { id: "u" },
      chat: { id: "c", type: "dm" },
      content: { text: "after-restart" },
      raw: {},
      timestamp: Date.now(),
    });

    await consumer;
    expect(received).not.toBeNull();
    expect(received.message.content.text).toBe("after-restart");
  });
  test("stop() wakes up and releases producers waiting on full queue drain without hanging", async () => {
    const hub = new ChannelHub();
    const ch = new MockChannel();
    hub.register(ch);
    await hub.start();

    // Fill queue to 2,000 capacity
    for (let i = 1; i <= 2000; i++) {
      await ch.push({
        id: `fill-${i}`,
        channel: "telegram",
        sender: { id: "u" },
        chat: { id: "c", type: "dm" },
        content: { text: "filler" },
        raw: {},
        timestamp: Date.now(),
      });
    }

    // Now push 2,001th item which suspends
    let producerFinished = false;
    const producerPromise = (async () => {
      await ch.push({
        id: "overflow-1",
        channel: "telegram",
        sender: { id: "u" },
        chat: { id: "c", type: "dm" },
        content: { text: "blocked" },
        raw: {},
        timestamp: Date.now(),
      });
      // Yield to enter waiting state
      await new Promise((r) => setTimeout(r, 10));
      producerFinished = true;
    })();

    // Ensure it is waiting
    await new Promise((r) => setTimeout(r, 20));
    expect(producerFinished).toBe(false);

    // Call stop() — should drain waiters and not hang
    await hub.stop();
    await producerPromise;
    expect(producerFinished).toBe(true);
  });
});