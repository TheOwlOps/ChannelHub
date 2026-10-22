import { describe, expect, test } from "bun:test";
import {
  broadcastMessage,
  renderTemplate,
  type BroadcastHubLike,
} from "../../src/core/engine/broadcast";
import type { IChannelAdapter, MediaPayload } from "../../src/core/contracts/types";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface RecordedCall {
  method: "text" | "media";
  chatId: string;
  text?: string;
  media?: MediaPayload;
}

interface FakeConfig {
  /** Fail this many sends (across both methods) before succeeding. */
  failTimes?: number;
  /** Fail every send. */
  alwaysFail?: boolean;
  delayMs?: number;
  errorMessage?: string;
  /** Shared in-flight tracker for concurrency assertions. */
  tracker?: { inFlight: number; maxInFlight: number };
}

function makeAdapter(cfg: FakeConfig = {}) {
  const calls: RecordedCall[] = [];
  let failuresLeft = cfg.failTimes ?? 0;
  let seq = 0;

  const gate = async (): Promise<void> => {
    if (cfg.tracker) {
      cfg.tracker.inFlight++;
      cfg.tracker.maxInFlight = Math.max(cfg.tracker.maxInFlight, cfg.tracker.inFlight);
    }
    try {
      if (cfg.delayMs) await sleep(cfg.delayMs);
      if (cfg.alwaysFail || failuresLeft > 0) {
        if (failuresLeft > 0) failuresLeft--;
        throw new Error(cfg.errorMessage ?? "send failed");
      }
    } finally {
      if (cfg.tracker) cfg.tracker.inFlight--;
    }
  };

  const adapter = {
    name: "fake",
    isConnected: () => true,
    connect: async () => {},
    disconnect: async () => {},
    on: () => adapter,
    sendText: async (chatId: string, text: string) => {
      calls.push({ method: "text", chatId, text });
      await gate();
      return { messageId: `m-${chatId}-${++seq}`, chatId, timestamp: Date.now() };
    },
    sendMedia: async (chatId: string, media: MediaPayload) => {
      calls.push({ method: "media", chatId, media });
      await gate();
      return { messageId: `m-${chatId}-${++seq}`, chatId, timestamp: Date.now() };
    },
  };

  return { adapter: adapter as unknown as IChannelAdapter, calls };
}

function makeHub(map: Record<string, IChannelAdapter>): BroadcastHubLike {
  return { getChannel: (name: string) => map[name] };
}

describe("renderTemplate", () => {
  test("replaces placeholders, allowing spaces inside braces", () => {
    expect(renderTemplate("Hi {{name}}!", { name: "An" })).toBe("Hi An!");
    expect(renderTemplate("Hi {{ name }}!", { name: "An" })).toBe("Hi An!");
    expect(renderTemplate("{{a}}-{{b}}-{{a}}", { a: "1", b: "2" })).toBe("1-2-1");
  });

  test("leaves unknown placeholders unchanged", () => {
    expect(renderTemplate("Hi {{missing}}", {})).toBe("Hi {{missing}}");
    expect(renderTemplate("Hi {{ missing }}", { other: "x" })).toBe("Hi {{ missing }}");
  });

  test("returns templates without placeholders untouched", () => {
    expect(renderTemplate("plain text", { a: "1" })).toBe("plain text");
    expect(renderTemplate("", { a: "1" })).toBe("");
  });
});

