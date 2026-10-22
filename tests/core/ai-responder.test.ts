import { describe, expect, test } from "bun:test";
import {
  createAiResponder,
  type AiMessage,
  type AiProvider,
} from "../../src/core/ai/responder";
import type { MessageContext } from "../../src/core/contracts/context";
import type { UnifiedMessage } from "../../src/core/contracts/types";
import type { SessionData, SessionMessage } from "../../src/core/engine/session";

// ---------- fakes ----------

interface SentLog {
  replies: string[];
  streamCalls: number;
  streamedTokens: string[];
}

function makeSession(history: SessionMessage[]): SessionData {
  return {
    key: "telegram:c1",
    channel: "telegram",
    chatId: "c1",
    state: {},
    history,
    createdAt: 0,
    updatedAt: 0,
    expiresAt: Number.MAX_SAFE_INTEGER,
  };
}

function hist(role: SessionMessage["role"], text: string): SessionMessage {
  return { role, text, at: 0 };
}

/** Minimal MessageContext double: records reply()/stream() calls. */
function fakeCtx(opts: { text?: string; history?: SessionMessage[]; noSession?: boolean } = {}) {
  const sent: SentLog = { replies: [], streamCalls: 0, streamedTokens: [] };
  const message: UnifiedMessage = {
    id: "m1",
    channel: "telegram",
    sender: { id: "u1" },
    chat: { id: "c1", type: "dm" },
    content: { text: opts.text ?? "hello" },
    raw: {},
    timestamp: 0,
  };
  const ctx = {
    message,
    channel: {},
    session: opts.noSession ? undefined : makeSession(opts.history ?? []),
    handoff: () => {},
    resume: () => false,
    reply: async (text: string) => {
      sent.replies.push(text);
      return { messageId: "r1", chatId: "c1", timestamp: 0 };
    },
    replyWithActions: async () => ({ messageId: "r1", chatId: "c1", timestamp: 0 }),
    replyMedia: async () => ({ messageId: "r1", chatId: "c1", timestamp: 0 }),
    react: async () => {},
    sendTyping: async () => {},
    stream: async (iterable: AsyncIterable<string>) => {
      sent.streamCalls++;
      for await (const token of iterable) sent.streamedTokens.push(token);
      return [];
    },
  } as unknown as MessageContext;
  return { ctx, sent };
}

/** Provider returning a fixed string and recording what it was given. */
function stringProvider(text: string) {
  const record = { calls: 0, messages: [] as AiMessage[] };
  const provider: AiProvider = {
    name: "fake-string",
    complete: async (messages) => {
      record.calls++;
      record.messages = messages;
      return text;
    },
  };
  return { provider, record };
}

/** Provider that always throws. */
function failingProvider(message: string) {
  const record = { calls: 0 };
  const provider: AiProvider = {
    name: "fake-fail",
    complete: async () => {
      record.calls++;
      throw new Error(message);
    },
  };
  return { provider, record };
}

async function* tokenStream(...parts: string[]): AsyncIterable<string> {
  for (const p of parts) yield p;
}

// ---------- tests ----------

