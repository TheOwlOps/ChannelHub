import { describe, expect, test, mock, beforeEach } from "bun:test";
import { ZaloChannelAdapter } from "../src/channels/zalo/adapter";

function makeRaw(overrides: Record<string, any> = {}) {
  return {
    type: 1,
    threadId: "g-1",
    data: {
      msgId: "m-1",
      cliMsgId: "c-1",
      uidFrom: "u-1",
      dName: "Alice",
      content: "hello",
      ts: 1700000000000,
      idTo: "g-1",
    },
    ...overrides,
  };
}

describe("ZaloChannelAdapter refinements", () => {
  let sendMessage: ReturnType<typeof mock>;
  let addReaction: ReturnType<typeof mock>;
  let listenerOn: ReturnType<typeof mock>;
  let listenerStart: ReturnType<typeof mock>;
  let api: any;
  let adapter: ZaloChannelAdapter;

  beforeEach(async () => {
    sendMessage = mock(async () => ({ message: { msgId: "out-1" } }));
    addReaction = mock(async () => undefined);
    const handlers: Record<string, Function> = {};
    listenerOn = mock((event: string, fn: Function) => {
      handlers[event] = fn;
    });
    listenerStart = mock(() => undefined);
    api = {
      sendMessage,
      addReaction,
      listener: {
        on: listenerOn,
        start: listenerStart,
        stop: mock(() => undefined),
        _emit(event: string, payload: any) {
          handlers[event]?.(payload);
        },
      },
    };
    adapter = new ZaloChannelAdapter({ api, ownId: "bot-1", minDelayMs: 0, maxDelayMs: 0 });
    await adapter.connect();
  });

  test("caches ThreadType from inbound group message and uses it on send", async () => {
    api.listener._emit("message", makeRaw({ type: 1, threadId: "g-1" }));
    await adapter.sendText("g-1", "pong");
    expect(sendMessage.mock.calls[0][2]).toBe(1);
  });

  test("caches ThreadType from inbound DM and uses type 0 on send", async () => {
    api.listener._emit(
      "message",
      makeRaw({
        type: 0,
        threadId: "u-9",
        data: {
          msgId: "m-dm",
          cliMsgId: "c-dm",
          uidFrom: "u-9",
          dName: "Bob",
          content: "hi",
          ts: Date.now(),
          idTo: "bot-1",
        },
      }),
    );
    await adapter.sendText("u-9", "pong");
    expect(sendMessage.mock.calls[0][2]).toBe(0);
  });

  test("reply builds full quote object from message cache", async () => {
    api.listener._emit("message", makeRaw());
    await adapter.sendText("g-1", "replying", { replyToId: "m-1" });
    const payload = sendMessage.mock.calls[0][0];
    expect(payload.quote).toEqual(
      expect.objectContaining({
        msgId: "m-1",
        cliMsgId: "c-1",
        uidFrom: "u-1",
        content: "hello",
      }),
    );
  });

  test("maps unicode emoji to Zalo reaction and passes cliMsgId", async () => {
    api.listener._emit("message", makeRaw());
    await adapter.addReaction("g-1", "m-1", "❤️");
    expect(addReaction).toHaveBeenCalled();
    const args = addReaction.mock.calls[0];
    // threadId, msgId, cliMsgId, reaction, threadType
    expect(args[0]).toBe("g-1");
    expect(args[1]).toBe("m-1");
    expect(args[2]).toBe("c-1");
    expect(args[4]).toBe(1);
  });

  test("emits session:expired on listener closed", async () => {
    const expired = mock(() => undefined);
    adapter.on("session:expired", expired);
    api.listener._emit("closed", { reason: "session_expired" });
    expect(expired).toHaveBeenCalled();
  });

  test("normalizes inbound message with cliMsgId preserved in raw cache", async () => {
    let seen: any;
    adapter.on("message", (m: any) => {
      seen = m;
    });
    api.listener._emit("message", makeRaw());
    expect(seen.id).toBe("m-1");
    expect(seen.chat.type).toBe("group");
    expect(seen.content.text).toBe("hello");
  });
});
