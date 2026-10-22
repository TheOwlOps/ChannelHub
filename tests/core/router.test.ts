import { describe, expect, test } from "bun:test";
import {
  CommandRouter,
  parseCommand,
  type CommandHandler,
} from "../../src/core/engine/router";

/** Builds a minimal fake MessageContext (only the fields the router reads). */
function fakeCtx(
  text: string,
  opts: { channel?: string; chatType?: string } = {},
): any {
  const channel = opts.channel ?? "telegram";
  return {
    message: {
      id: "m1",
      channel,
      sender: { id: "u1", name: "Tester" },
      chat: { id: "c1", type: opts.chatType ?? "dm" },
      content: { text },
      raw: null,
      timestamp: Date.now(),
    },
    channel: { name: channel },
  };
}

describe("parseCommand", () => {
  test("parses a bare slash command", () => {
    expect(parseCommand("/ping")).toEqual({ name: "ping", args: [], rawArgs: "" });
  });

  test("supports the bang prefix by default", () => {
    expect(parseCommand("!ping")).toEqual({ name: "ping", args: [], rawArgs: "" });
  });

  test("trims surrounding whitespace", () => {
    expect(parseCommand("   /ping   ")?.name).toBe("ping");
  });

  test("lowercases the command name", () => {
    expect(parseCommand("/PING")?.name).toBe("ping");
  });

  test("strips an @BotName suffix from the name", () => {
    const parsed = parseCommand("/ping@MyBot x");
    expect(parsed?.name).toBe("ping");
    expect(parsed?.args).toEqual(["x"]);
  });

  test("splits simple whitespace-separated args", () => {
    const parsed = parseCommand("/echo hello world");
    expect(parsed?.args).toEqual(["hello", "world"]);
    expect(parsed?.rawArgs).toBe("hello world");
  });

  test("keeps double-quoted segments as single args", () => {
    const parsed = parseCommand('/say "hello world" again');
    expect(parsed?.args).toEqual(["hello world", "again"]);
    expect(parsed?.rawArgs).toBe('"hello world" again');
  });

  test("rawArgs preserves inner spacing but is trimmed", () => {
    expect(parseCommand("/echo   hello   world  ")?.rawArgs).toBe("hello   world");
  });

  test("honours custom prefixes", () => {
    expect(parseCommand(".ping", ["."])?.name).toBe("ping");
    expect(parseCommand("/ping", ["."])).toBeNull();
  });

  test("returns null for non-command text", () => {
    expect(parseCommand("hello")).toBeNull();
    expect(parseCommand("ping")).toBeNull();
  });

  test("returns null for empty or prefix-only text", () => {
    expect(parseCommand("")).toBeNull();
    expect(parseCommand("   ")).toBeNull();
    expect(parseCommand("/")).toBeNull();
  });
});

describe("CommandRouter — commands", () => {
  test("dispatches a registered command with args and rawArgs", async () => {
    const router = new CommandRouter();
    let seen: { args: string[]; rawArgs: string } | null = null;
    router.registerCommand("echo", (_ctx, args, rawArgs) => {
      seen = { args, rawArgs };
    });

    const handled = await router.dispatch(fakeCtx("/echo hello world"));
    expect(handled).toBe(true);
    expect(seen).toEqual({ args: ["hello", "world"], rawArgs: "hello world" });
  });

  test("dispatches via an alias", async () => {
    const router = new CommandRouter();
    let calls = 0;
    router.registerCommand("ping", () => { calls++; }, { aliases: ["p"] });

    expect(await router.dispatch(fakeCtx("/p"))).toBe(true);
    expect(calls).toBe(1);
  });

  test("command registration is chainable and names are lowercased", async () => {
    const router = new CommandRouter();
    let calls = 0;
    const returned = router.registerCommand("PING", () => { calls++; });
    expect(returned).toBe(router);
    expect(await router.dispatch(fakeCtx("/ping"))).toBe(true);
    expect(calls).toBe(1);
  });

  test("listCommands reports names, aliases and descriptions", () => {
    const router = new CommandRouter();
    const noop: CommandHandler = () => {};
    router.registerCommand("ping", noop, { aliases: ["p"], description: "Health check" });
    router.registerCommand("echo", noop);

    expect(router.listCommands()).toEqual([
      { name: "ping", aliases: ["p"], description: "Health check" },
      { name: "echo", aliases: [], description: undefined },
    ]);
  });

  test("async command handlers are awaited", async () => {
    const router = new CommandRouter();
    let done = false;
    router.registerCommand("slow", async () => {
      await new Promise((r) => setTimeout(r, 5));
      done = true;
    });
    expect(await router.dispatch(fakeCtx("/slow"))).toBe(true);
    expect(done).toBe(true);
  });
});

