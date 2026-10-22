import { describe, expect, test } from "bun:test";
import { ChannelHub } from "../../src/core/engine/hub";
import { BaseChannel } from "../../src/core/contracts/adapter";
import type { MediaPayload, SendOptions, SentMessageResult, UnifiedMessage } from "../../src/core/contracts/types";
import { getChannelHubMcpTools, handleChannelHubMcpCall } from "../../src/bridges/mcp/index";

class FakeChannel extends BaseChannel {
  readonly name: string;
  sent: Array<{ chatId: string; text: string }> = [];
  constructor(name: string) {
    super();
    this.name = name;
  }
  async connect() {
    this.setConnected(true);
  }
  async disconnect() {
    this.setConnected(false);
  }
  async sendText(chatId: string, text: string, _options?: SendOptions): Promise<SentMessageResult> {
    this.sent.push({ chatId, text });
    return { messageId: `${this.name}-${this.sent.length}`, chatId, timestamp: Date.now() };
  }
  async sendMedia(chatId: string, _media: MediaPayload): Promise<SentMessageResult> {
    return { messageId: `${this.name}-m`, chatId, timestamp: Date.now() };
  }
  push(text: string, chatId = "c1", id = Math.random().toString(36).slice(2)) {
    const msg: UnifiedMessage = {
      id,
      channel: this.name,
      sender: { id: "u1", name: "An" },
      chat: { id: chatId, type: "dm" },
      content: { text },
      timestamp: Date.now(),
    } as UnifiedMessage;
    this.emit("message", msg);
  }
}

const tick = () => new Promise((r) => setTimeout(r, 10));

describe("ChannelHub v2.1 features (integration)", () => {
  test("command dispatch claims the message; session records user + assistant history", async () => {
    const hub = new ChannelHub();
    const zalo = new FakeChannel("zalo");
    hub.register(zalo);

    const generic: string[] = [];
    hub.onMessage((ctx) => {
      generic.push(ctx.message.content.text || "");
    });

    hub.command("ping", async (ctx, args) => {
      ctx.session && (ctx.session.state.lastArgs = args);
      await ctx.reply("pong");
    });

    await hub.start();
    zalo.push("/ping hello world");
    await tick();

    expect(zalo.sent).toEqual([{ chatId: "c1", text: "pong" }]);
    expect(generic).toEqual([]); // command claimed it — generic handlers skipped

    const session = hub.sessions.get("zalo", "c1");
    expect(session?.state.lastArgs).toEqual(["hello", "world"]);
    expect(session?.history.map((h) => `${h.role}:${h.text}`)).toEqual([
      "user:/ping hello world",
      "assistant:pong",
    ]);
    await hub.stop();
  });

  test("unknown command falls through to routes, then to generic handlers", async () => {
    const hub = new ChannelHub();
    const tele = new FakeChannel("telegram");
    hub.register(tele);

    const seen: string[] = [];
    hub.route({
      pattern: "giá",
      handler: (ctx) => {
        seen.push(`route:${ctx.message.content.text}`);
      },
    });
    hub.onMessage((ctx) => {
      seen.push(`generic:${ctx.message.content.text}`);
    });

    await hub.start();
    tele.push("cho hỏi giá phòng"); // route pattern hit
    tele.push("/unknowncmd"); // no command, no route → generic
    await tick();

    expect(seen).toEqual(["route:cho hỏi giá phòng", "generic:/unknowncmd"]);
    await hub.stop();
  });

  test("hub.broadcast fans out with per-target template vars and a report", async () => {
    const hub = new ChannelHub();
    const zalo = new FakeChannel("zalo");
    const tele = new FakeChannel("telegram");
    hub.register(zalo);
    hub.register(tele);

    const report = await hub.broadcast(
      [
        { channel: "zalo", chatId: "g1", vars: { name: "An" } },
        { channel: "telegram", chatId: "g2", vars: { name: "Bình" } },
        { channel: "discord", chatId: "g3" }, // not registered → failed item
      ],
      { text: "Xin chào {{name}}!" },
    );

    expect(report.total).toBe(3);
    expect(report.sent).toBe(2);
    expect(report.failed).toBe(1);
    expect(zalo.sent[0].text).toBe("Xin chào An!");
    expect(tele.sent[0].text).toBe("Xin chào Bình!");
    await hub.stop();
  });

  test("hub.schedule lists, fires via runDue, and cancels", async () => {
    const hub = new ChannelHub();
    const zalo = new FakeChannel("zalo");
    hub.register(zalo);
    await hub.start();

    const due = hub.schedule({ at: Date.now() - 1000, channel: "zalo", chatId: "c9", text: "nhắc việc" });
    const later = hub.schedule({ delayMs: 3_600_000, channel: "zalo", chatId: "c9", text: "để sau" });
    expect(hub.listScheduled().length).toBe(2);

    await hub.scheduler.runDue();
    expect(zalo.sent).toEqual([{ chatId: "c9", text: "nhắc việc" }]);
    expect(hub.listScheduled().map((j) => j.id)).toEqual([later.id]);

    expect(hub.cancelScheduled(later.id)).toBe(true);
    expect(hub.cancelScheduled(due.id)).toBe(false); // already fired & removed
    expect(hub.listScheduled().length).toBe(0);
    await hub.stop();
  });

  test("MCP exposes the 4 new tools (42 total) and broadcast works through the handler", async () => {
    const hub = new ChannelHub();
    const zalo = new FakeChannel("zalo");
    hub.register(zalo);

    const tools = getChannelHubMcpTools();
    expect(tools.length).toBe(42);
    const names = tools.map((t) => t.name);
    for (const n of ["channelhub_broadcast", "channelhub_schedule_message", "channelhub_list_scheduled", "channelhub_cancel_scheduled"]) {
      expect(names).toContain(n);
    }

    const res = await handleChannelHubMcpCall(hub, "channelhub_broadcast", {
      targets: [{ channel: "zalo", chatId: "c1" }],
      text: "hello từ MCP",
    });
    expect(res.isError).toBeUndefined();
    expect(zalo.sent).toEqual([{ chatId: "c1", text: "hello từ MCP" }]);
    await hub.stop();
  });
});
