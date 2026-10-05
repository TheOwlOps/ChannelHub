import { test, expect, describe, mock, afterEach } from "bun:test";
import { MessengerPersonalAdapter } from "../src/channels/messenger/personal";

describe("MessengerPersonalAdapter", () => {
  afterEach(() => {
    mock.restore();
  });

  test("constructor applies default config for stealth & rate limiting", () => {
    const adapter = new MessengerPersonalAdapter();
    expect(adapter.name).toBe("messenger");
    expect((adapter as any)._config.headless).toBe(true);
    expect((adapter as any)._config.maxMessagesPerMinute).toBe(15);
    expect((adapter as any)._config.humanTypingDelayMs).toBe(30);
  });

  test("checkRateLimit throws if exceeding maxMessagesPerMinute", () => {
    const adapter = new MessengerPersonalAdapter({ maxMessagesPerMinute: 2 });
    
    // Simulate sending 2 messages
    (adapter as any).checkRateLimit();
    (adapter as any).checkRateLimit();
    
    // 3rd message should throw
    expect(() => (adapter as any).checkRateLimit()).toThrow(/Rate limit exceeded/);
  });

  test("rejects sendMedia to prevent account checkpoints", async () => {
    const adapter = new MessengerPersonalAdapter();
    await expect(adapter.sendMedia("test", { type: "image", source: "url" })).rejects.toThrow(/disabled in safe mode/);
  });

  test("connect throws if Playwright is not installed (mocked)", async () => {
    const adapter = new MessengerPersonalAdapter();
    expect(adapter.isConnected()).toBe(false);
  });
});
