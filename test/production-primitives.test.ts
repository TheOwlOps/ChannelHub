import { describe, expect, test } from "bun:test";
import { IdempotencyCache } from "../src/core/dedup";
import { TokenBucketLimiter } from "../src/core/limiter";
import { ChannelHub } from "../src/core/hub";
import { BaseChannel } from "../src/core/adapter";
import type { DeadLetterItem } from "../src/core/dlq";
import type { ChannelType, UnifiedMessage } from "../src/core/types";

class MockTestAdapter extends BaseChannel {
  readonly name: ChannelType = "test-channel";
  async connect() { this.setConnected(true); }
  async disconnect() { this.setConnected(false); }
  async sendText() { return { messageId: "1", chatId: "c", timestamp: Date.now() }; }
  async sendMedia() { return { messageId: "1", chatId: "c", timestamp: Date.now() }; }

  emitMockMessage(msg: Partial<UnifiedMessage>) {
    this.emit("message", {
      id: msg.id || "msg_1",
      channel: "test-channel",
      sender: { id: "u1" },
      chat: { id: "c1", type: "dm" },
      content: { text: msg.content?.text || "hi" },
      raw: {},
      timestamp: Date.now(),
      ...msg,
    } as UnifiedMessage);
  }
}

describe("Production Scale Primitives", () => {
  describe("IdempotencyCache", () => {
    test("rejects duplicate message IDs within TTL window", () => {
      const cache = new IdempotencyCache({ ttlMs: 1000 });
      expect(cache.checkAndSet("msg_101")).toBe(true);
      expect(cache.checkAndSet("msg_101")).toBe(false); // duplicate!
      expect(cache.checkAndSet("msg_102")).toBe(true);
    });

    test("evicts oldest entries when reaching maxEntries limit", () => {
      const cache = new IdempotencyCache({ maxEntries: 2, ttlMs: 10_000 });
      cache.checkAndSet("1");
      cache.checkAndSet("2");
      expect(cache.size).toBe(2);

      cache.checkAndSet("3"); // evicts "1"
      expect(cache.size).toBe(2);
      expect(cache.has("1")).toBe(false);
      expect(cache.has("2")).toBe(true);
      expect(cache.has("3")).toBe(true);
    });
  });

  describe("TokenBucketLimiter", () => {
    test("allows immediate consumption when tokens are available", async () => {
      const limiter = new TokenBucketLimiter({
        capacity: 5,
        refillRate: 1,
        refillIntervalMs: 100,
      });

      expect(limiter.tokensAvailable).toBe(5);
      const consumed = await limiter.acquire(3);
      expect(consumed).toBe(true);
      expect(limiter.tokensAvailable).toBe(2);
    });

    test("enforces timeout when rate limit is exceeded and maxWaitMs is small", async () => {
      const limiter = new TokenBucketLimiter({
        capacity: 1,
        refillRate: 1,
        refillIntervalMs: 500,
      });

      await limiter.acquire(1); // empty bucket
      let failed = false;
      try {
        await limiter.acquire(1, 50); // wait at most 50ms, but refill takes 500ms
      } catch (err: any) {
        failed = true;
        expect(err.message).toContain("Timeout");
      }
      expect(failed).toBe(true);
    });
  });

  describe("ChannelHub Production Integration", () => {
    test("deduplicates inbound messages when enabled", async () => {
      const hub = new ChannelHub({ enableDeduplication: true });
      const adapter = new MockTestAdapter();
      hub.register(adapter);

      const received: string[] = [];
      hub.onMessage((ctx) => {
        received.push(ctx.message.id);
      });

      // Emit same message 3 times (simulating webhook retries)
      adapter.emitMockMessage({ id: "dup_msg_1" });
      adapter.emitMockMessage({ id: "dup_msg_1" });
      adapter.emitMockMessage({ id: "dup_msg_1" });
      adapter.emitMockMessage({ id: "new_msg_2" });

      expect(received.length).toBe(2);
      expect(received).toEqual(["dup_msg_1", "new_msg_2"]);
    });

    test("dispatches to Dead Letter Queue (DLQ) when handler throws", async () => {
      const dlqItems: DeadLetterItem[] = [];
      const hub = new ChannelHub({
        onDeadLetter: (item) => {
          dlqItems.push(item);
        },
      });

      const adapter = new MockTestAdapter();
      hub.register(adapter);

      // Prevent unhandled 'error' event from crashing the test runner
      hub.on("error", () => { /* swallow */ });

      hub.onMessage((ctx) => {
        if (ctx.message.content.text === "fail_me") {
          throw new Error("Business logic crashed");
        }
      });

      adapter.emitMockMessage({ id: "ok_1", content: { text: "hello" } });
      adapter.emitMockMessage({ id: "bad_2", content: { text: "fail_me" } });

      // Yield event loop
      await new Promise((r) => setTimeout(r, 10));

      expect(dlqItems.length).toBe(1);
      expect(dlqItems[0].message.id).toBe("bad_2");
      expect(dlqItems[0].error.message).toBe("Business logic crashed");
      expect(dlqItems[0].channel).toBe("test-channel");
    });
  });
});
