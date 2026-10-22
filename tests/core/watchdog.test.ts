import { describe, expect, test } from "bun:test";
import {
  ConnectionWatchdog,
  type WatchableChannel,
  type WatchdogEvent,
} from "../../src/core/reliability/watchdog";

/** Flaky channel: connect() fails `failTimes` times, then succeeds and flips connected. */
class FlakyChannel implements WatchableChannel {
  connected = false;
  connectCalls = 0;
  private _failuresLeft: number;

  constructor(
    readonly name: string,
    failTimes = 0,
  ) {
    this._failuresLeft = failTimes;
  }

  isConnected(): boolean {
    return this.connected;
  }

  /** Make the next connect() calls fail again (simulates a fresh drop). */
  failNext(n: number): void {
    this._failuresLeft = n;
  }

  async connect(): Promise<void> {
    this.connectCalls++;
    if (this._failuresLeft > 0) {
      this._failuresLeft--;
      throw new Error(`dial ${this.name} refused (${this._failuresLeft} left)`);
    }
    this.connected = true;
  }
}

function fakeClock(start = 1_000_000) {
  let t = start;
  return {
    now: () => t,
    advance: (ms: number) => {
      t += ms;
    },
    get t() {
      return t;
    },
  };
}

describe("ConnectionWatchdog", () => {
  test("reconnects after failures, emitting reconnect_failed then reconnected in order", async () => {
    const clock = fakeClock();
    const ch = new FlakyChannel("zalo", 2);
    const events: WatchdogEvent[] = [];
    const wd = new ConnectionWatchdog(() => [ch], {
      now: clock.now,
      baseDelayMs: 100,
      maxDelayMs: 10_000,
      onEvent: (e) => events.push(e),
    });

    await wd.checkOnce(); // attempt 1 → fails
    expect(ch.connectCalls).toBe(1);

    clock.advance(100); // first backoff window (100ms)
    await wd.checkOnce(); // attempt 2 → fails
    expect(ch.connectCalls).toBe(2);

    clock.advance(200); // second backoff window (200ms)
    await wd.checkOnce(); // attempt 3 → succeeds
    expect(ch.connectCalls).toBe(3);
    expect(ch.isConnected()).toBe(true);

    expect(events.map((e) => e.type)).toEqual(["reconnect_failed", "reconnect_failed", "reconnected"]);
    expect(events[0].failures).toBe(1);
    expect(events[0].error).toContain("refused");
    expect(events[1].failures).toBe(2);
    expect(events[2].failures).toBe(0);
    expect(events.every((e) => e.channel === "zalo")).toBe(true);
  });

  test("no 'reconnected' event when the first-ever attempt succeeds (no prior failures)", async () => {
    const clock = fakeClock();
    const ch = new FlakyChannel("telegram", 0);
    const events: WatchdogEvent[] = [];
    const wd = new ConnectionWatchdog(() => [ch], { now: clock.now, onEvent: (e) => events.push(e) });

    await wd.checkOnce();
    expect(ch.isConnected()).toBe(true);
    expect(events).toEqual([]);
  });

  test("backoff window: disconnected channel is skipped until the clock passes nextAttemptAt", async () => {
    const clock = fakeClock();
    const ch = new FlakyChannel("slack", 99);
    const wd = new ConnectionWatchdog(() => [ch], { now: clock.now, baseDelayMs: 1_000 });

    await wd.checkOnce(); // fails → next attempt at t+1000
    expect(ch.connectCalls).toBe(1);

    await wd.checkOnce(); // same instant → skipped
    clock.advance(999);
    await wd.checkOnce(); // still inside window → skipped
    expect(ch.connectCalls).toBe(1);

    clock.advance(1); // exactly at nextAttemptAt → retried
    await wd.checkOnce();
    expect(ch.connectCalls).toBe(2);
  });

  test("nextAttemptAt grows exponentially and is capped at maxDelayMs", async () => {
    const clock = fakeClock(0);
    const ch = new FlakyChannel("discord", 99);
    const wd = new ConnectionWatchdog(() => [ch], {
      now: clock.now,
      baseDelayMs: 1_000,
      maxDelayMs: 5_000,
    });

    const expectedDelays = [1_000, 2_000, 4_000, 5_000, 5_000]; // 8000 and 16000 capped to 5000
    for (const delay of expectedDelays) {
      await wd.checkOnce();
      const st = wd.status()[0];
      expect(st.nextAttemptAt).toBe(clock.t + delay);
      clock.advance(delay); // step past the window for the next attempt
    }
    expect(wd.status()[0].failures).toBe(expectedDelays.length);
  });

  test("gives up after maxFailures, stops attempting, and reset() revives the channel", async () => {
    const clock = fakeClock();
    const ch = new FlakyChannel("tiktok", 99);
    const events: WatchdogEvent[] = [];
    const wd = new ConnectionWatchdog(() => [ch], {
      now: clock.now,
      baseDelayMs: 100,
      maxFailures: 3,
      onEvent: (e) => events.push(e),
    });

    for (let i = 0; i < 3; i++) {
      await wd.checkOnce();
      clock.advance(60_000); // jump far past any backoff window
    }
    expect(ch.connectCalls).toBe(3);
    expect(events.map((e) => e.type)).toEqual([
      "reconnect_failed",
      "reconnect_failed",
      "reconnect_failed",
      "gave_up",
    ]);
    expect(events[3].failures).toBe(3);

    await wd.checkOnce(); // gave up → no further attempts
    expect(ch.connectCalls).toBe(3);
    expect(wd.status()[0].gaveUp).toBe(true);

    wd.reset("tiktok");
    expect(wd.status()[0]).toEqual({
      channel: "tiktok",
      connected: false,
      failures: 0,
      nextAttemptAt: undefined,
      gaveUp: false,
    });

    await wd.checkOnce(); // attempts again after reset
    expect(ch.connectCalls).toBe(4);
  });

  test("status() reflects failures, nextAttemptAt and connected per channel", async () => {
    const clock = fakeClock(5_000);
    const down = new FlakyChannel("zalo", 99);
    const up = new FlakyChannel("telegram", 0);
    up.connected = true;
    const wd = new ConnectionWatchdog(() => [down, up], { now: clock.now, baseDelayMs: 500 });

    await wd.checkOnce();

    const byName = new Map(wd.status().map((s) => [s.channel, s]));
    expect(byName.get("zalo")).toEqual({
      channel: "zalo",
      connected: false,
      failures: 1,
      nextAttemptAt: 5_500,
      gaveUp: false,
    });
    expect(byName.get("telegram")).toEqual({
      channel: "telegram",
      connected: true,
      failures: 0,
      nextAttemptAt: undefined,
      gaveUp: false,
    });
  });

  test("connected channels are never touched (no connect calls)", async () => {
    const clock = fakeClock();
    const ch = new FlakyChannel("email", 0);
    ch.connected = true;
    const wd = new ConnectionWatchdog(() => [ch], { now: clock.now });

    await wd.checkOnce();
    await wd.checkOnce();
    expect(ch.connectCalls).toBe(0);
  });

  test("a channel that recovers on its own has its failure state reset by the next pass", async () => {
    const clock = fakeClock();
    const ch = new FlakyChannel("github", 99);
    const wd = new ConnectionWatchdog(() => [ch], { now: clock.now, baseDelayMs: 100 });

    await wd.checkOnce(); // fails once
    expect(wd.status()[0].failures).toBe(1);

    ch.connected = true; // external recovery
    await wd.checkOnce();
    const st = wd.status()[0];
    expect(st.failures).toBe(0);
    expect(st.nextAttemptAt).toBeUndefined();
  });

  test("multiple channels are handled independently in one pass", async () => {
    const clock = fakeClock();
    const a = new FlakyChannel("a", 0);
    const b = new FlakyChannel("b", 99);
    const wd = new ConnectionWatchdog(() => [a, b], { now: clock.now });

    await wd.checkOnce();
    expect(a.isConnected()).toBe(true);
    expect(b.isConnected()).toBe(false);
    expect(wd.status().map((s) => s.failures)).toEqual([0, 1]);
  });

  test("start/stop smoke: timer drives checkOnce and stop halts it", async () => {
    const ch = new FlakyChannel("smoke", 0);
    const wd = new ConnectionWatchdog(() => [ch], { intervalMs: 10 });

    expect(wd.running).toBe(false);
    wd.start();
    wd.start(); // double start is a no-op
    expect(wd.running).toBe(true);

    await new Promise((r) => setTimeout(r, 35));
    expect(ch.connectCalls).toBeGreaterThanOrEqual(1);
    expect(ch.isConnected()).toBe(true);

    wd.stop();
    expect(wd.running).toBe(false);
    const callsAtStop = ch.connectCalls;
    ch.connected = false; // drops again — nobody should reconnect it now
    await new Promise((r) => setTimeout(r, 35));
    expect(ch.connectCalls).toBe(callsAtStop);
  });
});
