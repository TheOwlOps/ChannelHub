import { createServer, type IncomingMessage, type ServerResponse, type Server } from "node:http";
import { timingSafeEqual } from "node:crypto";
import type { ChannelHub } from "../../core/hub";
import type { UnifiedMessage } from "../../core/types";

export interface WebhookBridgeConfig {
  port?: number;
  host?: string;
  pathPrefix?: string;
  apiKey?: string;
  maxBodySize?: number;
}

/**
 * HTTP / SSE bridge exposing ChannelHub over REST.
 * Compatible with n8n, Dify, Flowise, LangChain custom tools, and plain curl.
 *
 * Endpoints:
 *   GET  /health
 *   GET  /channels
 *   POST /send          { channel, chatId, text, replyToId? }
 *   POST /react         { channel, chatId, messageId, emoji }
 *   GET  /events        Server-Sent Events stream of inbound UnifiedMessages
 */
export class WebhookBridge {
  private hub: ChannelHub;
  private config: Required<WebhookBridgeConfig>;
  private server: Server | null = null;
  private sseClients = new Set<ServerResponse>();

  constructor(hub: ChannelHub, config: WebhookBridgeConfig = {}) {
    this.hub = hub;
    this.config = {
      port: config.port ?? 8788,
      host: config.host ?? "127.0.0.1",
      pathPrefix: config.pathPrefix ?? "",
      apiKey: config.apiKey ?? process.env.CHANNELHUB_API_KEY ?? "",
      maxBodySize: config.maxBodySize ?? 1024 * 1024, // 1MB payload limit
    };

    // Forward inbound hub messages to SSE subscribers
    hub.onMessage(async (ctx) => {
      this.broadcastSse(ctx.message);
    });
  }

  async start(): Promise<void> {
    this.server = createServer((req, res) => this.handle(req, res));
    await new Promise<void>((resolve) => {
      this.server!.listen(this.config.port, this.config.host, () => resolve());
    });
  }

  async stop(): Promise<void> {
    for (const client of this.sseClients) {
      client.end();
    }
    this.sseClients.clear();
    if (this.server) {
      await new Promise<void>((resolve, reject) => {
        this.server!.close((err) => (err ? reject(err) : resolve()));
      });
      this.server = null;
    }
  }

  private path(req: IncomingMessage): string {
    const url = req.url || "/";
    const bare = url.split("?")[0];
    return bare.startsWith(this.config.pathPrefix)
      ? bare.slice(this.config.pathPrefix.length) || "/"
      : bare;
  }

  private authenticate(req: IncomingMessage): boolean {
    const isLoopback = this.config.host === "127.0.0.1" || this.config.host === "localhost";
    if (!this.config.apiKey) {
      // Must require auth if bound outside loopback
      if (!isLoopback) return false;
      return true;
    }
    const authHeader = req.headers["authorization"];
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return false;
    }
    const token = authHeader.slice(7).trim();
    const tokenBuf = Buffer.from(token);
    const keyBuf = Buffer.from(this.config.apiKey);
    if (tokenBuf.length !== keyBuf.length) return false;
    return timingSafeEqual(tokenBuf, keyBuf);
  }

  private async handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const p = this.path(req);
    try {
      if (req.method === "GET" && p === "/health") {
        return this.json(res, 200, { ok: true });
      }

      if (!this.authenticate(req)) {
        return this.json(res, 401, { error: "Unauthorized: Invalid or missing API key" });
      }

      if (req.method === "GET" && p === "/channels") {
        return this.json(res, 200, { channels: this.hub.listChannels() });
      }
      if (req.method === "POST" && p === "/send") {
        const body = await this.readJson(req);
        const ch = this.hub.getChannel(body.channel);
        if (!ch) return this.json(res, 404, { error: `Channel '${body.channel}' not found` });
        const result = await ch.sendText(body.chatId, body.text, { replyToId: body.replyToId });
        return this.json(res, 200, result);
      }
      if (req.method === "POST" && p === "/react") {
        const body = await this.readJson(req);
        const ch = this.hub.getChannel(body.channel);
        if (!ch) return this.json(res, 404, { error: `Channel '${body.channel}' not found` });
        if (!ch.addReaction) return this.json(res, 400, { error: "Channel does not support reactions" });
        await ch.addReaction(body.chatId, body.messageId, body.emoji);
        return this.json(res, 200, { success: true });
      }
      if (req.method === "GET" && p === "/events") {
        if (this.sseClients.size >= 50) {
          return this.json(res, 429, { error: "Too many active SSE connections" });
        }
        return this.handleSse(res);
      }
      this.json(res, 404, { error: "Not found" });
    } catch (err: any) {
      const isPayloadTooLarge = err.message === "Payload too large";
      const status = isPayloadTooLarge ? 413 : 500;
      const safeError = isPayloadTooLarge
        ? "Payload too large. Request body exceeds configured limit."
        : "An internal server error occurred while processing the request.";
      this.json(res, status, { error: safeError });
    }
  }

  private handleSse(res: ServerResponse): void {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });
    res.write(`data: ${JSON.stringify({ type: "connected" })}\n\n`);
    this.sseClients.add(res);
    res.on("close", () => this.sseClients.delete(res));
  }

  private broadcastSse(msg: UnifiedMessage): void {
    // Strip raw vendor payload for security before streaming over SSE
    const { raw, ...safeMessage } = msg;
    const payload = `data: ${JSON.stringify(safeMessage)}\n\n`;
    for (const client of this.sseClients) {
      client.write(payload);
    }
  }

  private json(res: ServerResponse, status: number, body: unknown): void {
    const data = JSON.stringify(body);
    res.writeHead(status, {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(data),
    });
    res.end(data);
  }

  private readJson(req: IncomingMessage): Promise<any> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      let totalBytes = 0;

      req.on("data", (c: Buffer) => {
        totalBytes += c.length;
        if (totalBytes > this.config.maxBodySize) {
          req.destroy(new Error("Payload too large"));
          return;
        }
        chunks.push(c);
      });

      req.on("end", () => {
        try {
          resolve(JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"));
        } catch (err) {
          reject(err);
        }
      });
      req.on("error", reject);
    });
  }
}
