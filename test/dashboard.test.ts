import { describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ChannelHub } from "../src/core/hub";
import { BaseChannel } from "../src/core/adapter";
import { StatsCollector } from "../src/core/stats";
import { DashboardBridge } from "../src/bridges/dashboard/index";
import type { MediaPayload, SendOptions, SentMessageResult, UnifiedMessage } from "../src/core/types";

class FakeChannel extends BaseChannel {
  readonly name: string;
  sent = 0;

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
  async sendText(chatId: string, _text: string, _options?: SendOptions): Promise<SentMessageResult> {
    this.sent++;
    return { messageId: `${this.name}-${this.sent}`, chatId, timestamp: Date.now() };
  }
  async sendMedia(chatId: string, _media: MediaPayload): Promise<SentMessageResult> {
    return { messageId: `${this.name}-m`, chatId, timestamp: Date.now() };
  }

  push(msg: UnifiedMessage) {
    this.emit("message", msg);
  }
}

function makeMsg(channel: string, senderId: string, overrides: Partial<UnifiedMessage> = {}): UnifiedMessage {
  return {
    id: `msg-${Math.random().toString(36).slice(2)}`,
    channel,
    sender: { id: senderId, name: `User ${senderId}` },
    chat: { id: `chat-${senderId}`, type: "dm" },
    content: { text: "hello" },
    raw: {},
    timestamp: Date.now(),
    ...overrides,
  };
}

describe("StatsCollector", () => {
  test("counts inbound, outbound and errors per channel", () => {
    const stats = new StatsCollector();
    stats.recordInbound(makeMsg("telegram", "u1"));
    stats.recordInbound(makeMsg("telegram", "u2"));
    stats.recordInbound(makeMsg("zalo", "u1"));
    stats.recordOutbound("telegram");
    stats.recordError("telegram");

    const snap = stats.snapshot();
    expect(snap.totals).toEqual({ inbound: 3, outbound: 1, errors: 1 });
    const telegram = snap.perChannel.find((c) => c.channel === "telegram")!;
    expect(telegram.inbound).toBe(2);
    expect(telegram.outbound).toBe(1);
    expect(telegram.errors).toBe(1);
    expect(snap.today.inbound).toBe(3);
    expect(snap.today.activeUsers).toBe(2); // u1 counted once even though seen on two channels
  });

  test("hourly24, heatmap and daily14 have the right shapes", () => {
    const stats = new StatsCollector();
    stats.recordInbound(makeMsg("mock", "u1"));
    const snap = stats.snapshot();

    expect(snap.hourly24).toHaveLength(24);
    expect(snap.hourly24[23].inbound).toBe(1);
    expect(snap.heatmap).toHaveLength(7);
    for (const day of snap.heatmap) expect(day.hours).toHaveLength(24);
    expect(snap.heatmap[6].hours[new Date().getHours()]).toBe(1); // last heatmap day is today
    expect(snap.daily14).toHaveLength(14);
    expect(snap.daily14[13].inbound).toBe(1);
    expect(snap.topUsers.length).toBeGreaterThanOrEqual(1);
    expect(snap.topUsers[0].count).toBe(1);
  });

  test("active users last7d aggregates across days and channels", () => {
    const stats = new StatsCollector();
    const now = Date.now();
    stats.recordInbound(makeMsg("telegram", "u1"), now);
    stats.recordInbound(makeMsg("telegram", "u1"), now - 86_400_000); // yesterday, same human
    stats.recordInbound(makeMsg("zalo", "u2"), now);
    stats.recordInbound(makeMsg("zalo", "u1"), now); // same human, most recent channel becomes zalo
    const snap = stats.snapshot(now);
    expect(snap.activeUsers.last7d).toBe(2);
    expect(snap.topUsers.find((u) => u.id === "u1")!.channel).toBe("zalo");
    expect(snap.topUsers.find((u) => u.id === "u1")!.count).toBe(3);
  });

  test("toJSON / hydrate round-trip preserves totals", () => {
    const stats = new StatsCollector();
    stats.recordInbound(makeMsg("mock", "u1"));
    stats.recordOutbound("mock");
    stats.recordError("mock");

    const restored = new StatsCollector();
    expect(restored.hydrate(JSON.parse(JSON.stringify(stats.toJSON())))).toBe(true);
    const snap = restored.snapshot();
    expect(snap.totals).toEqual({ inbound: 1, outbound: 1, errors: 1 });
    expect(snap.topUsers[0].name).toBe("User u1");
  });

  test("hydrate rejects unknown payloads", () => {
    expect(new StatsCollector().hydrate(null)).toBe(false);
    expect(new StatsCollector().hydrate({ version: 99 })).toBe(false);
    expect(new StatsCollector().hydrate("nope")).toBe(false);
  });

  test("prune drops buckets older than the retention window", () => {
    const stats = new StatsCollector({ retentionDays: 7 });
    const now = Date.now();
    stats.recordInbound(makeMsg("mock", "u1"), now - 30 * 86_400_000);
    stats.recordInbound(makeMsg("mock", "u1"), now);
    stats.prune(now);

    const json = stats.toJSON() as any;
    const days = json.daily.map((d: any) => d.date);
    expect(days).toHaveLength(1);
    expect(json.totals.inbound).toBe(2); // totals are cumulative, buckets are pruned
  });

  test("daily user cap prevents unbounded growth", () => {
    const stats = new StatsCollector({ maxUsersPerDay: 2 });
    for (let i = 0; i < 5; i++) stats.recordInbound(makeMsg("mock", `u${i}`));
    const json = stats.toJSON() as any;
    expect(json.daily[0].users).toHaveLength(2);
    expect(json.daily[0].overflow).toBe(3);
  });
});

