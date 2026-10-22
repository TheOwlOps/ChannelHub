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
export type CommandHandler = (
  ctx: MessageContext,
  args: string[],
  rawArgs: string,
) => Promise<void> | void;

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

const DEFAULT_PREFIXES = ["/", "!"];

/**
 * Splits a string on whitespace, treating double-quoted segments as a
 * single token (the quotes themselves are removed). An unterminated quote
 * swallows the rest of the string into the final token.
 */
function splitArgs(input: string): string[] {
  const args: string[] = [];
  let current = "";
  let inQuotes = false;
  let hasToken = false;

  for (const ch of input) {
    if (ch === '"') {
      inQuotes = !inQuotes;
      hasToken = true;
    } else if (!inQuotes && /\s/.test(ch)) {
      if (hasToken) {
        args.push(current);
        current = "";
        hasToken = false;
      }
    } else {
      current += ch;
      hasToken = true;
    }
  }
  if (hasToken) args.push(current);
  return args;
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
export function parseCommand(
  text: string,
  prefixes: string[] = DEFAULT_PREFIXES,
): ParsedCommand | null {
  if (typeof text !== "string") return null;
  const trimmed = text.trim();
  if (!trimmed) return null;

  // Prefer the longest matching prefix so e.g. "//" wins over "/".
  const prefix = [...prefixes]
    .sort((a, b) => b.length - a.length)
    .find((p) => p.length > 0 && trimmed.startsWith(p));
  if (!prefix) return null;

  const body = trimmed.slice(prefix.length);
  if (!body || /^\s/.test(body)) return null;

  const firstSpace = body.search(/\s/);
  const token = firstSpace === -1 ? body : body.slice(0, firstSpace);
  const rawArgs = firstSpace === -1 ? "" : body.slice(firstSpace).trim();

  const name = token.split("@")[0].toLowerCase();
  if (!name) return null;

  return { name, args: splitArgs(rawArgs), rawArgs };
}

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

interface RegisteredCommand {
  info: CommandInfo;
  handler: CommandHandler;
}

function matchesAny(value: string, expected: string | string[] | undefined): boolean {
  if (expected === undefined) return true;
  return Array.isArray(expected) ? expected.includes(value) : expected === value;
}

function matchesPattern(text: string, pattern: RegExp | string | undefined): boolean {
  if (pattern === undefined) return true;
  if (typeof pattern === "string") {
    return text.toLowerCase().includes(pattern.toLowerCase());
  }
  pattern.lastIndex = 0; // guard against stateful /g or /y regexes
  return pattern.test(text);
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
export class CommandRouter {
  private readonly commands = new Map<string, RegisteredCommand>();
  private readonly commandInfos: CommandInfo[] = [];
  private readonly routes: RouteRule[] = [];

  /**
   * Registers a command handler under `name` (lowercased, without prefix),
   * plus any optional aliases that dispatch to the same handler.
   */
  registerCommand(
    name: string,
    handler: CommandHandler,
    opts?: { aliases?: string[]; description?: string },
  ): this {
    const canonical = name.trim().toLowerCase();
    const aliases = (opts?.aliases ?? []).map((a) => a.trim().toLowerCase());
    const entry: RegisteredCommand = {
      info: { name: canonical, aliases, description: opts?.description },
      handler,
    };
    this.commands.set(canonical, entry);
    for (const alias of aliases) this.commands.set(alias, entry);
    this.commandInfos.push(entry.info);
    return this;
  }

  /** Adds a rule route, evaluated after commands in registration order. */
  addRoute(rule: RouteRule): this {
    this.routes.push(rule);
    return this;
  }

  /** Lists registered commands (one entry per command, aliases included). */
  listCommands(): CommandInfo[] {
    return [...this.commandInfos];
  }

  /** Number of registered rule routes. */
  get routeCount(): number {
    return this.routes.length;
  }

  /** True when at least one command or route is registered. Lets the hub skip dispatch entirely (zero overhead, preserves sync dispatch) when routing is unused. */
  get hasEntries(): boolean {
    return this.commands.size > 0 || this.routes.length > 0;
  }

  /**
   * Dispatches a message context to a command handler or route.
   *
   * @returns `true` if a command or route handled the message, else `false`.
   */
  async dispatch(ctx: MessageContext): Promise<boolean> {
    const text = ctx.message.content.text ?? "";

    const parsed = parseCommand(text);
    if (parsed) {
      const entry = this.commands.get(parsed.name);
      if (entry) {
        await entry.handler(ctx, parsed.args, parsed.rawArgs);
        return true;
      }
      // Unknown command: fall through to rule routes.
    }

    for (const rule of this.routes) {
      if (!matchesAny(ctx.channel.name, rule.channel)) continue;
      if (!matchesAny(ctx.message.chat.type, rule.chatType)) continue;
      if (!matchesPattern(text, rule.pattern)) continue;
      if (rule.predicate && !rule.predicate(ctx)) continue;
      await rule.handler(ctx);
      return true;
    }

    return false;
  }
}
