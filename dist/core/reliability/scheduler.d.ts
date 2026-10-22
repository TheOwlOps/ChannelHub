/**
 * In-memory Scheduled Message Jobs.
 *
 * Lets bots and AI agents defer an outbound message ("send this in 10
 * minutes", "remind the group every day at 09:00") without any external
 * queue, cron service, or database. Jobs live in a Map and are executed by
 * {@link MessageScheduler.runDue}, which the embedder either calls manually
 * (tests, serverless ticks) or lets {@link MessageScheduler.start} drive on
 * a lightweight interval timer.
 *
 * The scheduler is deliberately transport-agnostic: it never talks to a
 * channel itself. It just invokes the `ScheduledSendFn` supplied at
 * construction time, which is where the actual hub/channel send happens.
 *
 * Semantics:
 * - One-shot jobs are removed after their first execution attempt,
 *   regardless of whether the send succeeded or failed.
 * - Recurring jobs (`everyMs`) stay registered, reschedule to their next
 *   slot after every attempt, and keep a `lastError` record of the most
 *   recent failure (cleared on the next success).
 * - A failing job never blocks other due jobs from running.
 * - Missed recurring intervals are skipped, not replayed: after a long
 *   pause a recurring job fires once and lands on its next future slot.
 */
/** A single scheduled message job held by {@link MessageScheduler}. */
export interface ScheduledJob {
    /** Unique job identifier (counter + random suffix). */
    id: string;
    /** Epoch milliseconds of the next (or first) execution. */
    at: number;
    /** Recurrence interval in milliseconds. Undefined means one-shot. */
    everyMs?: number;
    /** Target channel key, e.g. "telegram" or "zalo". */
    channel: string;
    /** Target chat/thread identifier on the channel. */
    chatId: string;
    /** Message text to send. */
    text: string;
    /** Epoch milliseconds when the job was created. */
    createdAt: number;
    /** Number of times the job has been executed (attempted). */
    runs: number;
    /** Epoch milliseconds of the most recent execution attempt. */
    lastRunAt?: number;
    /** Message of the most recent send failure; cleared on success. */
    lastError?: string;
}
/** Input accepted by {@link MessageScheduler.schedule}. */
export interface ScheduleInput {
    /** Absolute epoch-milliseconds time of the first run. Wins over `delayMs`. */
    at?: number;
    /** Delay from now until the first run, in milliseconds. Default: 0. */
    delayMs?: number;
    /** When set, the job recurs every `everyMs` milliseconds. */
    everyMs?: number;
    /** Target channel key, e.g. "telegram" or "zalo". */
    channel: string;
    /** Target chat/thread identifier on the channel. */
    chatId: string;
    /** Message text to send. Must be non-empty. */
    text: string;
}
/**
 * Callback invoked by the scheduler when a job becomes due.
 * Implementations typically forward `job` to the hub:
 * `hub.getChannel(job.channel)?.sendText(job.chatId, job.text)`.
 * Throwing (or rejecting) marks the run as failed and is recorded on
 * `job.lastError`; it never aborts the rest of the due batch.
 */
export type ScheduledSendFn = (job: ScheduledJob) => Promise<void>;
/** Options for {@link MessageScheduler}. */
export interface SchedulerOptions {
    /** Clock source. Injectable for tests. Default: `Date.now`. */
    now?: () => number;
    /** Interval between automatic due-checks in `start()`. Default: 250. */
    tickMs?: number;
}
export declare class MessageScheduler {
    private readonly _sendFn;
    private readonly _now;
    private readonly _tickMs;
    private readonly _jobs;
    private _counter;
    private _timer;
    private _ticking;
    constructor(sendFn: ScheduledSendFn, options?: SchedulerOptions);
    /**
     * Registers a new job and returns it.
     *
     * The first run time is resolved as: `input.at` if given, otherwise
     * `now + delayMs` if `delayMs` is given, otherwise `now + everyMs` for
     * recurring jobs, otherwise now (immediately due).
     *
     * @throws if `text`, `channel`, or `chatId` is empty, or `everyMs` is not positive.
     */
    schedule(input: ScheduleInput): ScheduledJob;
    /**
     * Removes a job by id. Returns true if a job was actually removed.
     */
    cancel(id: string): boolean;
    /**
     * Returns the live job record for `id`, or undefined if not registered.
     */
    get(id: string): ScheduledJob | undefined;
    /**
     * Returns shallow copies of all registered jobs, sorted by next run
     * time (`at`) ascending. Mutating the copies does not affect the
     * scheduler's internal records.
     */
    list(): ScheduledJob[];
    /** Number of registered jobs. */
    get size(): number;
    /** Removes all registered jobs. Does not stop a running timer. */
    clear(): void;
    /**
     * Executes every job due at `referenceNow` (defaults to the configured
     * clock), in ascending `at` order, and returns how many jobs were
     * executed (attempted).
     *
     * Each due job is attempted exactly once per call. On success the job's
     * `runs`/`lastRunAt` are updated and `lastError` is cleared; on failure
     * the error message is recorded in `lastError`. One-shot jobs are
     * removed after the attempt either way; recurring jobs are rescheduled
     * to their next future slot (`previous at + everyMs`, skipping any
     * intervals already missed). A job that throws never prevents later
     * due jobs from running.
     */
    runDue(referenceNow?: number): Promise<number>;
    /**
     * Starts automatically executing due jobs every `tickMs` milliseconds.
     * The underlying timer is unref'd, so a started scheduler never keeps
     * the process alive on its own. Calling `start()` while already running
     * is a no-op. Ticks are guarded against re-entry: a tick that is still
     * executing when the next interval fires is skipped, not overlapped.
     */
    start(): void;
    /** Stops the automatic timer started by {@link MessageScheduler.start}. */
    stop(): void;
    /** Whether the automatic timer is currently running. */
    get running(): boolean;
}
