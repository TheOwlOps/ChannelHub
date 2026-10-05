import { type MessageContext } from "./context";
import { type IdempotencyCacheOptions } from "./dedup";
import { IdentityStitcher } from "./identity";
import { HumanHandoffManager } from "./handoff";
import type { DeadLetterHandler } from "./dlq";
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
    private _queue;
    private _waiters;
    private _queueDrainWaiters;
    private _isClosed;
    constructor(options?: ChannelHubOptions);
    /** Gets the active identity stitcher. */
    get identityStitcher(): IdentityStitcher;
    /** Gets the human handoff manager. */
    get handoff(): HumanHandoffManager;
    /**
     * Registers a middleware function to the pipeline.
     * Middlewares run sequentially before registered message handlers.
     */
    use(middleware: Middleware): this;
    register(channel: IChannelAdapter): this;
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
    stop(signal?: AbortSignal): Promise<void>;
}
