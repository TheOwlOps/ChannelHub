import { describe, expect, test } from "bun:test";
import { FlowManager, type FlowDefinition } from "../../src/core/engine/flow";

/** Minimal fake MessageContext: mutable text, session bag, reply recorder. */
function makeCtx(text = "") {
  const sent: string[] = [];
  const ctx: any = {
    channel: { name: "zalo" },
    message: {
      id: "m1",
      channel: "zalo",
      sender: { id: "u1" },
      chat: { id: "c1", type: "dm" },
      content: { text },
      timestamp: Date.now(),
    },
    session: { state: {}, history: [] },
    reply: async (t: string) => {
      sent.push(t);
      return { messageId: `r${sent.length}`, chatId: "c1", timestamp: Date.now() };
    },
  };
  return { ctx, sent };
}

function registerFlow(extra?: Partial<FlowDefinition>): FlowDefinition {
  return {
    name: "register",
    steps: [
      { id: "name", prompt: "Tên của bạn?" },
      {
        id: "age",
        prompt: "Bạn bao nhiêu tuổi?",
        parse: (text) => Number(text),
        validate: (v) =>
          typeof v === "number" && Number.isFinite(v) && v > 0 ? true : "Tuổi phải là số dương",
      },
      { id: "city", prompt: (_ctx, data) => `Bạn tên ${data.name}, bạn ở đâu?` },
    ],
    ...extra,
  };
}

