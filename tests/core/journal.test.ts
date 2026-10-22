import { describe, expect, test } from "bun:test";
import { MessageJournal, type JournalEntry } from "../../src/core/insights/journal";

function makeJournal(maxEntries?: number) {
  let t = 1_000;
  const journal = new MessageJournal({ maxEntries, now: () => t });
  return {
    journal,
    advance(ms = 10) {
      t += ms;
    },
  };
}

describe("MessageJournal", () => {
  test("record assigns incrementing ids from 1 and stamps at from the clock", () => {
    const { journal, advance } = makeJournal();
    const a = journal.record({ type: "inbound", channel: "zalo", chatId: "c1", text: "hi" });
    advance();
    const b = journal.record({ type: "outbound", channel: "zalo", chatId: "c1", text: "hello" });

    expect(a.id).toBe(1);
    expect(b.id).toBe(2);
    expect(a.at).toBe(1_000);
    expect(b.at).toBe(1_010);
    expect(journal.size).toBe(2);
  });

  test("record respects an explicit at override", () => {
    const { journal } = makeJournal();
    const e = journal.record({ type: "inbound", channel: "telegram", at: 42 });
    expect(e.at).toBe(42);
  });

  test("convenience methods set the right types and fields", () => {
    const { journal } = makeJournal();
    const inn = journal.inbound({ channel: "telegram", chatId: "c1", senderId: "u1", text: "yo" });
    const out = journal.outbound({ channel: "telegram", chatId: "c1", text: "hey" });
    const errObj = journal.error("telegram", new Error("boom"), "c1");
    const errStr = journal.error("zalo", "plain failure");

    expect(inn.type).toBe("inbound");
    expect(inn.senderId).toBe("u1");
    expect(out.type).toBe("outbound");
    expect(errObj.type).toBe("error");
    expect(errObj.error).toBe("boom");
    expect(errObj.chatId).toBe("c1");
    expect(errStr.error).toBe("plain failure");
    expect(errStr.chatId).toBeUndefined();
  });

  test("query filters by channel, chatId and type; all filters must match", () => {
    const { journal } = makeJournal();
    journal.inbound({ channel: "zalo", chatId: "c1", text: "a" });
    journal.inbound({ channel: "zalo", chatId: "c2", text: "b" });
    journal.outbound({ channel: "zalo", chatId: "c1", text: "c" });
    journal.inbound({ channel: "telegram", chatId: "c1", text: "d" });

    expect(journal.query({ channel: "zalo" }).map((e) => e.text)).toEqual(["c", "b", "a"]);
    expect(journal.query({ chatId: "c1" }).map((e) => e.text)).toEqual(["d", "c", "a"]);
    expect(journal.query({ type: "inbound" }).map((e) => e.text)).toEqual(["d", "b", "a"]);
    expect(journal.query({ channel: "zalo", chatId: "c1", type: "inbound" }).map((e) => e.text)).toEqual(["a"]);
    expect(journal.query({ channel: "discord" })).toEqual([]);
  });

  test("query returns newest first and respects limit (default 50)", () => {
    const { journal } = makeJournal();
    for (let i = 0; i < 5; i++) journal.inbound({ channel: "zalo", text: `m${i}` });

    expect(journal.query({ limit: 2 }).map((e) => e.text)).toEqual(["m4", "m3"]);
    expect(journal.recent(3).map((e) => e.text)).toEqual(["m4", "m3", "m2"]);
    expect(journal.recent().map((e) => e.text)).toEqual(["m4", "m3", "m2", "m1", "m0"]);
  });

  test("evicts oldest entries beyond maxEntries", () => {
    const { journal } = makeJournal(3);
    for (let i = 0; i < 5; i++) journal.inbound({ channel: "zalo", text: `m${i}` });

    expect(journal.size).toBe(3);
    expect(journal.recent(10).map((e) => e.text)).toEqual(["m4", "m3", "m2"]);
    expect(journal.recent(10).map((e) => e.id)).toEqual([5, 4, 3]);
  });

  test("default capacity retains 1000 entries", () => {
    const { journal } = makeJournal();
    for (let i = 0; i < 1005; i++) journal.inbound({ channel: "zalo", text: `m${i}` });
    expect(journal.size).toBe(1000);
    expect(journal.recent(1)[0].text).toBe("m1004");
  });

  test("summary counts by type and per channel", () => {
    const { journal } = makeJournal();
    journal.inbound({ channel: "zalo" });
    journal.inbound({ channel: "zalo" });
    journal.outbound({ channel: "zalo" });
    journal.inbound({ channel: "telegram" });
    journal.error("telegram", "x");

    expect(journal.summary()).toEqual({
      total: 5,
      inbound: 3,
      outbound: 1,
      errors: 1,
      perChannel: { zalo: 3, telegram: 2 },
    });
  });

  test("summary of an empty journal is all zeros", () => {
    const { journal } = makeJournal();
    expect(journal.summary()).toEqual({ total: 0, inbound: 0, outbound: 0, errors: 0, perChannel: {} });
  });

  test("toJSONL emits one parseable JSON entry per line, oldest to newest", () => {
    const { journal } = makeJournal();
    journal.inbound({ channel: "zalo", chatId: "c1", text: "first" });
    journal.error("zalo", new Error("second"));

    const lines = journal.toJSONL().split("\n");
    expect(lines.length).toBe(2);
    const parsed = lines.map((l) => JSON.parse(l) as JournalEntry);
    expect(parsed[0].text).toBe("first");
    expect(parsed[0].id).toBe(1);
    expect(parsed[1].error).toBe("second");
    expect(parsed[1].id).toBe(2);
  });

  test("toJSONL of an empty journal is an empty string", () => {
    const { journal } = makeJournal();
    expect(journal.toJSONL()).toBe("");
  });

  test("clear drops all entries and summary resets", () => {
    const { journal } = makeJournal();
    journal.inbound({ channel: "zalo" });
    journal.outbound({ channel: "zalo" });
    journal.clear();

    expect(journal.size).toBe(0);
    expect(journal.recent()).toEqual([]);
    expect(journal.summary().total).toBe(0);
    // ids continue from where they left off (monotonic audit trail)
    expect(journal.inbound({ channel: "zalo" }).id).toBe(3);
  });
});
