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
/** Runtime check for the streaming variant of {@link AiCompletion}. */
export declare function isAsyncIterable(x: unknown): x is AsyncIterable<string>;
/**
 * Creates a message handler that auto-replies using an AI provider.
 * Register it like any other handler: `hub.onMessage(createAiResponder({ provider }))`.
 */
export declare function createAiResponder(options: AiResponderOptions): (ctx: MessageContext) => Promise<void>;
