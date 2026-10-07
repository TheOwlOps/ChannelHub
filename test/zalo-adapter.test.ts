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
    api.listener._emit("closed", new Error("session expired"));
    expect(expired).toHaveBeenCalled();
  });

  test("normalizes inbound photo, sticker, and file media attachments", async () => {
    let seen: any;
    adapter.on("message", (m: any) => {
      seen = m;
    });

    // 1. Photo
    api.listener._emit("message", {
      type: 0,
      threadId: "u-1",
      data: {
        msgId: "m-photo",
        uidFrom: "u-1",
        msgType: "chat.photo",
        href: "https://zalo.me/photo.jpg",
        content: "",
      },
    });
    await new Promise((r) => setTimeout(r, 0));
    expect(seen.content.text).toBe("[Ảnh]");
    expect(seen.content.attachments?.[0].type).toBe("image");
    expect(seen.content.attachments?.[0].url).toBe("https://zalo.me/photo.jpg");

    // 2. Sticker with CDN fallback URL
    api.listener._emit("message", {
      type: 0,
      threadId: "u-1",
      data: {
        msgId: "m-sticker",
        uidFrom: "u-1",
        msgType: "chat.sticker",
        content: { id: "12345", catId: "1" },
      },
    });
    await new Promise((r) => setTimeout(r, 0));
    expect(seen.content.text).toBe("[Sticker]");
    expect(seen.content.attachments?.[0].type).toBe("sticker");
    expect(seen.content.attachments?.[0].url).toContain("eid=12345");

    // 3. File
    api.listener._emit("message", {
      type: 0,
      threadId: "u-1",
      data: {
        msgId: "m-file",
        uidFrom: "u-1",
        msgType: "share.file",
        content: { title: "bao_cao.pdf", fileUrl: "https://zalo.me/doc.pdf", size: 1024 },
      },
    });
    await new Promise((r) => setTimeout(r, 0));
    expect(seen.content.text).toBe("[File] bao_cao.pdf");
    expect(seen.content.attachments?.[0].type).toBe("file");
    expect(seen.content.attachments?.[0].filename).toBe("bao_cao.pdf");
  });

  test("resolveThreadType probes getGroupInfo to avoid mistaking DM for group", async () => {
    api.getGroupInfo = mock(async (id: string) => {
      if (id === "real-group") return { gridInfoMap: {}, name: "My Group" };
      throw new Error("Not a group");
    });

    const isGroupType = await adapter.resolveThreadType("real-group");
    expect(isGroupType).toBe(1);

    const isDmType = await adapter.resolveThreadType("user-dm");
    expect(isDmType).toBe(0);
  });
});
