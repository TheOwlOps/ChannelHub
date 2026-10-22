# ChannelHub v2.2 — Feature Pack 2

Five additions on top of v2.1: conversation **flows**, a provider-agnostic **AI
responder**, a persistent **dead letter store**, a **message journal**, and a
**connection watchdog**. All zero-dependency, all covered by tests, all wired
into the hub and the MCP bridge (42 tools total).

---

## 1. Conversation flows (wizard engine)

Multi-step question/answer dialogs whose state lives in the session, so they
survive across messages. While a flow is active in a chat it claims inbound
messages **before** commands, routes and generic handlers.

```ts
hub.defineFlow({
  name: "dangky",
  steps: [
    { id: "name", prompt: "Bạn tên gì?" },
    {
      id: "age",
      prompt: "Bạn bao nhiêu tuổi?",
      parse: (t) => Number(t),
      validate: (v) => (typeof v === "number" && v > 0) || "Tuổi không hợp lệ, nhập lại nhé",
    },
  ],
  onComplete: async (ctx, data) => ctx.reply(`Xong: ${data.name}, ${data.age} tuổi`),
});

// Start it from a command (or anywhere you have a ctx / the hub):
hub.command("dangky", (ctx) => hub.flows.start(ctx, "dangky"));
```

- `prompt` may be a function of `(ctx, collectedData)` for dynamic questions.
- `validate` returns `true` or an error message that is sent back while the
  user stays on the same step.
- Typing `/cancel` (default keywords: `/cancel`, `cancel`, `hủy`, `huỷ`,
  overridable per flow) aborts and calls `onCancel`.
- Programmatic access: `hub.flows.start(ctx, name)`, `hub.flows.active(ctx)`,
  `hub.flows.cancel(ctx)`, `hub.flows.listFlows()`.

## 2. AI responder

A ready-made message handler that answers with any LLM provider you plug in —
no SDK dependency, the provider is just a function.

```ts
import { createAiResponder } from "@theowlops/channelhub";

hub.onMessage(createAiResponder({
  systemPrompt: "Bạn là trợ lý hỗ trợ khách hàng.",
  provider: {
    name: "my-llm",
    complete: async (messages) => myLlm.chat(messages), // string or AsyncIterable<string>
  },
  fallbackProvider: backupProvider, // optional, tried once on failure
  errorReply: "Xin lỗi, hệ thống đang bận.", // optional friendly failure message
  maxHistory: 20, // session turns sent as context (default 20)
}));
```

- Conversation context comes from the session history (v2.1), so the model
  sees the ongoing dialog.
- Streaming providers (returning `AsyncIterable<string>`) are delivered via
  `ctx.stream()` automatically.
- Without `errorReply`, provider errors are rethrown so the hub's dead letter
  handling can capture them.

## 3. Dead letter store + replay

Previously the hub only *called* `onDeadLetter`. Now failures can be persisted
in a bounded store and replayed after you fix the bug:

```ts
const hub = new ChannelHub({ deadLetterStore: true }); // or { maxEntries: 500 }

hub.deadLetters();              // inspect captured failures
await hub.replayDeadLetters();  // → { replayed, failed }
```

Replay re-runs each stored message through the generic handlers (middlewares
and the command router are skipped); successes are removed, failures stay with
an incremented `retryCount`. The `onDeadLetter` callback still fires as before
— the store is additive.

> Bug fix included in this release: `OmniBus.emitError()` threw when no
> `error` listener was registered (Node EventEmitter semantics), which crashed
> the pipeline's catch block *before* dead letter handling could run. It now
> no-ops safely with zero listeners.

## 4. Message journal

An always-on, bounded (default 1000 entries) audit log of everything the hub
sees and sends:

```ts
hub.journal.query({ channel: "zalo", type: "error", limit: 20 });
hub.journal.summary(); // { total, inbound, outbound, errors, perChannel }
hub.journal.toJSONL(); // export, oldest → newest
```

Inbound messages, successful outbound sends (via the same instrumentation as
the stats collector) and pipeline errors are recorded automatically.

## 5. Connection watchdog

Channels that drop are reconnected automatically with exponential backoff:

```ts
const hub = new ChannelHub({
  watchdog: { intervalMs: 30_000, baseDelayMs: 1_000, maxDelayMs: 60_000, maxFailures: 0 },
});
hub.startWatchdog(); // hub.stop() stops it too
hub.watchdog.status(); // per-channel { connected, failures, nextAttemptAt, gaveUp }
```

Events (`reconnected`, `reconnect_failed`, `gave_up`) are delivered through
the watchdog `onEvent` option. `maxFailures: 0` means retry forever.

## Hub health + MCP

```ts
hub.health();
// { channels: [{ key, connected }], scheduledJobs, deadLetters, journal: {...} }
```

New MCP tools (42 total): `channelhub_dead_letters`,
`channelhub_replay_dead_letters`, `channelhub_journal_recent`,
`channelhub_health`.
