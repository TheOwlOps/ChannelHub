import type { IChannelAdapter, MediaPayload } from "../contracts/types";
import { type RetryOptions } from "../reliability/retry";
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
export declare function renderTemplate(template: string, vars: Record<string, string>): string;
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
export declare function broadcastMessage(hub: BroadcastHubLike, targets: BroadcastTarget[], content: BroadcastContent, options?: BroadcastOptions): Promise<BroadcastReport>;
