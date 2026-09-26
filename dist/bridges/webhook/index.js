// src/bridges/webhook/index.ts
import { createServer } from "node:http";

class WebhookBridge {
  hub;
  config;
  server = null;
  sseClients = new Set;
  constructor(hub, config = {}) {
    this.hub = hub;
    this.config = {
      port: config.port ?? 8788,
      host: config.host ?? "0.0.0.0",
      pathPrefix: config.pathPrefix ?? ""
    };
    hub.onMessage(async (ctx) => {
      this.broadcastSse(ctx.message);
    });
  }
  async start() {
    this.server = createServer((req, res) => this.handle(req, res));
    await new Promise((resolve) => {
      this.server.listen(this.config.port, this.config.host, () => resolve());
    });
  }
  async stop() {
    for (const client of this.sseClients) {
      client.end();
    }
    this.sseClients.clear();
    if (this.server) {
      await new Promise((resolve, reject) => {
        this.server.close((err) => err ? reject(err) : resolve());
      });
      this.server = null;
    }
  }
  path(req) {
    const url = req.url || "/";
    const bare = url.split("?")[0];
    return bare.startsWith(this.config.pathPrefix) ? bare.slice(this.config.pathPrefix.length) || "/" : bare;
  }
  async handle(req, res) {
    const p = this.path(req);
    try {
      if (req.method === "GET" && p === "/health") {
        return this.json(res, 200, { ok: true });
      }
      if (req.method === "GET" && p === "/channels") {
        return this.json(res, 200, { channels: this.hub.listChannels() });
      }
      if (req.method === "POST" && p === "/send") {
        const body = await this.readJson(req);
        const ch = this.hub.getChannel(body.channel);
        if (!ch)
          return this.json(res, 404, { error: `Channel '${body.channel}' not found` });
        const result = await ch.sendText(body.chatId, body.text, { replyToId: body.replyToId });
        return this.json(res, 200, result);
      }
      if (req.method === "POST" && p === "/react") {
        const body = await this.readJson(req);
        const ch = this.hub.getChannel(body.channel);
        if (!ch)
          return this.json(res, 404, { error: `Channel '${body.channel}' not found` });
        if (!ch.addReaction)
          return this.json(res, 400, { error: "Channel does not support reactions" });
        await ch.addReaction(body.chatId, body.messageId, body.emoji);
        return this.json(res, 200, { success: true });
      }
      if (req.method === "GET" && p === "/events") {
        return this.handleSse(res);
      }
      this.json(res, 404, { error: "Not found" });
    } catch (err) {
      this.json(res, 500, { error: err.message || String(err) });
    }
  }
  handleSse(res) {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive"
    });
    res.write(`data: ${JSON.stringify({ type: "connected" })}

`);
    this.sseClients.add(res);
    res.on("close", () => this.sseClients.delete(res));
  }
  broadcastSse(msg) {
    const payload = `data: ${JSON.stringify(msg)}

`;
    for (const client of this.sseClients) {
      client.write(payload);
    }
  }
  json(res, status, body) {
    const data = JSON.stringify(body);
    res.writeHead(status, {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(data)
    });
    res.end(data);
  }
  readJson(req) {
    return new Promise((resolve, reject) => {
      const chunks = [];
      req.on("data", (c) => chunks.push(c));
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
export {
  WebhookBridge
};
