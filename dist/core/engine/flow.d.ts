/**
 * FlowManager — multi-step conversation ("wizard") engine.
 *
 * A flow is an ordered list of steps. Each step prompts the user, then the
 * user's next message is parsed and validated into a named field. When the
 * last step is answered, the collected data is handed to `onComplete`.
 * Progress is stored in the chat session's state bag (`session.state`), so
 * flows survive across messages for as long as the session lives, and any
 * number of chats can run flows independently.
 *
 * Zero dependencies. Pair with {@link CommandRouter} or a hub handler:
 *
 * @example
 * const flows = new FlowManager();
 * flows.define({
 *   name: "register",
 *   steps: [
 *     { id: "name", prompt: "Tên của bạn là gì?" },
 *     { id: "age", prompt: "Bạn bao nhiêu tuổi?",
 *       parse: (text) => Number(text),
 *       validate: (v) => (typeof v === "number" && v > 0) || "Tuổi phải là số dương" },
 *   ],
 *   onComplete: async (ctx, data) => ctx.reply(`Xin chào ${data.name} (${data.age})!`),
 * });
 *
 * hub.command("register", (ctx) => flows.start(ctx, "register"));
 * hub.onMessage(async (ctx) => { if (await flows.handle(ctx)) return; // …normal handling });
 */
import type { MessageContext } from "../contracts/context";
/** Session-state key under which the active {@link FlowState} is stored. */
export declare const FLOW_STATE_KEY = "__flow";
/** Keywords that abort the active flow when matched (trimmed, case-insensitive). */
export declare const DEFAULT_CANCEL_KEYWORDS: readonly string[];
/** One step of a {@link FlowDefinition}. */
export interface FlowStep {
    /** Field name the parsed answer is stored under in the flow data. */
    id: string;
    /**
     * Message sent when the step becomes active. May be a static string or a
     * function of the context and the data collected so far.
     */
    prompt: string | ((ctx: MessageContext, data: Record<string, unknown>) => string | Promise<string>);
    /**
     * Converts the user's raw reply text into the stored value
     * (e.g. `Number`, JSON, a date). Default: the raw text.
     */
    parse?: (text: string, ctx: MessageContext) => unknown;
    /**
     * Checks the parsed value. Return `true` when valid, or an error message
     * string — the message is sent back to the user, who stays on this step.
     */
    validate?: (value: unknown, data: Record<string, unknown>) => true | string;
}
/** A named multi-step conversation definition. */
export interface FlowDefinition {
    /** Unique flow name, used with {@link FlowManager.start}. */
    name: string;
    /** Ordered steps; must be non-empty. */
    steps: FlowStep[];
    /** Runs after the last step is answered, with the collected data. State is already cleared. */
    onComplete?: (ctx: MessageContext, data: Record<string, unknown>) => Promise<void> | void;
    /** Runs when the user cancels mid-flow, with the data collected so far. State is already cleared. */
    onCancel?: (ctx: MessageContext, data: Record<string, unknown>) => Promise<void> | void;
    /** Words that cancel the flow (trimmed, case-insensitive). Default: {@link DEFAULT_CANCEL_KEYWORDS}. */
    cancelKeywords?: string[];
}
/** Runtime progress of one chat's active flow, stored in `session.state["__flow"]`. */
export interface FlowState {
    /** Name of the active flow definition. */
    flow: string;
    /** Index of the step currently awaiting an answer. */
    stepIndex: number;
    /** Values collected so far, keyed by step id. */
    data: Record<string, unknown>;
    /** Unix timestamp (ms) when the flow started. */
    startedAt: number;
}
/**
 * Registry + runner for conversation flows.
 *
 * All state lives in `ctx.session.state["__flow"]`; the manager itself only
 * holds definitions. When `ctx.session` is undefined (no SessionStore
 * attached), {@link start} and {@link handle} return `false` and
 * {@link active} returns `undefined`.
 */
export declare class FlowManager {
    private readonly flows;
    /**
     * Registers a flow definition (replacing any previous one with the same
     * name). Throws when the definition has no steps.
     */
    define(def: FlowDefinition): this;
    /** Names of all registered flows, in registration order. */
    listFlows(): string[];
    /** Whether a flow with this name is registered. */
    has(name: string): boolean;
    /**
     * Starts a flow in the chat's session: records fresh {@link FlowState} and
     * replies with the first step's prompt. Returns `false` when the flow is
     * unknown or the context has no session.
     */
    start(ctx: MessageContext, name: string): Promise<boolean>;
    /** The chat's active flow state, or `undefined` when no flow is running. */
    active(ctx: MessageContext): FlowState | undefined;
    /**
     * Clears the chat's active flow state, if any. Does not invoke `onCancel`
     * (that callback runs only for user-cancelled flows in {@link handle}).
     * Returns whether a flow was active.
     */
    cancel(ctx: MessageContext): boolean;
    /**
     * Feeds the context's message into the chat's active flow.
     *
     * - No active flow → returns `false` (message not consumed).
     * - Cancel keyword → state cleared, `onCancel` invoked, returns `true`.
     * - Validation failure → error string replied, user stays on the step,
     *   returns `true`.
     * - Otherwise the parsed answer is stored; the next prompt is sent, or —
     *   after the last step — state is cleared and `onComplete` runs.
     *   Returns `true`.
     */
    handle(ctx: MessageContext): Promise<boolean>;
    /** Resolves a step prompt (static string or function) to the text to send. */
    private promptFor;
}
