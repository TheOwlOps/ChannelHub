import { describe, expect, test } from "bun:test";
import { MessageScheduler, type ScheduledJob } from "../../src/core/reliability/scheduler";

/** Mutable fake clock: `now` is injected into the scheduler under test. */
function fakeClock(start = 1_000_000) {
  let t = start;
  return {
    now: () => t,
    advance(ms: number) {
      t += ms;
    },
    get t() {
      return t;
    },
  };
}

describe("MessageScheduler", () => {
  test("one-shot job fires via runDue and is removed", async () => {
    const clock = fakeClock();
    const sent: ScheduledJob[] = [];
    const scheduler = new MessageScheduler(async (job) => {
      sent.push(job);
    }, { now: clock.now });

    const job = scheduler.schedule({
      delayMs: 1_000,
      channel: "telegram",
      chatId: "chat-1",
      text: "hello later",
    });
    expect(job.at).toBe(1_000_000 + 1_000);
    expect(job.runs).toBe(0);
    expect(scheduler.size).toBe(1);

    // Not yet due
    expect(await scheduler.runDue()).toBe(0);
    expect(sent).toHaveLength(0);
    expect(scheduler.size).toBe(1);

    // Advance to the due time
    clock.advance(1_000);
    expect(await scheduler.runDue()).toBe(1);
    expect(sent).toHaveLength(1);
    expect(sent[0].text).toBe("hello later");
    expect(sent[0].channel).toBe("telegram");
    expect(sent[0].chatId).toBe("chat-1");

    // One-shot job is gone after firing
    expect(scheduler.size).toBe(0);
    expect(scheduler.get(job.id)).toBeUndefined();
  });

  test("not-yet-due job is not executed", async () => {
    const clock = fakeClock();
    const sent: string[] = [];
    const scheduler = new MessageScheduler(async (job) => {
      sent.push(job.text);
    }, { now: clock.now });

    scheduler.schedule({ at: clock.t + 60_000, channel: "zalo", chatId: "c1", text: "future" });
    clock.advance(59_999);

    expect(await scheduler.runDue()).toBe(0);
    expect(sent).toEqual([]);
    expect(scheduler.size).toBe(1);
  });

  test("job scheduled with a past `at` is immediately due", async () => {
    const clock = fakeClock();
    const sent: string[] = [];
    const scheduler = new MessageScheduler(async (job) => {
      sent.push(job.text);
    }, { now: clock.now });

    scheduler.schedule({ at: clock.t - 1, channel: "slack", chatId: "c9", text: "overdue" });
    expect(await scheduler.runDue()).toBe(1);
    expect(sent).toEqual(["overdue"]);
  });

  test("recurring job reschedules and runs again, runs count increments", async () => {
    const clock = fakeClock();
    const sentAt: number[] = [];
    const scheduler = new MessageScheduler(async () => {
      sentAt.push(clock.t);
    }, { now: clock.now });

    // No at/delayMs: first run lands one interval from now
    const job = scheduler.schedule({
      everyMs: 500,
      channel: "telegram",
      chatId: "chat-1",
      text: "tick",
    });
    expect(job.at).toBe(1_000_000 + 500);

    clock.advance(500);
    expect(await scheduler.runDue()).toBe(1);
    expect(scheduler.size).toBe(1); // recurring job stays registered
    expect(scheduler.get(job.id)?.runs).toBe(1);
    expect(scheduler.get(job.id)?.lastRunAt).toBe(1_000_500);
    expect(scheduler.get(job.id)?.at).toBe(1_001_000); // next slot

    clock.advance(500);
    expect(await scheduler.runDue()).toBe(1);
    expect(scheduler.get(job.id)?.runs).toBe(2);
    expect(sentAt).toEqual([1_000_500, 1_001_000]);
  });

  test("recurring job skips missed intervals instead of replaying them", async () => {
    const clock = fakeClock();
    let calls = 0;
    const scheduler = new MessageScheduler(async () => {
      calls++;
    }, { now: clock.now });

    const job = scheduler.schedule({
      everyMs: 500,
      channel: "discord",
      chatId: "c1",
      text: "ping",
    });
    const firstAt = job.at;

    // Jump 10 intervals past the first slot: the job fires exactly once
    // and lands on the next future slot aligned to its cadence.
    clock.advance(500 + 10 * 500);
    expect(await scheduler.runDue()).toBe(1);
    expect(calls).toBe(1);

    const next = scheduler.get(job.id);
    expect(next).toBeDefined();
    expect(next!.at).toBeGreaterThan(clock.t);
    expect((next!.at - firstAt) % 500).toBe(0);
  });

  test("cancel removes a job so it never fires", async () => {
    const clock = fakeClock();
    const sent: string[] = [];
    const scheduler = new MessageScheduler(async (job) => {
      sent.push(job.text);
    }, { now: clock.now });

    const a = scheduler.schedule({ delayMs: 100, channel: "telegram", chatId: "1", text: "a" });
    const b = scheduler.schedule({ delayMs: 100, channel: "telegram", chatId: "1", text: "b" });
    expect(scheduler.size).toBe(2);

    expect(scheduler.cancel(a.id)).toBe(true);
    expect(scheduler.cancel(a.id)).toBe(false); // already gone
    expect(scheduler.cancel("job_does_not_exist")).toBe(false);
    expect(scheduler.size).toBe(1);

    clock.advance(100);
    expect(await scheduler.runDue()).toBe(1);
    expect(sent).toEqual(["b"]);
    expect(b.text).toBe("b");
  });

  test("failing sendFn records lastError and does not block other due jobs", async () => {
    const clock = fakeClock();
    const sent: string[] = [];
    let shouldFail = true;
    const scheduler = new MessageScheduler(async (job) => {
      if (job.text === "explode" && shouldFail) {
        throw new Error("boom");
      }
      sent.push(job.text);
    }, { now: clock.now });

    // Recurring failing job (stays registered so lastError is inspectable)
    const bad = scheduler.schedule({
      at: clock.t + 100,
      everyMs: 1_000,
      channel: "telegram",
      chatId: "1",
      text: "explode",
    });
    // One-shot good job due at the same tick, ordered after the failing one
    scheduler.schedule({ at: clock.t + 100, channel: "telegram", chatId: "1", text: "fine" });

    clock.advance(100);
    const executed = await scheduler.runDue();
    expect(executed).toBe(2); // both attempted
    expect(sent).toEqual(["fine"]); // the failure did not block the other job

    const badAfter = scheduler.get(bad.id);
    expect(badAfter).toBeDefined();
    expect(badAfter!.lastError).toBe("boom");
    expect(badAfter!.runs).toBe(1);

    // Next run succeeds -> lastError is cleared
    shouldFail = false;
    clock.advance(1_000);
    expect(await scheduler.runDue()).toBe(1);
    expect(scheduler.get(bad.id)?.lastError).toBeUndefined();
    expect(sent).toEqual(["fine", "explode"]);
  });

  test("failed one-shot job is removed after its attempt", async () => {
    const clock = fakeClock();
    const scheduler = new MessageScheduler(async () => {
      throw new Error("nope");
    }, { now: clock.now });

    const job = scheduler.schedule({ delayMs: 10, channel: "email", chatId: "x", text: "once" });
    clock.advance(10);
    expect(await scheduler.runDue()).toBe(1); // attempted counts as executed
    expect(scheduler.size).toBe(0);
    expect(scheduler.get(job.id)).toBeUndefined();
  });

  test("list returns jobs sorted by `at` ascending, as copies", () => {
    const clock = fakeClock();
    const scheduler = new MessageScheduler(async () => {}, { now: clock.now });

    scheduler.schedule({ at: clock.t + 300, channel: "telegram", chatId: "1", text: "third" });
    scheduler.schedule({ at: clock.t + 100, channel: "telegram", chatId: "1", text: "first" });
    scheduler.schedule({ at: clock.t + 200, channel: "telegram", chatId: "1", text: "second" });

    const listed = scheduler.list();
    expect(listed.map((j) => j.text)).toEqual(["first", "second", "third"]);
    expect(listed.map((j) => j.at)).toEqual([clock.t + 100, clock.t + 200, clock.t + 300]);

    // Copies: mutating a listed job must not corrupt the stored record
    listed[0].text = "mutated";
    expect(scheduler.get(listed[0].id)?.text).toBe("first");
  });

  test("due jobs execute in time order", async () => {
    const clock = fakeClock();
    const order: string[] = [];
    const scheduler = new MessageScheduler(async (job) => {
      order.push(job.text);
    }, { now: clock.now });

    scheduler.schedule({ at: clock.t + 300, channel: "telegram", chatId: "1", text: "c" });
    scheduler.schedule({ at: clock.t + 100, channel: "telegram", chatId: "1", text: "a" });
    scheduler.schedule({ at: clock.t + 200, channel: "telegram", chatId: "1", text: "b" });

    clock.advance(300);
    expect(await scheduler.runDue()).toBe(3);
    expect(order).toEqual(["a", "b", "c"]);
  });

  test("schedule validation throws on empty text, channel, or chatId", () => {
    const scheduler = new MessageScheduler(async () => {});
    expect(() =>
      scheduler.schedule({ channel: "telegram", chatId: "1", text: "" }),
    ).toThrow();
    expect(() =>
      scheduler.schedule({ channel: "telegram", chatId: "1", text: "   " }),
    ).toThrow();
    expect(() =>
      scheduler.schedule({ channel: "", chatId: "1", text: "hi" }),
    ).toThrow();
    expect(() =>
      scheduler.schedule({ channel: "telegram", chatId: "", text: "hi" }),
    ).toThrow();
    expect(scheduler.size).toBe(0);
  });

  test("job ids are unique", () => {
    const scheduler = new MessageScheduler(async () => {});
    const ids = new Set<string>();
    for (let i = 0; i < 50; i++) {
      ids.add(scheduler.schedule({ channel: "telegram", chatId: "1", text: `m${i}` }).id);
    }
    expect(ids.size).toBe(50);
    expect(scheduler.size).toBe(50);
    scheduler.clear();
    expect(scheduler.size).toBe(0);
    expect(scheduler.list()).toEqual([]);
  });

  test("start/stop drives due jobs on a real timer (smoke)", async () => {
    const sent: string[] = [];
    const scheduler = new MessageScheduler(async (job) => {
      sent.push(job.text);
    }, { tickMs: 10 });

    scheduler.schedule({ delayMs: 0, channel: "telegram", chatId: "1", text: "now" });
    expect(scheduler.running).toBe(false);

    scheduler.start();
    scheduler.start(); // second call is a no-op
    expect(scheduler.running).toBe(true);

    await new Promise((resolve) => setTimeout(resolve, 35));
    scheduler.stop();

    expect(scheduler.running).toBe(false);
    expect(sent).toEqual(["now"]);
    expect(scheduler.size).toBe(0);
  });
});
