import type { UnifiedMessage } from "./types";
export interface StatsCollectorOptions {
    /** How many days of hourly/daily buckets to keep. Default: 30 */
    retentionDays?: number;
    /** Maximum unique users tracked per day (memory guard). Default: 5000 */
    maxUsersPerDay?: number;
    /** Number of entries returned in `snapshot().topUsers`. Default: 10 */
    topUsersLimit?: number;
}
export interface ChannelStats {
    inbound: number;
    outbound: number;
    errors: number;
    lastInbound: number | null;
    lastOutbound: number | null;
}
export interface UserStat {
    id: string;
    name: string;
    channel: string;
    count: number;
    lastSeen: number;
}
export interface StatsSnapshot {
    generatedAt: number;
    totals: {
        inbound: number;
        outbound: number;
        errors: number;
    };
    today: {
        inbound: number;
        outbound: number;
        activeUsers: number;
    };
    activeUsers: {
        today: number;
        last7d: number;
    };
    perChannel: Array<{
        channel: string;
        inbound: number;
        outbound: number;
        errors: number;
        lastInbound: number | null;
        lastOutbound: number | null;
    }>;
    /** 24 buckets, oldest first, ending at the current hour */
    hourly24: Array<{
        key: string;
        label: string;
        inbound: number;
        outbound: number;
    }>;
    /** 7 entries, 6 days ago → today, each with 24 hourly inbound counts */
    heatmap: Array<{
        date: string;
        weekday: string;
        hours: number[];
    }>;
    /** 14 entries, oldest first, ending today */
    daily14: Array<{
        date: string;
        inbound: number;
        outbound: number;
    }>;
    topUsers: Array<UserStat>;
}
/**
 * In-memory traffic recorder backing the live dashboard.
 * Tracks inbound/outbound message volume per channel and per hour,
 * daily active users, and errors. Pure data — persistence is handled
 * by the caller (see DashboardBridge) via toJSON()/hydrate().
 */
export declare class StatsCollector {
    readonly startedAt: number;
    private readonly retentionDays;
    private readonly maxUsersPerDay;
    private readonly topUsersLimit;
    private totals;
    private channels;
    private hourly;
    private daily;
    constructor(options?: StatsCollectorOptions);
    /** Records an inbound message (call after dedup so retries are not double-counted). */
    recordInbound(msg: Pick<UnifiedMessage, "channel" | "sender">, ts?: number): void;
    /** Records a successful outbound send on a channel. */
    recordOutbound(channel: string, ts?: number): void;
    /** Records an error observed on a channel. */
    recordError(channel: string): void;
    /** Builds the JSON payload consumed by the dashboard UI. */
    snapshot(now?: number): StatsSnapshot;
    /** Drops buckets older than the retention window. Called lazily by snapshot(). */
    prune(now?: number): void;
    toJSON(): Record<string, unknown>;
    /** Replaces in-memory state with persisted data. Returns `false` for unknown payloads. */
    hydrate(data: unknown): boolean;
    private channelEntry;
    private dailyEntry;
}
