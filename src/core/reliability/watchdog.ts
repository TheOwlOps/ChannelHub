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

interface ChannelState {
  failures: number;
  nextAttemptAt?: number;
  gaveUp: boolean;
  lastError?: string;
}

/**
 * Watches a dynamic set of channels (supplied via `getChannels` on every
 * pass, so channels registered later are picked up automatically) and
 * reconnects the ones that drop, with per-channel exponential backoff.
 */
export class ConnectionWatchdog {
  private readonly _getChannels: () => WatchableChannel[];
  private readonly _intervalMs: number;
  private readonly _baseDelayMs: number;
  private readonly _maxDelayMs: number;
  private readonly _maxFailures: number;
  private readonly _now: () => number;
  private readonly _onEvent?: (e: WatchdogEvent) => void;
  private readonly _states = new Map<string, ChannelState>();
  private _timer: ReturnType<typeof setInterval> | null = null;
  private _checking = false;

  constructor(getChannels: () => WatchableChannel[], options: WatchdogOptions = {}) {
    this._getChannels = getChannels;
    this._intervalMs = options.intervalMs ?? 30_000;
    this._baseDelayMs = options.baseDelayMs ?? 1_000;
    this._maxDelayMs = options.maxDelayMs ?? 60_000;
    this._maxFailures = options.maxFailures ?? 0;
    this._now = options.now ?? Date.now;
    this._onEvent = options.onEvent;
  }

  private _stateFor(name: string): ChannelState {
    let state = this._states.get(name);
    if (!state) {
      state = { failures: 0, gaveUp: false };
      this._states.set(name, state);
    }
    return state;
  }

  private _emit(event: WatchdogEvent): void {
    this._onEvent?.(event);
  }

  /**
   * Runs one inspection pass over all channels.
   *
   * Connected channels are left untouched (their failure state is reset).
   * A disconnected channel is only retried once its backoff window has
   * elapsed, and never after the watchdog has given up on it.
   */
  async checkOnce(): Promise<void> {
    const now = this._now();
    for (const channel of this._getChannels()) {
      const state = this._stateFor(channel.name);

      if (channel.isConnected()) {
        if (state.failures > 0 || state.gaveUp || state.nextAttemptAt !== undefined) {
          state.failures = 0;
          state.nextAttemptAt = undefined;
          state.gaveUp = false;
          state.lastError = undefined;
        }
        continue;
      }

      if (state.gaveUp) continue;
      if (state.nextAttemptAt !== undefined && now < state.nextAttemptAt) continue;

      try {
        await channel.connect();
        const hadFailures = state.failures > 0;
        state.failures = 0;
        state.nextAttemptAt = undefined;
        state.gaveUp = false;
        state.lastError = undefined;
        if (hadFailures) {
          this._emit({ type: "reconnected", channel: channel.name, failures: 0, at: this._now() });
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        state.failures++;
        state.lastError = message;
        const delay = Math.min(
          this._maxDelayMs,
          this._baseDelayMs * 2 ** (state.failures - 1),
        );
        state.nextAttemptAt = now + delay;
        const at = this._now();
        this._emit({
          type: "reconnect_failed",
          channel: channel.name,
          failures: state.failures,
          error: message,
          at,
        });
        if (this._maxFailures > 0 && state.failures >= this._maxFailures) {
          state.gaveUp = true;
          this._emit({
            type: "gave_up",
            channel: channel.name,
            failures: state.failures,
            error: message,
            at,
          });
        }
      }
    }
  }

  /** Current watchdog state for every channel returned by getChannels(). */
  status(): WatchdogChannelStatus[] {
    return this._getChannels().map((channel) => {
      const state = this._states.get(channel.name);
      return {
        channel: channel.name,
        connected: channel.isConnected(),
        failures: state?.failures ?? 0,
        nextAttemptAt: state?.nextAttemptAt,
        gaveUp: state?.gaveUp ?? false,
      };
    });
  }

  /** Starts periodic checks. Calling start() twice is a no-op. */
  start(): void {
    if (this._timer) return;
    this._timer = setInterval(() => {
      if (this._checking) return;
      this._checking = true;
      this.checkOnce()
        .catch(() => {
          // Individual channel errors are captured per-channel inside
          // checkOnce; this guard only prevents an unhandled rejection
          // from ever taking the host process down.
        })
        .finally(() => {
          this._checking = false;
        });
    }, this._intervalMs);
    // Never keep the host process alive just to watch connections.
    (this._timer as { unref?: () => void }).unref?.();
  }

  /** Stops periodic checks. */
  stop(): void {
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
  }

  /** Whether the periodic timer is running. */
  get running(): boolean {
    return this._timer !== null;
  }

  /**
   * Clears failure/backoff/gave-up state — for one channel by name,
   * or for every channel when no name is given.
   */
  reset(channelName?: string): void {
    if (channelName !== undefined) {
      this._states.delete(channelName);
    } else {
      this._states.clear();
    }
  }
}
