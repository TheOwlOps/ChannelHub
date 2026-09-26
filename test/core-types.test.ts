import { describe, expect, test } from "bun:test";
import { ChannelEventBus } from "../src/core/bus";
import type { UnifiedMessage, IChannelAdapter } from "../src/core/types";
import { BaseChannel } from "../src/core/adapter";

describe("core types", () => {
  test("UnifiedMessage shape is assignable", () => {
    const msg: UnifiedMessage = {
      id: "1",
      channel: "zalo",
      sender: { id: "u1", name: "Ryan" },
      chat: { id: "c1", type: "dm" },
      content: { text: "hello" },
      raw: {},
      timestamp: Date.now(),
    };
    expect(msg.channel).toBe("zalo");
    expect(msg.content.text).toBe("hello");
  });
});

describe("ChannelEventBus", () => {
  test("emits message events to subscribers", async () => {
    const bus = new ChannelEventBus();
    let received: UnifiedMessage | null = null;
    bus.on("message", (msg) => {
      received = msg;
    });
    const msg: UnifiedMessage = {
      id: "m1",
      channel: "telegram",
      sender: { id: "u2" },
      chat: { id: "c2", type: "group", title: "ops" },
      content: { text: "ping" },
      raw: null,
      timestamp: 1,
    };
    bus.emit("message", msg);
    expect(received?.id).toBe("m1");
    expect(received?.channel).toBe("telegram");
  });
});

describe("BaseChannel", () => {
  test("implements IChannelAdapter lifecycle stubs", async () => {
    class Stub extends BaseChannel {
      readonly name = "stub";
      async connect() {
        this.setConnected(true);
      }
      async disconnect() {
        this.setConnected(false);
      }
      async sendText(chatId: string, text: string) {
        return { messageId: "x", chatId, timestamp: Date.now() };
      }
      async sendMedia(chatId: string) {
        return { messageId: "y", chatId, timestamp: Date.now() };
      }
    }
    const ch: IChannelAdapter = new Stub();
    expect(ch.isConnected()).toBe(false);
    await ch.connect();
    expect(ch.isConnected()).toBe(true);
    const sent = await ch.sendText("c", "hi");
    expect(sent.chatId).toBe("c");
  });
});