describe("FlowManager", () => {
  test("full 3-step flow: prompts advance, parse+validate applied, onComplete gets the data", async () => {
    const flows = new FlowManager();
    let completed: Record<string, unknown> | undefined;
    flows.define(
      registerFlow({
        onComplete: (_ctx, data) => {
          completed = data;
        },
      }),
    );

    const { ctx, sent } = makeCtx();
    expect(await flows.start(ctx, "register")).toBe(true);
    expect(sent).toEqual(["Tên của bạn?"]);
    expect(flows.active(ctx)).toMatchObject({ flow: "register", stepIndex: 0, data: {} });

    ctx.message.content.text = "An";
    expect(await flows.handle(ctx)).toBe(true);
    expect(sent).toEqual(["Tên của bạn?", "Bạn bao nhiêu tuổi?"]);
    expect(flows.active(ctx)?.stepIndex).toBe(1);

    ctx.message.content.text = "25";
    expect(await flows.handle(ctx)).toBe(true);
    // Prompt-as-function received the accumulated data (name = "An").
    expect(sent[2]).toBe("Bạn tên An, bạn ở đâu?");
    expect(flows.active(ctx)?.stepIndex).toBe(2);

    ctx.message.content.text = "Huế";
    expect(await flows.handle(ctx)).toBe(true);
    expect(completed).toEqual({ name: "An", age: 25, city: "Huế" });
    expect(typeof completed?.age).toBe("number"); // parse() was applied
    expect(flows.active(ctx)).toBeUndefined(); // state cleared on completion
    expect(ctx.session.state["__flow"]).toBeUndefined();
  });

  test("validation failure replies the error and stays on the same step", async () => {
    const flows = new FlowManager();
    flows.define(registerFlow());
    const { ctx, sent } = makeCtx();

    await flows.start(ctx, "register");
    ctx.message.content.text = "An";
    await flows.handle(ctx);
    expect(flows.active(ctx)?.stepIndex).toBe(1);

    ctx.message.content.text = "abc"; // Number("abc") is NaN → invalid
    expect(await flows.handle(ctx)).toBe(true);
    expect(sent[sent.length - 1]).toBe("Tuổi phải là số dương");
    expect(flows.active(ctx)?.stepIndex).toBe(1); // still on age step
    expect(flows.active(ctx)?.data).toEqual({ name: "An" }); // bad value not stored

    ctx.message.content.text = "30";
    expect(await flows.handle(ctx)).toBe(true);
    expect(flows.active(ctx)?.stepIndex).toBe(2);
    expect(flows.active(ctx)?.data).toEqual({ name: "An", age: 30 });
  });

  test("cancel keyword mid-flow calls onCancel with partial data and clears state", async () => {
    const flows = new FlowManager();
    let cancelledWith: Record<string, unknown> | undefined;
    flows.define(
      registerFlow({
        onCancel: (_ctx, data) => {
          cancelledWith = data;
        },
      }),
    );
    const { ctx } = makeCtx();

    await flows.start(ctx, "register");
    ctx.message.content.text = "An";
    await flows.handle(ctx);

    ctx.message.content.text = "  HỦY  "; // trimmed + case-insensitive
    expect(await flows.handle(ctx)).toBe(true);
    expect(cancelledWith).toEqual({ name: "An" });
    expect(flows.active(ctx)).toBeUndefined();
    expect(await flows.handle(ctx)).toBe(false); // nothing left to consume
  });

  test("custom cancelKeywords replace the defaults", async () => {
    const flows = new FlowManager();
    let cancelled = false;
    flows.define({
      name: "survey",
      cancelKeywords: ["stop"],
      steps: [{ id: "q1", prompt: "Câu 1?" }],
      onCancel: () => {
        cancelled = true;
      },
    });
    const { ctx } = makeCtx();

    await flows.start(ctx, "survey");
    ctx.message.content.text = "/cancel"; // default keyword no longer applies
    expect(await flows.handle(ctx)).toBe(true); // consumed as the q1 answer
    expect(cancelled).toBe(false);
    expect(flows.active(ctx)).toBeUndefined(); // single-step flow completed

    await flows.start(ctx, "survey");
    ctx.message.content.text = "STOP";
    expect(await flows.handle(ctx)).toBe(true);
    expect(cancelled).toBe(true);
  });

  test("start on unknown flow returns false and stores nothing", async () => {
    const flows = new FlowManager();
    flows.define(registerFlow());
    const { ctx, sent } = makeCtx();
    expect(await flows.start(ctx, "nope")).toBe(false);
    expect(sent).toEqual([]);
    expect(flows.active(ctx)).toBeUndefined();
  });

  test("handle with no active flow returns false", async () => {
    const flows = new FlowManager();
    flows.define(registerFlow());
    const { ctx } = makeCtx("hello");
    expect(await flows.handle(ctx)).toBe(false);
  });

  test("without a session, start/handle return false and active() is undefined", async () => {
    const flows = new FlowManager();
    flows.define(registerFlow());
    const { ctx } = makeCtx("hello");
    delete ctx.session;
    expect(await flows.start(ctx, "register")).toBe(false);
    expect(await flows.handle(ctx)).toBe(false);
    expect(flows.active(ctx)).toBeUndefined();
    expect(flows.cancel(ctx)).toBe(false);
  });

  test("cancel() clears an active flow without invoking onCancel", async () => {
    const flows = new FlowManager();
    let onCancelCalled = false;
    flows.define(
      registerFlow({
        onCancel: () => {
          onCancelCalled = true;
        },
      }),
    );
    const { ctx } = makeCtx();
    await flows.start(ctx, "register");
    expect(flows.cancel(ctx)).toBe(true);
    expect(flows.active(ctx)).toBeUndefined();
    expect(onCancelCalled).toBe(false);
    expect(flows.cancel(ctx)).toBe(false); // already cleared
  });

  test("define() throws on empty steps; listFlows/has reflect registrations", () => {
    const flows = new FlowManager();
    expect(() => flows.define({ name: "empty", steps: [] })).toThrow();
    flows.define(registerFlow());
    flows.define({ name: "survey", steps: [{ id: "q", prompt: "?" }] });
    expect(flows.listFlows()).toEqual(["register", "survey"]);
    expect(flows.has("register")).toBe(true);
    expect(flows.has("missing")).toBe(false);
  });
});
