// src/core/adapter.ts
import { EventEmitter } from "node:events";

class BaseChannel extends EventEmitter {
  get provider() {
    return this.name;
  }
  get accountId() {
    return "default";
  }
  _connected = false;
  isConnected() {
    return this._connected;
  }
  setConnected(value) {
    const changed = this._connected !== value;
    this._connected = value;
    if (changed) {
      this.emit("status", value ? "connected" : "disconnected");
    }
  }
  assertNotAborted(signal) {
    if (signal?.aborted) {
      throw signal.reason || new Error("Operation aborted");
    }
  }
  async sendGif(chatId, urlOrPath, caption, options) {
    return this.sendMedia(chatId, {
      type: "animation",
      source: urlOrPath,
      caption
    }, options);
  }
  async sendSticker(chatId, stickerIdOrUrl, options) {
    return this.sendMedia(chatId, {
      type: "sticker",
      source: stickerIdOrUrl
    }, options);
  }
}

// src/channels/discord/adapter.ts
class DiscordChannelAdapter extends BaseChannel {
  name = "discord";
  config;
  apiBase = "https://discord.com/api/v10";
  ws;
  heartbeatTimer;
  sequence = null;
  constructor(config) {
    super();
    this.config = config;
  }
  async connect(signal) {
    this.assertNotAborted(signal);
    if (!this.config.botToken)
      throw new Error("Discord botToken is required.");
    await this.callApi("GET", "/users/@me");
    this.setConnected(true);
    if (this.config.autoStart !== false && typeof globalThis.WebSocket !== "undefined") {
      this.connectGateway();
    }
  }
  connectGateway() {
    const ws = new globalThis.WebSocket("wss://gateway.discord.gg/?v=10&encoding=json");
    this.ws = ws;
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data.toString());
        if (data.s !== null)
          this.sequence = data.s;
        if (data.op === 10) {
          const interval = data.d.heartbeat_interval;
          this.heartbeatTimer = setInterval(() => {
            ws.send(JSON.stringify({ op: 1, d: this.sequence }));
          }, interval);
          ws.send(JSON.stringify({
            op: 2,
            d: {
              token: this.config.botToken,
              intents: this.config.intents ?? 33280,
              properties: {
                os: process.platform,
                browser: "channelhub",
                device: "channelhub"
              }
            }
          }));
        }
        if (data.op === 0 && data.t === "MESSAGE_CREATE") {
          const msg = this.normalizeEvent(data.d);
          if (msg)
            this.emit("message", msg);
        }
      } catch (err) {}
    };
    ws.onclose = () => {
      if (this.heartbeatTimer)
        clearInterval(this.heartbeatTimer);
    };
  }
  async disconnect(signal) {
    this.assertNotAborted(signal);
    if (this.heartbeatTimer)
      clearInterval(this.heartbeatTimer);
    if (this.ws) {
      this.ws.close();
      this.ws = undefined;
    }
    this.setConnected(false);
  }
  normalizeEvent(event) {
    if (!event || event.type !== 0 && !event.content && !event.author) {
      if (!event?.content && !event?.d?.content)
        return null;
    }
    const msg = event.d || event;
    if (!msg.content && !msg.attachments?.length)
      return null;
    if (msg.author?.bot)
      return null;
    const isDm = !msg.guild_id;
    return {
      id: String(msg.id),
      channel: "discord",
      sender: {
        id: String(msg.author?.id ?? ""),
        name: msg.author?.global_name || msg.author?.username,
        username: msg.author?.username,
        isBot: Boolean(msg.author?.bot),
        avatarUrl: msg.author?.avatar ? `https://cdn.discordapp.com/avatars/${msg.author.id}/${msg.author.avatar}.png` : undefined
      },
      chat: {
        id: String(msg.channel_id),
        type: isDm ? "dm" : "channel",
        title: undefined
      },
      content: {
        text: msg.content || "",
        attachments: (msg.attachments || []).map((a) => ({
          type: a.content_type?.startsWith("image/") ? "image" : a.content_type?.startsWith("video/") ? "video" : "file",
          url: a.url,
          filename: a.filename,
          mimeType: a.content_type,
          size: a.size
        })),
        replyToId: msg.message_reference?.message_id ? String(msg.message_reference.message_id) : undefined
      },
      raw: event,
      timestamp: msg.timestamp ? Date.parse(msg.timestamp) : Date.now()
    };
  }
  async callApi(method, path, body) {
    const res = await fetch(`${this.apiBase}${path}`, {
      method,
      headers: {
        Authorization: `Bot ${this.config.botToken}`,
        "Content-Type": "application/json"
      },
      body: body ? JSON.stringify(body) : undefined
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Discord API ${method} ${path} failed: ${res.status} ${errText}`);
    }
    if (res.status === 204)
      return null;
    return res.json();
  }
  async sendText(chatId, text, options) {
    const payload = { content: text };
    if (options?.replyToId) {
      payload.message_reference = { message_id: options.replyToId };
    }
    const res = await this.callApi("POST", `/channels/${chatId}/messages`, payload);
    return {
      messageId: String(res.id),
      chatId,
      timestamp: Date.parse(res.timestamp) || Date.now()
    };
  }
  async sendMedia(chatId, media, options) {
    const payload = {
      content: media.caption || ""
    };
    if (typeof media.source === "string") {
      payload.embeds = [{ image: { url: media.source } }];
    }
    if (options?.replyToId) {
      payload.message_reference = { message_id: options.replyToId };
    }
    const res = await this.callApi("POST", `/channels/${chatId}/messages`, payload);
    return {
      messageId: String(res.id),
      chatId,
      timestamp: Date.parse(res.timestamp) || Date.now()
    };
  }
  async addReaction(chatId, messageId, emoji) {
    const encoded = encodeURIComponent(emoji);
    await this.callApi("PUT", `/channels/${chatId}/messages/${messageId}/reactions/${encoded}/@me`);
  }
  async sendTyping(chatId) {
    await this.callApi("POST", `/channels/${chatId}/typing`, {});
  }
  async editText(chatId, messageId, text) {
    const res = await this.callApi("PATCH", `/channels/${chatId}/messages/${messageId}`, {
      content: text
    });
    return {
      messageId: String(res.id || messageId),
      chatId,
      timestamp: Date.now()
    };
  }
}
export {
  DiscordChannelAdapter
};
