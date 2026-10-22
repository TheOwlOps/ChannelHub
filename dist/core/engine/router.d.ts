import type { MessageContext } from "../contracts/context";
/**
 * Handler invoked when a command matches an incoming message.
 *
 * @param ctx - The message context for the incoming message.
 * @param args - Arguments parsed from the message text after the command
 *   token, split on whitespace (double-quoted segments stay together).
 * @param rawArgs - The raw remainder of the message after the command
 *   token, trimmed — useful when argument boundaries matter.
 */
export type CommandHandler = (ctx: MessageContext, args: string[], rawArgs: string) => Promise<void> | void;
/** Public description of a registered command. */
export interface CommandInfo {
    /** Canonical command name (lowercase, without any prefix). */
    name: string;
    /** Alternative names that dispatch to the same handler. */
    aliases: string[];
    /** Optional human-readable description (e.g. for help output). */
    description?: string;
}
/** Result of parsing a message text as a command invocation. */
export interface ParsedCommand {
    /** Command name: first token, lowercased, `@BotName` suffix stripped. */
    name: string;
    /** Arguments after the command token (quotes respected). */
    args: string[];
    /** Raw remainder after the command token, trimmed. */
    rawArgs: string;
}
/**
 * Parses message text as a command invocation.
 *
 * The text (after trimming) must start with one of `prefixes` (default
 * `"/"` and `"!"`). The command name is the first whitespace-delimited
 * token, lowercased, with an optional `@BotName` suffix stripped — so
 * `"/ping@MyBot hello"` parses to name `"ping"`.
 *
 * @returns The parsed command, or `null` for empty or non-command text.
 */
export declare function parseCommand(text: string, prefixes?: string[]): ParsedCommand | null;
/**
 * A rule-based route evaluated (in registration order) when a message does
 * not dispatch to a known command. Every condition that is specified must
 * pass for the route to match; unspecified conditions always pass.
 */
export interface RouteRule {
    /** Optional label for the route (debugging/introspection only). */
    name?: string;
    /** Required channel name (`ctx.channel.name`), or any of several. */
    channel?: string | string[];
    /** Required chat type (`ctx.message.chat.type`), or any of several. */
    chatType?: string | string[];
    /**
     * Text pattern matched against the message text: a string is a
     * case-insensitive substring match; a RegExp is applied with `test()`.
     */
    pattern?: RegExp | string;
    /** Arbitrary extra condition on the message context. */
    predicate?: (ctx: MessageContext) => boolean;
    /** Invoked when the route is the first to fully match. */
    handler: (ctx: MessageContext) => Promise<void> | void;
}
/**
 * Bot-framework style router for incoming messages.
 *
 * Dispatch order in {@link CommandRouter.dispatch}:
 * 1. If the message text parses as a command and the command name (or one
 *    of its aliases) is registered, its handler runs.
 * 2. Otherwise routes are evaluated in registration order and the first
 *    fully-matching route runs.
 * 3. If nothing matches, dispatch reports `false` so callers can fall back
 *    to their own handling.
 */
export declare class CommandRouter {
    private readonly commands;
    private readonly commandInfos;
    private readonly routes;
    /**
     * Registers a command handler under `name` (lowercased, without prefix),
     * plus any optional aliases that dispatch to the same handler.
     */
    registerCommand(name: string, handler: CommandHandler, opts?: {
        aliases?: string[];
        description?: string;
    }): this;
    /** Adds a rule route, evaluated after commands in registration order. */
    addRoute(rule: RouteRule): this;
    /** Lists registered commands (one entry per command, aliases included). */
    listCommands(): CommandInfo[];
    /** Number of registered rule routes. */
    get routeCount(): number;
    /** True when at least one command or route is registered. Lets the hub skip dispatch entirely (zero overhead, preserves sync dispatch) when routing is unused. */
    get hasEntries(): boolean;
    /**
     * Dispatches a message context to a command handler or route.
     *
     * @returns `true` if a command or route handled the message, else `false`.
     */
    dispatch(ctx: MessageContext): Promise<boolean>;
}
