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

  test("getThreads throws if adapter is not connected", async () => {
    const adapter = new MessengerPersonalAdapter();
    await expect(adapter.getThreads()).rejects.toThrow(/not connected/);
  });

  test("getThreads executes evaluate on active page", async () => {
    const adapter = new MessengerPersonalAdapter();
    (adapter as any).setConnected(true);
    (adapter as any)._activePage = {
      evaluate: mock(async (fn: any, limit: number) => {
        return [
          { id: "1000123456", name: "Nguyễn Văn A" },
          { id: "8813682027", name: "Nhóm Anh Em OwlOps" },
        ];
      }),
    };

    const threads = await adapter.getThreads(10);
    expect(threads).toHaveLength(2);
    expect(threads[0].id).toBe("1000123456");
    expect(threads[1].name).toBe("Nhóm Anh Em OwlOps");
  });

  test("getThreadHistory throws if not connected and extracts messages when connected", async () => {
    const adapter = new MessengerPersonalAdapter();
    await expect(adapter.getThreadHistory("t_123")).rejects.toThrow(/not connected/);

    (adapter as any).setConnected(true);
    (adapter as any)._activePage = {
      url: () => "https://www.messenger.com/t/t_123",
      goto: mock(async () => {}),
      evaluate: mock(async () => [
        { text: "Chào cả nhà!", sender: "Admin" },
        { text: "Hello bot!", sender: "Member" },
      ]),
    };

    const history = await adapter.getThreadHistory("t_123", 5);
    expect(history).toHaveLength(2);
    expect(history[0].text).toBe("Chào cả nhà!");
  });

  test("getGroupMembers throws if not connected and extracts member links when connected", async () => {
    const adapter = new MessengerPersonalAdapter();
    await expect(adapter.getGroupMembers("t_123")).rejects.toThrow(/not connected/);

    (adapter as any).setConnected(true);
    (adapter as any)._activePage = {
      url: () => "https://www.messenger.com/t/t_123",
      goto: mock(async () => {}),
      evaluate: mock(async () => [
        { name: "Son Nguyen", id: "son.nguyen.123" },
        { name: "Ryan OwlOps", id: "ryanowlops" },
      ]),
    };

    const members = await adapter.getGroupMembers("t_123");
    expect(members).toHaveLength(2);
    expect(members[0].name).toBe("Son Nguyen");
    expect(members[1].id).toBe("ryanowlops");
  });

  test("getUserProfile throws if not connected and extracts profile when connected", async () => {
    const adapter = new MessengerPersonalAdapter();
    await expect(adapter.getUserProfile("t_123")).rejects.toThrow(/not connected/);

    (adapter as any).setConnected(true);
    (adapter as any)._activePage = {
      url: () => "https://www.messenger.com/t/t_123",
      goto: mock(async () => {}),
      evaluate: mock(async () => ({
        id: "t_123",
        name: "Test Group",
        avatarUrl: "https://fbcdn.net/avatar.jpg",
      })),
    };

    const profile = await adapter.getUserProfile("t_123");
    expect(profile.name).toBe("Test Group");
    expect(profile.avatarUrl).toBe("https://fbcdn.net/avatar.jpg");
  });

  test("recallMessage throws if not connected and succeeds when connected", async () => {
    const adapter = new MessengerPersonalAdapter();
    await expect(adapter.recallMessage("t_123")).rejects.toThrow(/not connected/);

    (adapter as any).setConnected(true);
    (adapter as any)._activePage = {
      url: () => "https://www.messenger.com/t/t_123",
      goto: mock(async () => {}),
      evaluate: mock(async () => true),
    };

    const res = await adapter.recallMessage("t_123");
    expect(res).toBe(true);
  });
});
