import { type MessageContext } from "./context";
import { type IdempotencyCacheOptions } from "./dedup";
import { IdentityStitcher } from "./identity";
import { HumanHandoffManager } from "./handoff";
import type { DeadLetterHandler } from "./dlq";
import type { StatsCollector } from "./stats";
import type { DashboardBridge, DashboardBridgeConfig } from "../bridges/dashboard/index";
import type { IChannelAdapter } from "./types";
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
