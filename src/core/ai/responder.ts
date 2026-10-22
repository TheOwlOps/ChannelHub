/**
 * AiResponder — provider-agnostic AI auto-reply handler for ChannelHub.
 *
 * Turns any LLM backend (OpenAI, Anthropic, Gemini, a local model, …)
 * into a ready-to-register `hub.onMessage(...)` handler:
 *
 * - Conversation context is rebuilt from the chat's session history
 *   (`ctx.session.history`), so replies stay coherent across messages
 *   without the host app managing prompts by hand.
 * - Providers may answer with a plain string (sent via `ctx.reply`)
 *   or with an `AsyncIterable<string>` token stream (sent via
 *   `ctx.stream`, which progressively edits one message on the chat).
 * - An optional fallback provider is tried once when the primary
 *   fails; if both fail, a static `errorReply` can be sent instead
 *   of propagating the error into the hub's error handling.
 *
 * Zero dependencies: the provider contract is a single function.
 *
 * @example
 * const hub = new ChannelHub();
 * hub.onMessage(createAiResponder({
 *   systemPrompt: "You are a helpful support agent.",
 *   provider: {
 *     name: "openai",
 *     complete: async (messages) => (await openai.chat(messages)).text,
 *   },
 * }));
 */

import type { MessageContext } from "../contracts/context";

/** One message in the chat-completion style conversation given to a provider. */
export interface AiMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/**
 * What a provider may return: either the full reply text, or a stream
 * of text chunks (tokens) delivered progressively via `ctx.stream`.
 */
export type AiCompletion = string | AsyncIterable<string>;

/**
 * Minimal LLM backend contract. Implement `complete` with any model
 * or vendor SDK; ChannelHub never sees the vendor-specific types.
 */
export interface AiProvider {
  /** Human-readable provider name, for logs/diagnostics. */
  name?: string;
  /** Produces a completion for the given conversation. */
  complete: (messages: AiMessage[]) => Promise<AiCompletion>;
}

/** Options for {@link createAiResponder}. */
export interface AiResponderOptions {
  /** Primary provider, tried first for every message. */
  provider: AiProvider;
  /** Optional provider tried once when the primary throws. */
  fallbackProvider?: AiProvider;
  /** Optional system prompt, sent as the first message of every completion. */
  systemPrompt?: string;
  /**
   * Maximum number of session-history entries (user/assistant turns)
   * included as conversation context. Default: 20.
   */
  maxHistory?: number;
  /**
   * Static text sent via `ctx.reply` when every provider fails.
   * When omitted, the primary provider's error is rethrown instead,
   * so the hub's DLQ / error bus can handle it.
   */
  errorReply?: string;
  /**
   * Gate evaluated per message before any provider call. Return false
   * to skip the message entirely (e.g. only reply in DMs, or only when
   * the bot is mentioned).
   */
  onlyWhen?: (ctx: MessageContext) => boolean;
}

const DEFAULT_MAX_HISTORY = 20;

/** Runtime check for the streaming variant of {@link AiCompletion}. */
export function isAsyncIterable(x: unknown): x is AsyncIterable<string> {
  return (
    typeof x === "object" &&
    x !== null &&
    Symbol.asyncIterator in x &&
    typeof (x as { [Symbol.asyncIterator]: unknown })[Symbol.asyncIterator] === "function"
  );
}

/**
 * Builds the completion messages for one inbound message:
 * `[systemPrompt?, ...historyTurns]` where historyTurns are the
 * session's user/assistant entries (system entries skipped), trimmed
 * to the last `maxHistory`. When there is no usable history (no
 * session attached, or an empty one), the current message text is
 * used as a single user turn — when a session exists the hub has
 * already recorded the current message into history, so it must not
 * be appended again.
 */
function buildMessages(ctx: MessageContext, options: AiResponderOptions): AiMessage[] {
  const messages: AiMessage[] = [];
  if (options.systemPrompt) {
    messages.push({ role: "system", content: options.systemPrompt });
  }

  const maxHistory = options.maxHistory ?? DEFAULT_MAX_HISTORY;
  const history = ctx.session?.history ?? [];
  const turns: AiMessage[] = [];
  for (const entry of history) {
    if (entry.role === "system") continue;
    turns.push({ role: entry.role, content: entry.text });
  }

  if (turns.length > 0) {
    messages.push(...turns.slice(-maxHistory));
  } else {
    const text = ctx.message.content.text;
    if (text) messages.push({ role: "user", content: text });
  }
  return messages;
}

/**
 * Creates a message handler that auto-replies using an AI provider.
 * Register it like any other handler: `hub.onMessage(createAiResponder({ provider }))`.
 */
export function createAiResponder(
  options: AiResponderOptions,
): (ctx: MessageContext) => Promise<void> {
  return async (ctx: MessageContext): Promise<void> => {
    if (options.onlyWhen && !options.onlyWhen(ctx)) return;

    const messages = buildMessages(ctx, options);

    const deliver = async (provider: AiProvider): Promise<void> => {
      const completion = await provider.complete(messages);
      if (typeof completion === "string") {
        if (completion) await ctx.reply(completion);
      } else if (isAsyncIterable(completion)) {
        await ctx.stream(completion);
      } else {
        throw new TypeError(
          `AiProvider${provider.name ? ` "${provider.name}"` : ""} returned an unsupported completion: expected string or AsyncIterable<string>.`,
        );
      }
    };

    try {
      await deliver(options.provider);
      return;
    } catch (primaryError) {
      if (options.fallbackProvider) {
        try {
          await deliver(options.fallbackProvider);
          return;
        } catch {
          // Fallback failed too — fall through to errorReply / rethrow below.
        }
      }
      if (options.errorReply !== undefined) {
        await ctx.reply(options.errorReply);
        return;
      }
      throw primaryError;
    }
  };
}
