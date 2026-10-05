import { describe, expect, test } from "bun:test";
import { IdentityStitcher } from "../src/core/identity";
import { ChannelHub } from "../src/core/hub";
import { BaseChannel } from "../src/core/adapter";
import { TelegramChannelAdapter } from "../src/channels/telegram/adapter";
import type { ActionNode, ChannelType, UnifiedMessage } from "../src/core/types";

class MockIdentityAdapter extends BaseChannel {
  readonly name: ChannelType = "zalo";
  async connect() { this.setConnected(true); }
  async disconnect() { this.setConnected(false); }
  async sendText() { return { messageId: "1", chatId: "c", timestamp: Date.now() }; }
  async sendMedia() { return { messageId: "1", chatId: "c", timestamp: Date.now() }; }

  emitUserMessage(senderId: string, text: string) {
    this.emit("message", {
      id: `msg_${Date.now()}`,
      channel: this.name,
      sender: { id: senderId, name: "Test User" },
      chat: { id: "chat_1", type: "dm" },
      content: { text },
      raw: {},
      timestamp: Date.now(),
    } as UnifiedMessage);
  }
}

describe("Cross-Channel Identity Stitching", () => {
  test("resolves canonical primaryUserId and caches across repeated messages", () => {
    const stitcher = new IdentityStitcher();
    const id1 = stitcher.resolve("telegram", "tg_123");
    const id2 = stitcher.resolve("telegram", "tg_123");

    expect(id1.primaryUserId).toBe(id2.primaryUserId);
    expect(id1.channels.telegram).toBe("tg_123");
  });

  test("links multiple channels to a single universal user", () => {
    const stitcher = new IdentityStitcher();
    const user = stitcher.resolve("zalo", "zalo_456");

    stitcher.link(user.primaryUserId, "telegram", "tg_789");
    stitcher.link(user.primaryUserId, "discord", "dc_999");

    const resolvedTelegram = stitcher.resolve("telegram", "tg_789");
    const resolvedDiscord = stitcher.resolve("discord", "dc_999");

    expect(resolvedTelegram.primaryUserId).toBe(user.primaryUserId);
    expect(resolvedDiscord.primaryUserId).toBe(user.primaryUserId);
    expect(user.channels.zalo).toBe("zalo_456");
    expect(user.channels.telegram).toBe("tg_789");
    expect(user.channels.discord).toBe("dc_999");
  });

  test("merges two independent identities together", () => {
    const stitcher = new IdentityStitcher();
    const userA = stitcher.resolve("telegram", "tg_user_a");
    const userB = stitcher.resolve("zalo", "zalo_user_b");

    expect(userA.primaryUserId).not.toBe(userB.primaryUserId);

    // Merge B into A
    const merged = stitcher.merge(userA.primaryUserId, userB.primaryUserId);
    expect(merged.primaryUserId).toBe(userA.primaryUserId);
    expect(stitcher.count).toBe(1);

    // Resolving either channel returns userA's primary ID
    expect(stitcher.resolve("telegram", "tg_user_a").primaryUserId).toBe(userA.primaryUserId);
    expect(stitcher.resolve("zalo", "zalo_user_b").primaryUserId).toBe(userA.primaryUserId);
  });

  test("attaches stitched identity automatically to MessageContext in ChannelHub", async () => {
    const hub = new ChannelHub();
    const adapter = new MockIdentityAdapter();
    hub.register(adapter);

    let observedPrimaryId = "";
    hub.onMessage((ctx) => {
      observedPrimaryId = ctx.identity?.primaryUserId || "";
    });

    adapter.emitUserMessage("sender_alpha", "Hello AI");
    expect(observedPrimaryId).toMatch(/^usr_/);
  });
});

describe("Interactive UI Schema (Action Buttons)", () => {
  test("generates valid Telegram InlineKeyboardMarkup from ActionNode[]", async () => {
    const adapter = new TelegramChannelAdapter({ botToken: "mock-token", autoStart: false });

    let capturedPayload: any = null;
    (adapter as any).callApi = async (_method: string, payload: any) => {
      capturedPayload = payload;
      return { message_id: 101, date: 1727337600 };
    };

    const actions: ActionNode[] = [
      { type: "button", label: "Accept", payload: "action_accept" },
      { type: "link", label: "Docs", url: "https://example.com/docs" },
    ];

    await adapter.sendText("123456", "Choose an option:", { actions });

    expect(capturedPayload).not.toBeNull();
    expect(capturedPayload.reply_markup).toBeDefined();
    expect(capturedPayload.reply_markup.inline_keyboard).toEqual([
      [{ text: "Accept", callback_data: "action_accept" }],
      [{ text: "Docs", url: "https://example.com/docs" }],
    ]);
  });
});
