import { describe, expect, test } from "bun:test";
import { SessionStore } from "../../src/core/engine/session";

/** Controllable fake clock: starts at t=0, advanced manually. */
function fakeClock(start = 0) {
  let t = start;
  return {
    now: () => t,
    advance: (ms: number) => {
      t += ms;
    },
  };
}

const TTL = 10_000;

function storeWith(clock: { now: () => number }, extra: object = {}) {
  return new SessionStore({ ttlMs: TTL, now: clock.now, ...extra });
}

describe("SessionStore", () => {
  test("keyFor composes channel and chatId", () => {
    expect(SessionStore.keyFor("telegram", "42")).toBe("telegram:42");
  });

  test("getOrCreate creates a fresh session with defaults", () => {
    const clock = fakeClock(1_000);
    const store = storeWith(clock);
    const s = store.getOrCreate("telegram", "42");
    expect(s.key).toBe("telegram:42");
    expect(s.channel).toBe("telegram");
    expect(s.chatId).toBe("42");
    expect(s.state).toEqual({});
    expect(s.history).toEqual([]);
    expect(s.createdAt).toBe(1_000);
    expect(s.updatedAt).toBe(1_000);
    expect(s.expiresAt).toBe(1_000 + TTL);
    expect(store.size).toBe(1);
    // second call returns the same live session, no duplicate
    expect(store.getOrCreate("telegram", "42")).toBe(s);
    expect(store.size).toBe(1);
  });

  test("get returns undefined for unknown chats and never creates", () => {
    const store = storeWith(fakeClock());
    expect(store.get("telegram", "nope")).toBeUndefined();
    expect(store.size).toBe(0);
  });

  test("state kv roundtrip via setState/getState", () => {
    const store = storeWith(fakeClock());
    store.setState("zalo", "7", "step", "awaiting_address");
    store.setState("zalo", "7", "attempts", 2);
    expect(store.getState<string>("zalo", "7", "step")).toBe("awaiting_address");
    expect(store.getState<number>("zalo", "7", "attempts")).toBe(2);
    expect(store.getState("zalo", "7", "missing")).toBeUndefined();
    // setState created exactly one session
    expect(store.size).toBe(1);
    // overwrite works
    store.setState("zalo", "7", "step", "done");
    expect(store.getState<string>("zalo", "7", "step")).toBe("done");
    // state does not leak across chats
    expect(store.getState("zalo", "8", "step")).toBeUndefined();
  });

  test("pushHistory appends messages, stamps at, returns session", () => {
    const clock = fakeClock(500);
    const store = storeWith(clock);
    store.pushHistory("telegram", "42", { role: "user", text: "hi", senderId: "u1" });
    clock.advance(100);
    const s = store.pushHistory("telegram", "42", { role: "assistant", text: "hello!" });
    expect(s.history).toHaveLength(2);
    expect(s.history[0]).toEqual({ role: "user", text: "hi", senderId: "u1", at: 500 });
    expect(s.history[1]).toEqual({ role: "assistant", text: "hello!", at: 600 });

    // explicit at is respected
    store.pushHistory("telegram", "42", { role: "system", text: "note", at: 123 });
    expect(store.history("telegram", "42")[2].at).toBe(123);
  });

  test("history is trimmed to the last maxHistory entries", () => {
    const store = storeWith(fakeClock(), { maxHistory: 3 });
    for (let i = 1; i <= 5; i++) {
      store.pushHistory("telegram", "42", { role: "user", text: `m${i}` });
    }
    const history = store.history("telegram", "42");
    expect(history.map((m) => m.text)).toEqual(["m3", "m4", "m5"]);
  });

  test("history returns a copy and [] for unknown chats", () => {
    const store = storeWith(fakeClock());
    expect(store.history("telegram", "nope")).toEqual([]);
    store.pushHistory("telegram", "42", { role: "user", text: "hi" });
    const copy = store.history("telegram", "42");
    copy.push({ role: "user", text: "injected", at: 0 });
    expect(store.history("telegram", "42")).toHaveLength(1);
  });

  test("TTL expiry: get returns undefined and getOrCreate recreates fresh", () => {
    const clock = fakeClock();
    const store = storeWith(clock);
    const s = store.getOrCreate("telegram", "42");
    store.setState("telegram", "42", "step", "mid-flow");
    store.pushHistory("telegram", "42", { role: "user", text: "hi" });

    clock.advance(TTL + 1);
    expect(store.get("telegram", "42")).toBeUndefined();
    expect(store.size).toBe(0); // expired session was purged on access

    const fresh = store.getOrCreate("telegram", "42");
    expect(fresh).not.toBe(s);
    expect(fresh.state).toEqual({});
    expect(fresh.history).toEqual([]);
    expect(fresh.createdAt).toBe(TTL + 1);
  });

  test("sliding expiry: access before the TTL keeps the session alive", () => {
    const clock = fakeClock();
    const store = storeWith(clock);
    store.getOrCreate("telegram", "42");

    // touch every TTL-1 ms, several times past the original expiry
    for (let i = 0; i < 5; i++) {
      clock.advance(TTL - 1);
      expect(store.get("telegram", "42")).toBeDefined();
    }
    // total elapsed is now ~5 * TTL, far beyond the original expiresAt,
    // yet the session survived because each access slid the expiry.
    clock.advance(TTL + 1); // stop touching -> it finally expires
    expect(store.get("telegram", "42")).toBeUndefined();
  });

  test("sweep purges only expired sessions and returns the count", () => {
    const clock = fakeClock();
    const store = storeWith(clock);
    store.getOrCreate("telegram", "old-1");
    store.getOrCreate("telegram", "old-2");
    clock.advance(TTL + 1);
    store.getOrCreate("telegram", "fresh"); // created after the advance
    expect(store.sweep()).toBe(2);
    expect(store.size).toBe(1);
    expect(store.get("telegram", "fresh")).toBeDefined();
    expect(store.sweep()).toBe(0); // nothing left to purge
  });

  test("clear removes a session and reports whether one existed", () => {
    const store = storeWith(fakeClock());
    store.getOrCreate("telegram", "42");
    expect(store.clear("telegram", "42")).toBe(true);
    expect(store.get("telegram", "42")).toBeUndefined();
    expect(store.clear("telegram", "42")).toBe(false);
    expect(store.size).toBe(0);
  });

  test("default options: 30-minute TTL and 50-message history cap", () => {
    const clock = fakeClock();
    const store = new SessionStore({ now: clock.now });
    const s = store.getOrCreate("telegram", "42");
    expect(s.expiresAt - s.createdAt).toBe(30 * 60_000);
    for (let i = 0; i < 55; i++) {
      store.pushHistory("telegram", "42", { role: "user", text: `m${i}` });
    }
    const history = store.history("telegram", "42");
    expect(history).toHaveLength(50);
    expect(history[0].text).toBe("m5");
  });
});
