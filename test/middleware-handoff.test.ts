import { describe, expect, test, mock } from "bun:test";
import { ChannelHub } from "../src/core/hub";
import { HumanHandoffManager } from "../src/core/handoff";
import type { IChannelAdapter } from "../src/core/types";
import { EventEmitter } from "node:events";

class MockChannel extends EventEmitter implements IChannelAdapter {
  name = "mock" as any;
  capabilities = {} as any;
  async connect() {}
  async disconnect() {}
  async sendText() { return {} as any; }
  async sendMedia() { return {} as any; }
  emitMessage(msg: any) { this.emit("message", msg); }
}

describe("Middleware Pipeline & Human Handoff", () => {
  test("middlewares run sequentially and can alter context", async () => {
    const hub = new ChannelHub();
    const channel = new MockChannel();
    hub.register(channel);

    const order: string[] = [];

    hub.use(async (ctx, next) => {
      order.push("mw1_start");
      ctx.message.content.text += " altered";
      await next();
      order.push("mw1_end");
    });

    hub.use(async (ctx, next) => {
      order.push("mw2_start");
      await next();
      order.push("mw2_end");
    });

    hub.on("message", (ctx) => {
      order.push("handler");
      expect(ctx.message.content.text).toBe("hello altered");
    });

    channel.emitMessage({
      id: "1", channel: "mock", sender: { id: "u1" }, chat: { id: "c1", type: "dm" },
      content: { text: "hello" }, timestamp: Date.now()
    });

    // Need to yield microtask since dispatch is async
    await new Promise(r => setTimeout(r, 0));

    expect(order).toEqual(["mw1_start", "mw2_start", "handler", "mw2_end", "mw1_end"]);
  });

  test("middleware can short-circuit pipeline by not calling next()", async () => {
    const hub = new ChannelHub();
    const channel = new MockChannel();
    hub.register(channel);

    let handlerHit = false;

    hub.use(async (ctx, next) => {
      if (ctx.message.content.text === "block") {
        return; // Short circuit
      }
      await next();
    });

    hub.on("message", (ctx) => {
      handlerHit = true;
    });

    channel.emitMessage({
      id: "1", channel: "mock", sender: { id: "u1" }, chat: { id: "c1", type: "dm" },
      content: { text: "block" }, timestamp: Date.now()
    });

    await new Promise(r => setTimeout(r, 0));
    expect(handlerHit).toBe(false);
  });

  test("HumanHandoffManager blocks automated handlers when paused", async () => {
    const hub = new ChannelHub();
    const channel = new MockChannel();
    hub.register(channel);

    let handlerHit = false;
    let handoffEventHit = false;

    hub.on("handoff", (ctx) => {
      handoffEventHit = true;
    });

    hub.on("message", async (ctx) => {
      if (ctx.message.content.text === "help me") {
        ctx.handoff(); // Hand off to human
      }
      handlerHit = true;
    });

    // 1st message: triggers handoff
    channel.emitMessage({
      id: "1", channel: "mock", sender: { id: "u1" }, chat: { id: "c1", type: "dm" },
      content: { text: "help me" }, timestamp: Date.now()
    });
    await new Promise(r => setTimeout(r, 0));

    expect(handlerHit).toBe(true);
    expect(hub.handoff.isPaused("mock", "c1")).toBe(true);

    // 2nd message: should be blocked from handler
    handlerHit = false;
    channel.emitMessage({
      id: "2", channel: "mock", sender: { id: "u1" }, chat: { id: "c1", type: "dm" },
      content: { text: "hello again" }, timestamp: Date.now()
    });
    await new Promise(r => setTimeout(r, 0));

    expect(handlerHit).toBe(false);
    expect(handoffEventHit).toBe(true);

    // Unpause manually
    hub.handoff.resume("mock", "c1");
    expect(hub.handoff.isPaused("mock", "c1")).toBe(false);

    // 3rd message: should hit handler again
    channel.emitMessage({
      id: "3", channel: "mock", sender: { id: "u1" }, chat: { id: "c1", type: "dm" },
      content: { text: "I am back" }, timestamp: Date.now()
    });
    await new Promise(r => setTimeout(r, 0));
    expect(handlerHit).toBe(true);
  });
});