describe("createAiResponder", () => {
  test("plain string completion is sent via ctx.reply", async () => {
    const { provider, record } = stringProvider("AI answer");
    const { ctx, sent } = fakeCtx({ history: [hist("user", "hello")] });
    await createAiResponder({ provider })(ctx);
    expect(record.calls).toBe(1);
    expect(sent.replies).toEqual(["AI answer"]);
    expect(sent.streamCalls).toBe(0);
  });

  test("messages are built from system prompt + history in order, system history skipped", async () => {
    const { provider, record } = stringProvider("ok");
    const { ctx } = fakeCtx({
      history: [
        hist("user", "first question"),
        hist("assistant", "first answer"),
        hist("system", "internal note"),
        hist("user", "second question"),
      ],
    });
    await createAiResponder({ provider, systemPrompt: "You are helpful." })(ctx);
    expect(record.messages).toEqual([
      { role: "system", content: "You are helpful." },
      { role: "user", content: "first question" },
      { role: "assistant", content: "first answer" },
      { role: "user", content: "second question" },
    ]);
  });

  test("history is trimmed to the last maxHistory entries", async () => {
    const { provider, record } = stringProvider("ok");
    const history = [
      hist("user", "u1"),
      hist("assistant", "a1"),
      hist("user", "u2"),
      hist("assistant", "a2"),
      hist("user", "u3"),
    ];
    const { ctx } = fakeCtx({ history });
    await createAiResponder({ provider, maxHistory: 2 })(ctx);
    expect(record.messages).toEqual([
      { role: "assistant", content: "a2" },
      { role: "user", content: "u3" },
    ]);
  });

  test("streaming completion is delivered via ctx.stream, not ctx.reply", async () => {
    const provider: AiProvider = {
      name: "fake-stream",
      complete: async () => tokenStream("Hel", "lo", "!"),
    };
    const { ctx, sent } = fakeCtx({ history: [hist("user", "hi")] });
    await createAiResponder({ provider })(ctx);
    expect(sent.streamCalls).toBe(1);
    expect(sent.streamedTokens).toEqual(["Hel", "lo", "!"]);
    expect(sent.replies).toEqual([]);
  });

  test("primary provider throwing falls back to the fallback provider", async () => {
    const primary = failingProvider("primary boom");
    const fallback = stringProvider("fallback answer");
    const { ctx, sent } = fakeCtx({ history: [hist("user", "hi")] });
    await createAiResponder({ provider: primary.provider, fallbackProvider: fallback.provider })(ctx);
    expect(primary.record.calls).toBe(1);
    expect(fallback.record.calls).toBe(1);
    expect(sent.replies).toEqual(["fallback answer"]);
  });

  test("both providers failing sends errorReply when configured", async () => {
    const primary = failingProvider("primary boom");
    const fallback = failingProvider("fallback boom");
    const { ctx, sent } = fakeCtx({ history: [hist("user", "hi")] });
    await createAiResponder({
      provider: primary.provider,
      fallbackProvider: fallback.provider,
      errorReply: "Sorry, something went wrong.",
    })(ctx);
    expect(sent.replies).toEqual(["Sorry, something went wrong."]);
  });

  test("both providers failing without errorReply rethrows the primary error", async () => {
    const primary = failingProvider("primary boom");
    const fallback = failingProvider("fallback boom");
    const { ctx } = fakeCtx({ history: [hist("user", "hi")] });
    const handler = createAiResponder({
      provider: primary.provider,
      fallbackProvider: fallback.provider,
    });
    await expect(handler(ctx)).rejects.toThrow("primary boom");
  });

  test("onlyWhen returning false skips the provider entirely", async () => {
    const { provider, record } = stringProvider("should not be sent");
    const { ctx, sent } = fakeCtx({ history: [hist("user", "hi")] });
    await createAiResponder({ provider, onlyWhen: () => false })(ctx);
    expect(record.calls).toBe(0);
    expect(sent.replies).toEqual([]);
    expect(sent.streamCalls).toBe(0);
  });

  test("without a session, the current message text is the single user turn", async () => {
    const { provider, record } = stringProvider("ok");
    const { ctx } = fakeCtx({ text: "just this message", noSession: true });
    await createAiResponder({ provider, systemPrompt: "Sys." })(ctx);
    expect(record.messages).toEqual([
      { role: "system", content: "Sys." },
      { role: "user", content: "just this message" },
    ]);
  });

  test("with an empty-history session, the current message text is used too", async () => {
    const { provider, record } = stringProvider("ok");
    const { ctx } = fakeCtx({ text: "fresh conversation", history: [] });
    await createAiResponder({ provider })(ctx);
    expect(record.messages).toEqual([{ role: "user", content: "fresh conversation" }]);
  });
});
