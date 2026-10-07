import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { timingSafeEqual } from "node:crypto";
import type { ChannelHub } from "../../core/hub";
import { StatsCollector } from "../../core/stats";
import { DASHBOARD_HTML } from "./html";

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
export class DashboardBridge {
  private hub: ChannelHub;
  private config: Required<Omit<DashboardBridgeConfig, "collector">> & { collector?: StatsCollector };
  private server: Server | null = null;
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  readonly stats: StatsCollector;

  constructor(hub: ChannelHub, config: DashboardBridgeConfig = {}) {
    this.hub = hub;
    const dataFile =
      config.dataFile !== undefined ? config.dataFile : process.env.CHANNELHUB_STATS_FILE || null;

    // Reuse a collector already attached to the hub; otherwise create one
    // and inject it so the hub records inbound/outbound for this dashboard.
    this.stats = config.collector ?? hub.stats ?? new StatsCollector();
    hub.stats = this.stats;
    if (dataFile && !config.collector && existsSync(dataFile)) {
      try {
        this.stats.hydrate(JSON.parse(readFileSync(dataFile, "utf8")));
      } catch {
        // Corrupt or unreadable stats file — start fresh rather than crash startup
      }
    }

    this.config = {
      port: config.port ?? 8790,
      host: config.host ?? "127.0.0.1",
      pathPrefix: config.pathPrefix ?? "",
      apiKey: config.apiKey ?? process.env.CHANNELHUB_DASHBOARD_KEY ?? "",
      dataFile: dataFile ? resolve(dataFile) : null,
      flushIntervalMs: config.flushIntervalMs ?? 15_000,
      collector: config.collector,
    };
  }

  async start(): Promise<void> {
    this.server = createServer((req, res) => this.handle(req, res));
    await new Promise<void>((resolve) => {
      this.server!.listen(this.config.port, this.config.host, () => resolve());
    });

    if (this.config.dataFile) {
      this.flushTimer = setInterval(() => {
        try {
          this.flush();
        } catch {
          // Transient write failures (disk full, permissions) must not kill the timer
        }
      }, this.config.flushIntervalMs);
      this.flushTimer.unref?.();
    }
  }

  async stop(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    if (this.server) {
      await new Promise<void>((resolve, reject) => {
        this.server!.close((err) => (err ? reject(err) : resolve()));
      });
      this.server = null;
    }
    this.flush();
  }

  /** Local URL of the dashboard once started, e.g. `http://127.0.0.1:8790`. */
  get endpoint(): string | null {
    if (!this.server) return null;
    const addr = this.server.address();
    if (!addr || typeof addr === "string") return null;
    return `http://${this.config.host}:${addr.port}`;
  }

  /** Writes the current stats snapshot to `dataFile` (atomic tmp+rename). */
  flush(): void {
    if (!this.config.dataFile) return;
    mkdirSync(dirname(this.config.dataFile), { recursive: true });
    const tmp = `${this.config.dataFile}.tmp`;
    writeFileSync(tmp, JSON.stringify(this.stats.toJSON()));
    renameSync(tmp, this.config.dataFile);
  }

  private path(req: IncomingMessage): string {
    const bare = (req.url || "/").split("?")[0];
    return bare.startsWith(this.config.pathPrefix)
      ? bare.slice(this.config.pathPrefix.length) || "/"
      : bare;
  }

  private authenticate(req: IncomingMessage): boolean {
    const isLoopback = this.config.host === "127.0.0.1" || this.config.host === "localhost";
    if (!this.config.apiKey) {
      // Fail closed when exposed beyond loopback without a key
      if (!isLoopback) return false;
      return true;
    }
    const authHeader = req.headers["authorization"];
    if (!authHeader || !authHeader.startsWith("Bearer ")) return false;
    const tokenBuf = Buffer.from(authHeader.slice(7).trim());
    const keyBuf = Buffer.from(this.config.apiKey);
    if (tokenBuf.length !== keyBuf.length) return false;
    return timingSafeEqual(tokenBuf, keyBuf);
  }

  private handle(req: IncomingMessage, res: ServerResponse): void {
    const p = this.path(req);
    if (req.method === "GET" && (p === "/" || p === "/index.html")) {
      const body = Buffer.from(DASHBOARD_HTML);
      res.writeHead(200, {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Length": body.length,
        "Cache-Control": "no-store",
      });
      res.end(body);
      return;
    }
    if (req.method === "GET" && p === "/health") {
      return this.json(res, 200, { ok: true });
    }
    if (req.method === "GET" && p === "/api/stats") {
      if (!this.authenticate(req)) {
        return this.json(res, 401, { error: "Unauthorized: Invalid or missing API key" });
      }
      const uptimeSec = Math.max(0, Math.floor((Date.now() - this.stats.startedAt) / 1000));
      return this.json(res, 200, {
        ...this.stats.snapshot(),
        runtime: {
          startedAt: this.stats.startedAt,
          uptimeSec,
          channels: this.hub.listChannels().map((key) => ({
            key,
            connected: this.hub.getChannel(key)?.isConnected() ?? false,
          })),
        },
      });
    }
    this.json(res, 404, { error: "Not found" });
  }

  private json(res: ServerResponse, status: number, body: unknown): void {
    const data = JSON.stringify(body);
    res.writeHead(status, {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(data),
    });
    res.end(data);
  }
}
