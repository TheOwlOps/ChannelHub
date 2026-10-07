import type { ChannelHub } from "../../core/hub";
import { StatsCollector } from "../../core/stats";
export interface DashboardBridgeConfig {
    port?: number;
    host?: string;
    pathPrefix?: string;
    /** Bearer key for `/api/*`. Required when bound outside loopback. Default: `CHANNELHUB_DASHBOARD_KEY` env */
    apiKey?: string;
    /** JSON file the stats snapshot is persisted to across restarts. Default: `CHANNELHUB_STATS_FILE` env, or null (memory only) */
    dataFile?: string | null;
    /** Reuse an existing StatsCollector instead of creating a fresh one. */
    collector?: StatsCollector;
    /** How often stats are flushed to `dataFile` while running. Default: 15000 */
    flushIntervalMs?: number;
}
/**
 * Live traffic dashboard for ChannelHub.
 *
 * A `StatsCollector` records inbound/outbound traffic per channel, daily active
 * users and hourly activity; a small HTTP server serves a self-contained web UI
 * plus a JSON API:
 *
 *   GET /             dashboard web page (static, no secrets)
 *   GET /health       liveness probe (unauthenticated)
 *   GET /api/stats    aggregated snapshot consumed by the UI
 *
 * Bind to 127.0.0.1 (default) for local use; when binding a public interface,
 * set `apiKey` (or `CHANNELHUB_DASHBOARD_KEY`) — requests without a valid
 * Bearer token are rejected with 401, mirroring the WebhookBridge contract.
 */
export declare class DashboardBridge {
    private hub;
    private config;
    private server;
    private flushTimer;
    readonly stats: StatsCollector;
    constructor(hub: ChannelHub, config?: DashboardBridgeConfig);
    start(): Promise<void>;
    stop(): Promise<void>;
    /** Local URL of the dashboard once started, e.g. `http://127.0.0.1:8790`. */
    get endpoint(): string | null;
    /** Writes the current stats snapshot to `dataFile` (atomic tmp+rename). */
    flush(): void;
    private path;
    private authenticate;
    private handle;
    private json;
}
