import { describe, expect, test } from "bun:test";
import { ChannelHub } from "../../src/core/engine/hub";
import { BaseChannel } from "../../src/core/contracts/adapter";
import type { MediaPayload, SendOptions, SentMessageResult, UnifiedMessage } from "../../src/core/contracts/types";
import { createAiResponder } from "../../src/core/ai/responder";
import { getChannelHubMcpTools, handleChannelHubMcpCall } from "../../src/bridges/mcp/index";

class FakeChannel extends BaseChannel {
  readonly name: string;
  sent: Array<{ chatId: string; text: string }> = [];
  connectFailures = 0;
  constructor(name: string) {
    super();
    this.name = name;
  }
  async connect() {
    if (this.connectFailures > 0) {
      this.connectFailures--;
      throw new Error("connect failed");
    }
    this.setConnected(true);
  }
  async disconnect() {
    this.setConnected(false);
  }
  drop() {
    this.setConnected(false);
  }
  async sendText(chatId: string, text: string, _options?: SendOptions): Promise<SentMessageResult> {
    this.sent.push({ chatId, text });
    return { messageId: `${this.name}-${this.sent.length}`, chatId, timestamp: Date.now() };
  }
  async sendMedia(chatId: string, _media: MediaPayload): Promise<SentMessageResult> {
    return { messageId: `${this.name}-m`, chatId, timestamp: Date.now() };
  }
  push(text: string, chatId = "c1") {
    const msg: UnifiedMessage = {
      id: Math.random().toString(36).slice(2),
      channel: this.name,
      sender: { id: "u1", name: "An" },
      chat: { id: chatId, type: "dm" },
      content: { text },
      timestamp: Date.now(),
    } as UnifiedMessage;
    this.emit("message", msg);
  }
}

const tick = (ms = 15) => new Promise((r) => setTimeout(r, ms));