describe("ChannelHub + StatsCollector", () => {
  test("inbound messages and outbound sends are counted", async () => {
    const stats = new StatsCollector();
    const hub = new ChannelHub({ stats });
    const ch = new FakeChannel("mock");
    hub.register(ch);

    ch.push(makeMsg("mock", "u1"));
    await new Promise((r) => setTimeout(r, 10));
    await ch.sendText("chat-1", "direct send");

    const snap = stats.snapshot();
    expect(snap.totals.inbound).toBe(1);
    expect(snap.totals.outbound).toBe(1);
    expect(snap.perChannel[0].channel).toBe("mock");
  });

  test("deduplicated retries are not double-counted", async () => {
    const stats = new StatsCollector();
    const hub = new ChannelHub({ stats, enableDeduplication: true });
    const ch = new FakeChannel("mock");
    hub.register(ch);

    const msg = makeMsg("mock", "u1");
    ch.push(msg);
    ch.push({ ...msg }); // same id — webhook retry
    await new Promise((r) => setTimeout(r, 10));

    expect(stats.snapshot().totals.inbound).toBe(1);
  });
});

describe("DashboardBridge", () => {
  function tmpFile(): string {
    return join(mkdtempSync(join(tmpdir(), "ch-dash-")), "stats.json");
  }

  test("serves page, health and stats API on an ephemeral port", async () => {
    const hub = new ChannelHub();
    const ch = new FakeChannel("mock");
    hub.register(ch);
    const bridge = new DashboardBridge(hub, { port: 0 });
    await bridge.start();

    try {
      const base = bridge.endpoint!;
      expect(base).toContain("127.0.0.1");

      const page = await fetch(`${base}/`).then((r) => r.text());
      expect(page).toContain("ChannelHub");
      expect(page).toContain("heatmap");

      const health = await fetch(`${base}/health`).then((r) => r.json());
      expect(health.ok).toBe(true);

      const stats = await fetch(`${base}/api/stats`).then((r) => r.json());
      expect(stats.totals.inbound).toBe(0);
      expect(stats.heatmap).toHaveLength(7);
      expect(stats.runtime.uptimeSec).toBeGreaterThanOrEqual(0);
    } finally {
      await bridge.stop();
    }
  });

  test("records live traffic through the hub it wraps", async () => {
    const hub = new ChannelHub();
    const ch = new FakeChannel("mock");
    hub.register(ch);
    const bridge = new DashboardBridge(hub, { port: 0 });
    await bridge.start();

    try {
      ch.push(makeMsg("mock", "u1"));
      await new Promise((r) => setTimeout(r, 10));
      const stats = await fetch(`${bridge.endpoint}/api/stats`).then((r) => r.json());
      expect(stats.totals.inbound).toBe(1);
      expect(stats.topUsers[0].id).toBe("u1");
      expect(stats.runtime.channels[0]).toEqual({ key: "mock:default", connected: false });
    } finally {
      await bridge.stop();
    }
  });

  test("requires a Bearer key when one is configured", async () => {
    const bridge = new DashboardBridge(new ChannelHub(), { port: 0, apiKey: "s3cret" });
    await bridge.start();
    try {
      const base = bridge.endpoint!;
      const page = await fetch(`${base}/`).then((r) => r.status);
      expect(page).toBe(200); // static page is public

      const noAuth = await fetch(`${base}/api/stats`);
      expect(noAuth.status).toBe(401);
      const wrongAuth = await fetch(`${base}/api/stats`, { headers: { Authorization: "Bearer wrong" } });
      expect(wrongAuth.status).toBe(401);
      const ok = await fetch(`${base}/api/stats`, { headers: { Authorization: "Bearer s3cret" } });
      expect(ok.status).toBe(200);
    } finally {
      await bridge.stop();
    }
  });

  test("fails closed when bound off loopback without a key", async () => {
    const bridge = new DashboardBridge(new ChannelHub(), { port: 0, host: "0.0.0.0" });
    await bridge.start();
    try {
      const addr = (bridge as any).server.address();
      const res = await fetch(`http://127.0.0.1:${addr.port}/api/stats`);
      expect(res.status).toBe(401);
    } finally {
      await bridge.stop();
    }
  });

  test("hub.dashboard() one-liner attaches, starts and serves", async () => {
    const hub = new ChannelHub();
    const bridge = await hub.dashboard({ port: 0 });
    try {
      expect(hub.stats).toBe(bridge.stats);
      const stats = await fetch(`${bridge.endpoint}/api/stats`).then((r) => r.json());
      expect(stats.totals.inbound).toBe(0);
      const page = await fetch(`${bridge.endpoint}/`).then((r) => r.status);
      expect(page).toBe(200);
    } finally {
      await bridge.stop();
    }
  });

  test("persists stats to dataFile and reloads them on restart", async () => {
    const file = tmpFile();
    const hub = new ChannelHub();
    const ch = new FakeChannel("mock");
    hub.register(ch);

    const first = new DashboardBridge(hub, { port: 0, dataFile: file });
    await first.start();
    ch.push(makeMsg("mock", "u1"));
    await new Promise((r) => setTimeout(r, 10));
    await first.stop(); // stop() flushes
    expect(existsSync(file)).toBe(true);

    const second = new DashboardBridge(new ChannelHub(), { port: 0, dataFile: file });
    expect(second.stats.snapshot().totals.inbound).toBe(1);

    rmSync(file, { force: true });
  });
});