describe("broadcastMessage", () => {
  test("all-success: report counts, messageIds and order", async () => {
    const tg = makeAdapter();
    const zl = makeAdapter();
    const hub = makeHub({ telegram: tg.adapter, zalo: zl.adapter });

    const report = await broadcastMessage(
      hub,
      [
        { channel: "telegram", chatId: "c-1" },
        { channel: "zalo", chatId: "c-2" },
        { channel: "telegram", chatId: "c-3" },
      ],
      { text: "hello" },
      { retry: false },
    );

    expect(report.total).toBe(3);
    expect(report.sent).toBe(3);
    expect(report.failed).toBe(0);
    expect(report.durationMs).toBeGreaterThanOrEqual(0);
    expect(report.results.map((r) => r.chatId)).toEqual(["c-1", "c-2", "c-3"]);
    for (const r of report.results) {
      expect(r.ok).toBe(true);
      expect(r.messageId).toBeTruthy();
      expect(r.attempts).toBe(1);
      expect(r.error).toBeUndefined();
    }
    expect(tg.calls).toHaveLength(2);
    expect(zl.calls).toHaveLength(1);
  });

  test("renders template with per-target vars plus built-in channel/chatId", async () => {
    const tg = makeAdapter();
    const hub = makeHub({ telegram: tg.adapter });

    await broadcastMessage(
      hub,
      [{ channel: "telegram", chatId: "c-42", vars: { name: "An" } }],
      { text: "Hi {{name}}, welcome to {{channel}} chat {{ chatId }}" },
      { retry: false },
    );

    expect(tg.calls).toHaveLength(1);
    expect(tg.calls[0].text).toBe("Hi An, welcome to telegram chat c-42");
  });

  test("adapter that fails twice succeeds via retry with attempts = 3", async () => {
    const flaky = makeAdapter({ failTimes: 2 });
    const hub = makeHub({ telegram: flaky.adapter });

    // Tiny backoff keeps the test fast; retries: 3 matches the withRetry default.
    const report = await broadcastMessage(
      hub,
      [{ channel: "telegram", chatId: "c-1" }],
      { text: "hello" },
      { retry: { retries: 3, baseDelayMs: 1, jitter: false } },
    );

    expect(report.sent).toBe(1);
    expect(report.results[0].ok).toBe(true);
    expect(report.results[0].attempts).toBe(3);
  });

  test("adapter that always fails exhausts retry; other targets still succeed", async () => {
    const bad = makeAdapter({ alwaysFail: true, errorMessage: "telegram down" });
    const good = makeAdapter();
    const hub = makeHub({ telegram: good.adapter, discord: bad.adapter });

    const report = await broadcastMessage(
      hub,
      [
        { channel: "discord", chatId: "c-bad" },
        { channel: "telegram", chatId: "c-good" },
      ],
      { text: "hello" },
      { retry: { retries: 3, baseDelayMs: 1, jitter: false } },
    );

    expect(report.total).toBe(2);
    expect(report.sent).toBe(1);
    expect(report.failed).toBe(1);

    const failed = report.results[0];
    expect(failed.ok).toBe(false);
    expect(failed.error).toContain("telegram down");
    expect(failed.attempts).toBeGreaterThan(1); // retries actually happened
    expect(failed.messageId).toBeUndefined();

    expect(report.results[1].ok).toBe(true);
  });

  test("retry: false means exactly one attempt", async () => {
    const bad = makeAdapter({ alwaysFail: true });
    const hub = makeHub({ telegram: bad.adapter });

    const report = await broadcastMessage(
      hub,
      [{ channel: "telegram", chatId: "c-1" }],
      { text: "hello" },
      { retry: false },
    );

    expect(report.results[0].ok).toBe(false);
    expect(report.results[0].attempts).toBe(1);
  });

  test("missing channel produces a failed item with attempts 0", async () => {
    const tg = makeAdapter();
    const hub = makeHub({ telegram: tg.adapter });

    const report = await broadcastMessage(
      hub,
      [
        { channel: "myspace", chatId: "c-x" },
        { channel: "telegram", chatId: "c-1" },
      ],
      { text: "hello" },
      { retry: false },
    );

    const missing = report.results[0];
    expect(missing.ok).toBe(false);
    expect(missing.attempts).toBe(0);
    expect(missing.error).toContain("myspace");
    expect(report.results[1].ok).toBe(true);
    expect(report.sent).toBe(1);
    expect(report.failed).toBe(1);
  });

  test("results keep target order even when adapters finish out of order", async () => {
    const slow = makeAdapter({ delayMs: 30 });
    const fast = makeAdapter({ delayMs: 0 });
    const mid = makeAdapter({ delayMs: 10 });
    const hub = makeHub({ slow: slow.adapter, fast: fast.adapter, mid: mid.adapter });

    const report = await broadcastMessage(
      hub,
      [
        { channel: "slow", chatId: "c-slow" },
        { channel: "fast", chatId: "c-fast" },
        { channel: "mid", chatId: "c-mid" },
      ],
      { text: "hello" },
      { retry: false, concurrency: 3 },
    );

    expect(report.results.map((r) => r.channel)).toEqual(["slow", "fast", "mid"]);
    expect(report.sent).toBe(3);
  });

  test("concurrency cap is respected", async () => {
    const tracker = { inFlight: 0, maxInFlight: 0 };
    const a = makeAdapter({ delayMs: 10, tracker });
    const hub = makeHub({ telegram: a.adapter });
    const targets = Array.from({ length: 6 }, (_, i) => ({
      channel: "telegram",
      chatId: `c-${i}`,
    }));

    const report = await broadcastMessage(hub, targets, { text: "hi" }, {
      retry: false,
      concurrency: 2,
    });

    expect(report.sent).toBe(6);
    expect(tracker.maxInFlight).toBeLessThanOrEqual(2);
  });

  test("text + media: rendered text becomes the media caption, no separate text send", async () => {
    const tg = makeAdapter();
    const hub = makeHub({ telegram: tg.adapter });

    const report = await broadcastMessage(
      hub,
      [{ channel: "telegram", chatId: "c-1", vars: { name: "An" } }],
      {
        text: "Photo for {{name}}",
        media: { type: "image", source: "https://example.com/p.png" },
      },
      { retry: false },
    );

    expect(report.sent).toBe(1);
    expect(tg.calls).toHaveLength(1);
    expect(tg.calls[0].method).toBe("media");
    expect(tg.calls[0].media?.caption).toBe("Photo for An");
  });

  test("media with its own caption keeps it", async () => {
    const tg = makeAdapter();
    const hub = makeHub({ telegram: tg.adapter });

    await broadcastMessage(
      hub,
      [{ channel: "telegram", chatId: "c-1" }],
      {
        text: "ignored as caption",
        media: { type: "image", source: "https://example.com/p.png", caption: "original" },
      },
      { retry: false },
    );

    expect(tg.calls[0].media?.caption).toBe("original");
  });

  test("media-only content sends media without caption", async () => {
    const tg = makeAdapter();
    const hub = makeHub({ telegram: tg.adapter });

    const report = await broadcastMessage(
      hub,
      [{ channel: "telegram", chatId: "c-1" }],
      { media: { type: "file", source: "https://example.com/f.pdf" } },
      { retry: false },
    );

    expect(report.sent).toBe(1);
    expect(tg.calls[0].method).toBe("media");
    expect(tg.calls[0].media?.caption).toBeUndefined();
  });

  test("throws when content has neither text nor media", async () => {
    const hub = makeHub({});
    await expect(
      broadcastMessage(hub, [{ channel: "telegram", chatId: "c-1" }], {}),
    ).rejects.toThrow();
  });
});
