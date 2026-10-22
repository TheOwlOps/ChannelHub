import { describe, expect, test } from "bun:test";
import { DeadLetterStore } from "../../src/core/reliability/dead-letter-store";
import type { DeadLetterItem } from "../../src/core/reliability/dlq";
import type { UnifiedMessage } from "../../src/core/contracts/types";

let seq = 0;

/** Builds a DeadLetterItem for the given channel with a unique message id. */
function makeItem(channel: string): DeadLetterItem {
  seq++;
  const message: UnifiedMessage = {
    id: `msg-${seq}`,
    channel,
    sender: { id: "user-1", name: "Test User" },
    chat: { id: "chat-1", type: "dm" },
    content: { text: `message ${seq}` },
    raw: null,
    timestamp: 1_700_000_000_000 + seq,
  };
  return {
    message,
    error: new Error(`boom ${seq}`),
    timestamp: message.timestamp,
    retryCount: 0,
    channel,
  };
}

describe("DeadLetterStore", () => {
  test("add/list keeps insertion order and filters by channel", () => {
    const store = new DeadLetterStore();
    const a = makeItem("zalo");
    const b = makeItem("telegram");
    const c = makeItem("zalo");
    store.add(a);
    store.add(b);
    store.add(c);

    expect(store.size).toBe(3);
    expect(store.list()).toEqual([a, b, c]);
    expect(store.list({ channel: "zalo" })).toEqual([a, c]);
    expect(store.list({ channel: "telegram" })).toEqual([b]);
    expect(store.list({ channel: "discord" })).toEqual([]);

    // list() returns a copy — mutating it must not affect the store
    const copy = store.list();
    copy.pop();
    expect(store.size).toBe(3);
  });

  test("evicts oldest entries when size exceeds maxEntries", () => {
    const store = new DeadLetterStore({ maxEntries: 3 });
    const items = [makeItem("zalo"), makeItem("zalo"), makeItem("zalo"), makeItem("zalo"), makeItem("zalo")];
    for (const item of items) store.add(item);

    expect(store.size).toBe(3);
    // Only the three newest survive, still in insertion order
    expect(store.list()).toEqual(items.slice(2));
  });

  test("default capacity is 100 entries", () => {
    const store = new DeadLetterStore();
    const items: DeadLetterItem[] = [];
    for (let i = 0; i < 105; i++) {
      const item = makeItem("zalo");
      items.push(item);
      store.add(item);
    }
    expect(store.size).toBe(100);
    // The 5 oldest were evicted; the oldest survivor is the 6th item added
    expect(store.list()[0]).toBe(items[5]);
    expect(store.list()).toEqual(items.slice(5));
  });

  test("replay with all-successful handler drains the store", async () => {
    const store = new DeadLetterStore();
    const items = [makeItem("zalo"), makeItem("telegram"), makeItem("zalo")];
    for (const item of items) store.add(item);

    const seen: string[] = [];
    const result = await store.replay(async (item) => {
      seen.push(item.message.id);
    });

    expect(result).toEqual({ replayed: 3, failed: 0 });
    expect(seen).toEqual(items.map((i) => i.message.id)); // insertion order
    expect(store.size).toBe(0);
    expect(store.list()).toEqual([]);
  });

  test("replay partial failure keeps failed items, bumps retryCount, and continues", async () => {
    const store = new DeadLetterStore();
    const ok1 = makeItem("zalo");
    const bad = makeItem("telegram");
    const ok2 = makeItem("discord");
    store.add(ok1);
    store.add(bad);
    store.add(ok2);

    const attempted: string[] = [];
    const result = await store.replay((item) => {
      attempted.push(item.message.id);
      if (item === bad) throw new Error("still broken");
    });

    expect(result).toEqual({ replayed: 2, failed: 1 });
    // The failure did not stop the pass — ok2 was still attempted after bad
    expect(attempted).toEqual([ok1.message.id, bad.message.id, ok2.message.id]);
    // Only the failed item remains, with retryCount incremented
    expect(store.list()).toEqual([bad]);
    expect(bad.retryCount).toBe(1);
    expect(ok1.retryCount).toBe(0);

    // Replaying again bumps the same item's retryCount once more
    const again = await store.replay(() => {
      throw new Error("nope");
    });
    expect(again).toEqual({ replayed: 0, failed: 1 });
    expect(bad.retryCount).toBe(2);
    expect(store.size).toBe(1);
  });

  test("takeFailed returns all items and drains the store", () => {
    const store = new DeadLetterStore();
    const a = makeItem("zalo");
    const b = makeItem("telegram");
    store.add(a);
    store.add(b);

    const drained = store.takeFailed();
    expect(drained).toEqual([a, b]);
    expect(store.size).toBe(0);
    expect(store.list()).toEqual([]);
    expect(store.takeFailed()).toEqual([]); // draining an empty store is fine
  });

  test("clear removes all items", () => {
    const store = new DeadLetterStore();
    store.add(makeItem("zalo"));
    store.add(makeItem("zalo"));
    expect(store.size).toBe(2);

    store.clear();
    expect(store.size).toBe(0);
    expect(store.list()).toEqual([]);
  });
});
