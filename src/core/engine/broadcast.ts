import type { IChannelAdapter, MediaPayload, SentMessageResult } from "../contracts/types";
import { withRetry, type RetryOptions } from "../reliability/retry";

/**
 * Multi-channel broadcast (fan-out).
 *
 * Sends the same content to many (channel, chatId) targets with per-target
 * template rendering, bounded concurrency, and optional per-target retry.
 * Individual failures never abort the batch — every target gets a result item
 * in the returned {@link BroadcastReport}, in the same order as `targets`.
 */

export interface BroadcastTarget {
  /** Registered channel name, e.g. "telegram", "zalo", "discord". */
  channel: string;
  /** Destination chat/user id on that channel. */
  chatId: string;
  /** Per-target template variables, merged over the built-ins (see broadcastMessage). */
  vars?: Record<string, string>;
}

export interface BroadcastContent {
  text?: string;
  media?: MediaPayload;
}

export interface BroadcastOptions {
  /** Max sends in flight at once. Default: 5. */
  concurrency?: number;
  /**
   * Retry policy applied to each target's send (via `withRetry`).
   * Pass `false` to disable retries (exactly one attempt per target).
   * Omit to use the default retry policy.
   */
  retry?: RetryOptions | false;
}

export interface BroadcastResultItem {
  channel: string;
  chatId: string;
  ok: boolean;
  messageId?: string;
  error?: string;
  /** How many send attempts were made (0 when the channel was not found). */
  attempts: number;
}

export interface BroadcastReport {
  total: number;
  sent: number;
  failed: number;
  durationMs: number;
  results: BroadcastResultItem[];
}

/** Minimal hub surface broadcastMessage needs — satisfied by the real ChannelHub. */
export interface BroadcastHubLike {
  getChannel(name: string): IChannelAdapter | undefined;
}

/**
 * Renders `{{key}}` placeholders (whitespace inside the braces is allowed,
 * e.g. `{{ name }}`) using `vars`. Placeholders with no matching key are left
 * unchanged.
 */
export function renderTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{([^{}]+)\}\}/g, (match, rawKey: string) => {
    const key = rawKey.trim();
    return Object.prototype.hasOwnProperty.call(vars, key) ? vars[key] : match;
  });
}

/**
 * Broadcasts `content` to every target.
 *
 * Per-target template variables are `{ channel, chatId, ...target.vars }`,
 * so templates can use `{{channel}}` and `{{chatId}}` without declaring them.
 *
 * Content delivery per target:
 * - text only  → `adapter.sendText(chatId, renderedText)`
 * - media only → `adapter.sendMedia(chatId, media)`
 * - both       → `adapter.sendMedia(chatId, media)` where the rendered text
 *   becomes `media.caption` when the media has no caption of its own (an
 *   existing caption is never overwritten, and the text is not sent twice).
 *
 * Throws only when `content` has neither text nor media; per-target failures
 * (missing channel, adapter errors after retries) are reported, not thrown.
 */
export async function broadcastMessage(
  hub: BroadcastHubLike,
  targets: BroadcastTarget[],
  content: BroadcastContent,
  options: BroadcastOptions = {},
): Promise<BroadcastReport> {
  if (!content.text && !content.media) {
    throw new Error("broadcastMessage: content must include text or media");
  }

  const concurrency = Math.max(1, Math.floor(options.concurrency ?? 5));
  const startedAt = Date.now();
  const results: BroadcastResultItem[] = new Array(targets.length);

  let cursor = 0;
  const worker = async (): Promise<void> => {
    while (true) {
      const index = cursor++;
      if (index >= targets.length) return;
      results[index] = await deliver(hub, targets[index], content, options.retry);
    }
  };

  const workerCount = Math.min(concurrency, targets.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));

  const sent = results.filter((r) => r.ok).length;
  return {
    total: targets.length,
    sent,
    failed: targets.length - sent,
    durationMs: Date.now() - startedAt,
    results,
  };
}

async function deliver(
  hub: BroadcastHubLike,
  target: BroadcastTarget,
  content: BroadcastContent,
  retry: RetryOptions | false | undefined,
): Promise<BroadcastResultItem> {
  const base = { channel: target.channel, chatId: target.chatId };

  const adapter = hub.getChannel(target.channel);
  if (!adapter) {
    return {
      ...base,
      ok: false,
      attempts: 0,
      error: `Channel "${target.channel}" not found (no adapter registered)`,
    };
  }

  const vars: Record<string, string> = {
    channel: target.channel,
    chatId: target.chatId,
    ...target.vars,
  };
  const renderedText =
    content.text !== undefined ? renderTemplate(content.text, vars) : undefined;

  const doSend = async (): Promise<SentMessageResult> => {
    if (content.media) {
      const media: MediaPayload = { ...content.media };
      if (renderedText !== undefined && !media.caption) {
        media.caption = renderedText;
      }
      return adapter.sendMedia(target.chatId, media);
    }
    return adapter.sendText(target.chatId, renderedText as string);
  };

  let attempts = 0;
  try {
    let result: SentMessageResult;
    if (retry === false) {
      attempts = 1;
      result = await doSend();
    } else {
      result = await withRetry(async (attempt) => {
        attempts = attempt + 1;
        return doSend();
      }, retry);
    }
    return { ...base, ok: true, messageId: result.messageId, attempts };
  } catch (err) {
    return {
      ...base,
      ok: false,
      error: err instanceof Error ? err.message : String(err),
      attempts,
    };
  }
}
