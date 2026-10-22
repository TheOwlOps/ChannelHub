/**
 * ConnectionWatchdog — keeps channel connections alive.
 *
 * Periodically inspects every registered channel; when a channel is found
 * disconnected it tries to reconnect, backing off exponentially between
 * attempts (schedule-based, per channel) and optionally giving up after a
 * configurable number of consecutive failures. Every outcome is reported
 * through the `onEvent` callback so hosts can log, alert, or surface the
 * state in a dashboard.
 *
 * Zero dependencies; the clock is injectable for deterministic tests.
 */
/** Minimal surface a channel must expose to be watched. */
export interface WatchableChannel {
    name: string;
    isConnected(): boolean;
    connect(signal?: AbortSignal): Promise<void>;
}
/** Events emitted by the watchdog as reconnect attempts resolve. */
export interface WatchdogEvent {
    type: "reconnected" | "reconnect_failed" | "gave_up";
    channel: string;
    /** Consecutive failure count at the time of the event (0 after a successful reconnect). */
    failures: number;
    error?: string;
    at: number;
}
export interface WatchdogOptions {
    /** Poll interval for {@link ConnectionWatchdog.start}. Default: 30_000 ms. */
    intervalMs?: number;
    /** First backoff delay after a failed reconnect. Default: 1_000 ms. */
    baseDelayMs?: number;
    /** Upper bound for the backoff delay. Default: 60_000 ms. */
    maxDelayMs?: number;
    /** Give up after this many consecutive failures. 0 = unlimited. Default: 0. */
    maxFailures?: number;
    /** Clock override (epoch ms). Default: Date.now. */
    now?: () => number;
    /** Sink for watchdog events. */
    onEvent?: (e: WatchdogEvent) => void;
}
/** Snapshot of one channel's watchdog state. */
export interface WatchdogChannelStatus {
    channel: string;
    connected: boolean;
    failures: number;
    nextAttemptAt?: number;
    gaveUp: boolean;
}
/**
 * Watches a dynamic set of channels (supplied via `getChannels` on every
 * pass, so channels registered later are picked up automatically) and
 * reconnects the ones that drop, with per-channel exponential backoff.
 */
export declare class ConnectionWatchdog {
    private readonly _getChannels;
    private readonly _intervalMs;
    private readonly _baseDelayMs;
    private readonly _maxDelayMs;
    private readonly _maxFailures;
    private readonly _now;
    private readonly _onEvent?;
    private readonly _states;
    private _timer;
    private _checking;
    constructor(getChannels: () => WatchableChannel[], options?: WatchdogOptions);
    private _stateFor;
    private _emit;
    /**
     * Runs one inspection pass over all channels.
     *
     * Connected channels are left untouched (their failure state is reset).
     * A disconnected channel is only retried once its backoff window has
     * elapsed, and never after the watchdog has given up on it.
     */
    checkOnce(): Promise<void>;
    /** Current watchdog state for every channel returned by getChannels(). */
    status(): WatchdogChannelStatus[];
    /** Starts periodic checks. Calling start() twice is a no-op. */
    start(): void;
    /** Stops periodic checks. */
    stop(): void;
    /** Whether the periodic timer is running. */
    get running(): boolean;
    /**
     * Clears failure/backoff/gave-up state — for one channel by name,
     * or for every channel when no name is given.
     */
    reset(channelName?: string): void;
}
