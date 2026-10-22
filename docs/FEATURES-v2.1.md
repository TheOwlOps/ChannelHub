# ChannelHub v2.1 — Feature Pack

Five new capabilities, all zero-dependency, all covered by tests (suite: 227 tests).

## 1. Conversation sessions — `ctx.session` / `hub.sessions`

Every chat gets a session: a free-form `state` bag + a rolling message history
(50 entries, sliding 30-minute TTL). Inbound messages and everything sent through
`ctx.reply` / `ctx.replyWithActions` / `ctx.replyMedia` are recorded automatically.

```ts
hub.onMessage(async (ctx) => {
  const count = (ctx.session?.state.count as number ?? 0) + 1;
  ctx.session && (ctx.session.state.count = count);
  await ctx.reply(`Tin nhắn thứ ${count} của bạn trong phiên này`);
});
```

Tune via `new ChannelHub({ sessionOptions: { ttlMs: 10 * 60_000, maxHistory: 100 } })`.

## 2. Commands & routes — `hub.command()` / `hub.route()`

```ts
hub.command("ping", async (ctx) => ctx.reply("pong"), { aliases: ["p"] });
hub.command("ban", async (ctx, args) => { /* args: string[] */ }, { description: "Ban a user" });

hub.route({ channel: "telegram", pattern: /giá|price/i, handler: priceHandler });
hub.route({ chatType: "group", predicate: (ctx) => ctx.message.content.text?.includes("?") ?? false, handler });
```

Commands (`/ping`, `!ping`, `/ping@BotName "quoted arg"`) and routes are dispatched
**before** generic `onMessage` handlers; if one handles the message, generic handlers
are skipped. Unknown commands fall through to routes, then to generic handlers.

## 3. Broadcast — `hub.broadcast()`

```ts
const report = await hub.broadcast(
  [
    { channel: "zalo", chatId: "g1", vars: { name: "An" } },
    { channel: "telegram", chatId: "g2", vars: { name: "Bình" } },
  ],
  { text: "Xin chào {{name}}, mai 9h họp nhé!" },
  { concurrency: 5 }, // sends are retried automatically (see withRetry)
);
// report: { total, sent, failed, durationMs, results: [{ channel, chatId, ok, messageId?, error?, attempts }] }
```

## 4. Scheduled messages — `hub.schedule()`

```ts
hub.schedule({ delayMs: 60_000, channel: "zalo", chatId: "c1", text: "Nhắc: hết 1 phút" });
const job = hub.schedule({ everyMs: 3_600_000, channel: "telegram", chatId: "c2", text: "Báo cáo giờ" });
hub.listScheduled();          // pending jobs, soonest first
hub.cancelScheduled(job.id);  // → true
```

The timer starts lazily on the first `schedule()` and is `unref`ed — it never keeps
your process alive. `hub.stop()` stops it. Recurring jobs skip missed intervals.

## 5. Retry with backoff — `withRetry()`

```ts
import { withRetry } from "@theowlops/channelhub/core";

await withRetry(() => flakyApiCall(), {
  retries: 3, baseDelayMs: 200, maxDelayMs: 5_000,
  shouldRetry: (err) => !(err as Error).message.includes("fatal"),
});
```

## MCP tools (38 total, +4)

| Tool | What it does |
|---|---|
| `channelhub_broadcast` | Broadcast text to `[{channel, chatId, vars?}]` targets |
| `channelhub_schedule_message` | Schedule one-shot (`delayMs`/`at`) or recurring (`everyMs`) messages |
| `channelhub_list_scheduled` | List pending scheduled jobs |
| `channelhub_cancel_scheduled` | Cancel a job by id |
