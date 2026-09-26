import { describe, expect, test } from "bun:test";
import { ZaloChannelAdapter } from "../src/channels/zalo/adapter";
import type { UnifiedMessage } from "../src/core/types";

describe("ZaloChannelAdapter", () => {
  test("normalizes incoming Zalo message event to UnifiedMessage", async () => {
    let capturedHandler: ((msg: any) => void) | null = null;
    const mockListener = {
      on: (event: string, fn: any) => {
        if (event === "message") capturedHandler = fn;
      },
      start: () => {},
      stop: () => {},
    };

    const mockApi = {
      listener: mockListener,
      sendMessage: async (_payload: any, _threadId: string, _type: any) => ({
        msgId: "z-123",
      }),
      addReaction: async () => {},
    };

    const adapter = new ZaloChannelAdapter({
      api: mockApi,
      ownId: "bot-99",
    });

    let received: UnifiedMessage | null = null;
    adapter.on("message", (msg) => {
      received = msg;
    });

    await adapter.connect();
    expect(adapter.isConnected()).toBe(true);

    // Simulate incoming raw Zalo personal message
    capturedHandler?.({
      data: {
        msgId: "raw-msg-01",
        msgType: "chat.message",
        uidFrom: "user-456",
        dName: "Alice",
        idTo: "group-789",
        content: "Xin chao ChannelHub!",
        ts: "1727337600000",
      },
      threadId: "group-789",
      type: 1, // Group
    });

    expect(received).not.toBeNull();
    expect(received?.channel).toBe("zalo");
    expect(received?.sender.id).toBe("user-456");
    expect(received?.sender.name).toBe("Alice");
    expect(received?.chat.id).toBe("group-789");
    expect(received?.chat.type).toBe("group");
    expect(received?.content.text).toBe("Xin chao ChannelHub!");
  });

  test("dispatches sendText with proper thread type", async () => {
    let sentArgs: any = null;
    const mockApi = {
      listener: { on: () => {}, start: () => {}, stop: () => {} },
      sendMessage: async (payload: any, threadId: string, type: any) => {
        sentArgs = { payload, threadId, type };
        return { message: { msgId: "sent-99" } };
      },
    };

    const adapter = new ZaloChannelAdapter({ api: mockApi });
    await adapter.connect();
    const res = await adapter.sendText("group-123", "test reply");

    expect(sentArgs.threadId).toBe("group-123");
    expect(sentArgs.payload.msg).toBe("test reply");
    expect(res.chatId).toBe("group-123");
  });
});