describe("ChannelHub v2.2 features (integration)", () => {
  test("flow claims messages end-to-end: command starts it, steps run, generic handler skipped", async () => {
    const hub = new ChannelHub();
    const zalo = new FakeChannel("zalo");
    hub.register(zalo);

    const generic: string[] = [];
    hub.onMessage((ctx) => {
      generic.push(ctx.message.content.text || "");
    });

    hub.defineFlow({
      name: "dangky",
      steps: [
        { id: "name", prompt: "Bạn tên gì?" },
        {
          id: "age",
          prompt: "Bạn bao nhiêu tuổi?",
          parse: (t) => Number(t),
          validate: (v) => (typeof v === "number" && v > 0 && v < 150) || "Tuổi không hợp lệ, nhập lại nhé",
        },
      ],
      onComplete: async (ctx, data) => {
        await ctx.reply(`Đăng ký xong: ${data.name}, ${data.age} tuổi`);
      },
    });
    hub.command("dangky", async (ctx) => {
      await hub.flows.start(ctx, "dangky");
    });

    await hub.start();
    zalo.push("/dangky");
    await tick();
    zalo.push("An");
    await tick();
    zalo.push("abc"); // invalid age → re-prompt, stays in flow
    await tick();
    zalo.push("25");
    await tick();

    expect(zalo.sent.map((m) => m.text)).toEqual([
      "Bạn tên gì?",
      "Bạn bao nhiêu tuổi?",
      "Tuổi không hợp lệ, nhập lại nhé",
      "Đăng ký xong: An, 25 tuổi",
    ]);
    expect(generic).toEqual([]);
    expect(hub.flows.active({ session: hub.sessions.get("zalo", "c1") } as any)).toBeUndefined();
    await hub.stop();
  });

  test("AI responder answers from session context as a plain handler", async () => {
    const hub = new ChannelHub();
    const tele = new FakeChannel("telegram");
    hub.register(tele);

    const seenByProvider: string[] = [];
    hub.onMessage(
      createAiResponder({
        systemPrompt: "Bạn là trợ lý.",
        provider: {
          name: "fake",
          complete: async (messages) => {
            seenByProvider.push(messages.map((m) => `${m.role}:${m.content}`).join("|"));
            return "Chào bạn, mình là AI";
          },
        },
      }),
    );

    await hub.start();
    tele.push("xin chào");
    await tick();

    expect(tele.sent).toEqual([{ chatId: "c1", text: "Chào bạn, mình là AI" }]);
    expect(seenByProvider[0]).toContain("system:Bạn là trợ lý.");
    expect(seenByProvider[0]).toContain("user:xin chào");
    await hub.stop();
  });

  test("dead letter store captures handler failures and replays them after a fix", async () => {
    const hub = new ChannelHub({ deadLetterStore: true });
    const zalo = new FakeChannel("zalo");
    hub.register(zalo);

    let broken = true;
    const handled: string[] = [];
    hub.onMessage((ctx) => {
      if (broken) throw new Error("boom");
      handled.push(ctx.message.content.text || "");
    });

    await hub.start();
    zalo.push("tin quan trọng");
    await tick();

    expect(hub.deadLetters().length).toBe(1);
    expect(hub.deadLetters()[0].error.message).toBe("boom");
    expect(hub.health().deadLetters).toBe(1);

    broken = false;
    const result = await hub.replayDeadLetters();
    expect(result).toEqual({ replayed: 1, failed: 0 });
    expect(handled).toEqual(["tin quan trọng"]);
    expect(hub.deadLetters().length).toBe(0);
    await hub.stop();
  });

  test("journal records inbound, outbound and health reports them", async () => {
    const hub = new ChannelHub();
    const zalo = new FakeChannel("zalo");
    hub.register(zalo);
    hub.onMessage(async (ctx) => {
      await ctx.reply("đã nhận");
    });

    await hub.start();
    zalo.push("hello journal");
    await tick();

    const summary = hub.journal.summary();
    expect(summary.inbound).toBe(1);
    expect(summary.outbound).toBe(1);
    expect(summary.perChannel.zalo).toBe(2);
    const health = hub.health();
    expect(health.channels).toEqual([{ key: "zalo:default", connected: true }]);
    expect(health.journal.total).toBe(2);
    await hub.stop();
  });

  test("watchdog reconnects a dropped channel with backoff", async () => {
    const hub = new ChannelHub({ watchdog: { intervalMs: 15, baseDelayMs: 5, maxDelayMs: 20 } });
    const tele = new FakeChannel("telegram");
    hub.register(tele);
    await hub.start();
    expect(tele.isConnected()).toBe(true);

    tele.drop();
    tele.connectFailures = 1; // first reconnect attempt fails, second succeeds
    hub.startWatchdog();
    await tick(150);

    expect(tele.isConnected()).toBe(true);
    const status = hub.watchdog.status().find((s) => s.channel === "telegram");
    expect(status?.connected).toBe(true);
    expect(status?.failures).toBe(0); // reset after successful reconnect
    await hub.stop();
  });

  test("MCP exposes the 4 new tools (42 total) and health works through the handler", async () => {
    const hub = new ChannelHub({ deadLetterStore: true });
    const zalo = new FakeChannel("zalo");
    hub.register(zalo);

    const tools = getChannelHubMcpTools();
    expect(tools.length).toBe(42);
    const names = tools.map((t) => t.name);
    for (const n of ["channelhub_dead_letters", "channelhub_replay_dead_letters", "channelhub_journal_recent", "channelhub_health"]) {
      expect(names).toContain(n);
    }

    const res = await handleChannelHubMcpCall(hub, "channelhub_health", {});
    expect(res.isError).toBeUndefined();
    const parsed = JSON.parse(res.content[0].text);
    expect(parsed.deadLetters).toBe(0);
    expect(parsed.journal.total).toBe(0);
    await hub.stop();
  });
});