describe("CommandRouter — routes", () => {
  test("unknown command falls through to a matching route", async () => {
    const router = new CommandRouter();
    router.registerCommand("ping", () => {});
    let routed = 0;
    router.addRoute({ pattern: "hello", handler: () => { routed++; } });

    const handled = await router.dispatch(fakeCtx("/unknowncmd hello there"));
    expect(handled).toBe(true);
    expect(routed).toBe(1);
  });

  test("matches a route by channel (single and list)", async () => {
    const router = new CommandRouter();
    let calls = 0;
    router.addRoute({ channel: "telegram", handler: () => { calls++; } });
    expect(await router.dispatch(fakeCtx("hi", { channel: "telegram" }))).toBe(true);
    expect(await router.dispatch(fakeCtx("hi", { channel: "discord" }))).toBe(false);
    expect(calls).toBe(1);

    const multi = new CommandRouter();
    multi.addRoute({ channel: ["discord", "slack"], handler: () => { calls++; } });
    expect(await multi.dispatch(fakeCtx("hi", { channel: "slack" }))).toBe(true);
    expect(await multi.dispatch(fakeCtx("hi", { channel: "telegram" }))).toBe(false);
  });

  test("matches a route by chatType", async () => {
    const router = new CommandRouter();
    let calls = 0;
    router.addRoute({ chatType: "group", handler: () => { calls++; } });
    expect(await router.dispatch(fakeCtx("hi", { chatType: "group" }))).toBe(true);
    expect(await router.dispatch(fakeCtx("hi", { chatType: "dm" }))).toBe(false);
    expect(calls).toBe(1);
  });

  test("string pattern is a case-insensitive substring match", async () => {
    const router = new CommandRouter();
    let calls = 0;
    router.addRoute({ pattern: "Invoice", handler: () => { calls++; } });
    expect(await router.dispatch(fakeCtx("here is your INVOICE #42"))).toBe(true);
    expect(await router.dispatch(fakeCtx("nothing relevant"))).toBe(false);
    expect(calls).toBe(1);
  });

  test("RegExp pattern is tested against the text", async () => {
    const router = new CommandRouter();
    let calls = 0;
    router.addRoute({ pattern: /^\d{6}$/, handler: () => { calls++; } });
    expect(await router.dispatch(fakeCtx("123456"))).toBe(true);
    expect(await router.dispatch(fakeCtx("12345"))).toBe(false);
    expect(calls).toBe(1);
  });

  test("predicate condition must pass", async () => {
    const router = new CommandRouter();
    let calls = 0;
    router.addRoute({
      predicate: (ctx) => ctx.message.sender.id === "admin",
      handler: () => { calls++; },
    });
    const adminCtx = fakeCtx("hi");
    adminCtx.message.sender.id = "admin";
    expect(await router.dispatch(adminCtx)).toBe(true);
    expect(await router.dispatch(fakeCtx("hi"))).toBe(false);
    expect(calls).toBe(1);
  });

  test("all specified conditions must pass together", async () => {
    const router = new CommandRouter();
    let calls = 0;
    router.addRoute({
      channel: "telegram",
      chatType: "group",
      pattern: "deploy",
      handler: () => { calls++; },
    });
    expect(await router.dispatch(fakeCtx("deploy now", { channel: "telegram", chatType: "group" }))).toBe(true);
    expect(await router.dispatch(fakeCtx("deploy now", { channel: "telegram", chatType: "dm" }))).toBe(false);
    expect(await router.dispatch(fakeCtx("deploy now", { channel: "discord", chatType: "group" }))).toBe(false);
    expect(await router.dispatch(fakeCtx("status", { channel: "telegram", chatType: "group" }))).toBe(false);
    expect(calls).toBe(1);
  });

  test("first matching route wins", async () => {
    const router = new CommandRouter();
    const order: string[] = [];
    router.addRoute({ pattern: "hello", handler: () => { order.push("first"); } });
    router.addRoute({ pattern: "hello", handler: () => { order.push("second"); } });

    expect(await router.dispatch(fakeCtx("say hello"))).toBe(true);
    expect(order).toEqual(["first"]);
  });

  test("routeCount reflects registered routes and addRoute is chainable", () => {
    const router = new CommandRouter();
    expect(router.routeCount).toBe(0);
    const returned = router.addRoute({ handler: () => {} });
    expect(returned).toBe(router);
    router.addRoute({ handler: () => {} });
    expect(router.routeCount).toBe(2);
  });

  test("returns false when nothing matches", async () => {
    const router = new CommandRouter();
    router.registerCommand("ping", () => {});
    router.addRoute({ pattern: "needle", handler: () => {} });

    expect(await router.dispatch(fakeCtx("just chatting"))).toBe(false);
    expect(await router.dispatch(fakeCtx("/notacommand"))).toBe(false);
  });
});
