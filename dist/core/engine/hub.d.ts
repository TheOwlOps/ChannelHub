import { type MessageContext } from "../contracts/context";
import { type IdempotencyCacheOptions } from "../reliability/dedup";
import { IdentityStitcher } from "../identity/identity";
import { HumanHandoffManager } from "./handoff";
import type { DeadLetterHandler } from "../reliability/dlq";
import type { StatsCollector } from "../insights/stats";
import type { DashboardBridge, DashboardBridgeConfig } from "../../bridges/dashboard/dashboard";
import type { IChannelAdapter } from "../contracts/types";
import { SessionStore, type SessionStoreOptions } from "./session";
import { CommandRouter, type CommandHandler, type RouteRule } from "./router";
import { type BroadcastContent, type BroadcastOptions, type BroadcastReport, type BroadcastTarget } from "./broadcast";
import { MessageScheduler, type ScheduledJob, type ScheduleInput } from "../reliability/scheduler";
import { FlowManager, type FlowDefinition } from "./flow";
import { DeadLetterStore } from "../reliability/dead-letter-store";
import type { DeadLetterItem as DeadLetterItemType } from "../reliability/dlq";
import { MessageJournal } from "../insights/journal";
import { ConnectionWatchdog, type WatchdogOptions } from "../reliability/watchdog";
export type MessageHandler = (ctx: MessageContext) => Promise<void> | void;
export type Middleware = (ctx: MessageContext, next: () => Promise<void>) => Promise<void> | void;
export interface ChannelHubOptions {
    /** Enable message deduplication (prevents double processing from webhook retries). Default: false */
    enableDeduplication?: boolean;
    /** Deduplication cache options */
    dedupOptions?: IdempotencyCacheOptions;
    /** Dead Letter Queue callback for unhandled errors in message handlers */
    onDeadLetter?: DeadLetterHandler;
    /** Custom IdentityStitcher for resolving universal user identities. Auto-created if omitted. */
    identityStitcher?: IdentityStitcher;
    /** Optional StatsCollector that records inbound/outbound traffic for the live dashboard. */
    stats?: StatsCollector;
    /** Session store options (conversation memory). A SessionStore is always created; these tune it. */
    sessionOptions?: SessionStoreOptions;
    /** Scheduler tick interval in ms for scheduled messages. Default: 250 */
    schedulerTickMs?: number;
    /** Persist failed messages in a DeadLetterStore (in addition to onDeadLetter). true = defaults, or pass { maxEntries }. */
    deadLetterStore?: boolean | {
        maxEntries?: number;
    };
    /** Max entries kept in the message journal. Default: 1000 */
    journalMaxEntries?: number;
    /** Connection watchdog options. The watchdog is created lazily; call hub.startWatchdog() to run it. */
    watchdog?: WatchdogOptions;
}
export declare class ChannelHub {
    private _channels;
    private _bus;
    private _messageHandlers;
    private _middlewares;
    private _dedupCache?;
    private _dlqHandler?;
    private _identityStitcher;
    private _handoffManager;
    private _sessionStore;
    private _router;
    private _scheduler;
    private _flows;
    private _deadLetterStore?;
    private _journal;
    private _watchdogOptions?;
    private _watchdog?;
    private _stats;
    private _instrumented;
    private _queue;
    private _waiters;
    private _queueDrainWaiters;
    private _isClosed;
    constructor(options?: ChannelHubOptions);
    /** Gets the active identity stitcher. */
    get identityStitcher(): IdentityStitcher;
    /** Gets the human handoff manager. */
    get handoff(): HumanHandoffManager;
    /** Conversation session store (per-chat state + history for AI agents). */
    get sessions(): SessionStore;
    /** Command + rule router. */
    get router(): CommandRouter;
    /** Scheduled-message engine. Timers start lazily on the first schedule() call. */
    get scheduler(): MessageScheduler;
    /**
     * Registers a bot command (e.g. hub.command("ping", handler) matches "/ping" and "!ping").
     * Commands and routes are dispatched before generic onMessage handlers; when one
     * handles a message, generic handlers are skipped for that message.
     */
    command(name: string, handler: CommandHandler, opts?: {
        aliases?: string[];
        description?: string;
    }): this;
    /** Registers a declarative routing rule (channel / chat type / pattern / predicate). */
    route(rule: RouteRule): this;
    /** Sends one message (text and/or media, with {{template}} vars) to many chats across channels. */
    broadcast(targets: BroadcastTarget[], content: BroadcastContent, options?: BroadcastOptions): Promise<BroadcastReport>;
    /** Schedules a message for later (one-shot or recurring). Starts the scheduler timer on first use. */
    schedule(input: ScheduleInput): ScheduledJob;
    /** Lists pending scheduled jobs, soonest first. */
    listScheduled(): ScheduledJob[];
    /** Cancels a scheduled job by id. Returns false when the id is unknown. */
    cancelScheduled(id: string): boolean;
    /** Multi-step conversation (wizard) flow manager. Define flows with hub.defineFlow(). */
    get flows(): FlowManager;
    /** Defines a conversation flow. While a flow is active in a chat, it claims inbound messages before commands/routes/handlers. */
    defineFlow(def: FlowDefinition): this;
    /** Bounded message journal (inbound / outbound / errors). Always recording. */
    get journal(): MessageJournal;
    /** Dead letter store, when enabled via the `deadLetterStore` hub option. */
    get deadLetterStore(): DeadLetterStore | undefined;
    /** Failed messages captured in the dead letter store (oldest → newest). Empty when the store is disabled. */
    deadLetters(): DeadLetterItemType[];
    /**
     * Replays stored dead letters through the generic message handlers (router and
     * middlewares are skipped). Successfully handled items are removed from the store;
     * failures stay with an incremented retryCount.
     */
    replayDeadLetters(): Promise<{
        replayed: number;
        failed: number;
    }>;
    /** Connection watchdog (created lazily from the `watchdog` hub option). */
    get watchdog(): ConnectionWatchdog;
    /** Starts periodic auto-reconnect monitoring for registered channels. */
    startWatchdog(): this;
    /** Stops the connection watchdog if it was started. */
    stopWatchdog(): this;
    /** Point-in-time health snapshot: channels, scheduled jobs, dead letters, journal. */
    health(): {
        channels: Array<{
            key: string;
            connected: boolean;
        }>;
        scheduledJobs: number;
        deadLetters: number;
        journal: ReturnType<MessageJournal["summary"]>;
    };
    /** Live traffic collector, when one is attached. */
    get stats(): StatsCollector | null;
    /** Attaches (or replaces) the traffic collector and instruments already-registered channels. */
    set stats(collector: StatsCollector | null);
    /**
     * Registers a middleware function to the pipeline.
     * Middlewares run sequentially before registered message handlers.
     */
    use(middleware: Middleware): this;
    register(channel: IChannelAdapter): this;
    /**
     * Wraps a channel's send methods so successful outbound sends are
     * counted by the StatsCollector without touching adapter internals.
     * Idempotent per channel; the collector is read late-bound so it can be
     * replaced after channels are registered.
     */
    private _instrumentOutbound;
    getChannel(providerOrKey: string, accountId?: string): IChannelAdapter | undefined;
    listChannels(): string[];
    onMessage(handler: MessageHandler): this;
    on(event: "message" | "error" | "handoff", handler: any): this;
    /**
     * Async generator yielding incoming MessageContext with full backpressure
     */
    messages(signal?: AbortSignal): AsyncIterable<MessageContext>;
    start(signal?: AbortSignal): Promise<void>;
    startAll(signal?: AbortSignal): Promise<void>;
    /**
     * One-liner dashboard: creates, starts and attaches a DashboardBridge
     * to this hub. Equivalent to `new DashboardBridge(this, options)` + `start()`.
     * Returns the running bridge — `bridge.endpoint` is the local URL,
     * `bridge.stats` the underlying StatsCollector.
     */
    dashboard(options?: DashboardBridgeConfig): Promise<DashboardBridge>;
    stop(signal?: AbortSignal): Promise<void>;
}
