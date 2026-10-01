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

// src/channels/slack/adapter.ts
class SlackChannelAdapter extends BaseChannel {
  name = "slack";
  config;
  apiBase = "https://slack.com/api";
  ws;
  constructor(config) {
    super();
    this.config = config;
  }
  async connect(signal) {
    this.assertNotAborted(signal);
    if (!this.config.botToken)
      throw new Error("Slack botToken is required.");
    await this.callApi("auth.test", {});
    if (this.config.appToken) {
      const res = await fetch("https://slack.com/api/apps.connections.open", {
        method: "POST",
        headers: { Authorization: `Bearer ${this.config.appToken}` }
      });
      const data = await res.json();
      if (data.ok && data.url) {
        this.ws = new globalThis.WebSocket(data.url);
        this.ws.onopen = () => this.emit("status", { status: "connected" });
        this.ws.onmessage = (e) => {
          try {
            const payload = JSON.parse(e.data.toString());
            if (payload.type === "hello")
              return;
            if (payload.envelope_id) {
              this.ws?.send(JSON.stringify({ envelope_id: payload.envelope_id }));
            }
            if (payload.payload && payload.payload.event && payload.payload.event.type === "message") {
              const msg = this.normalizeEvent(payload.payload);
              if (msg)
                this.emit("message", msg);
            }
          } catch (err) {}
        };
        this.ws.onerror = (e) => this.emit("error", new Error("Slack Socket Error"));
        this.ws.onclose = () => this.emit("status", { status: "disconnected" });
      }
    }
    this.setConnected(true);
  }
  async disconnect(signal) {
    this.assertNotAborted(signal);
    if (this.ws) {
      this.ws.close();
      this.ws = undefined;
    }
    this.setConnected(false);
  }
  normalizeEvent(event) {
    const msg = event.event || event;
    if (!msg || msg.type !== "message")
      return null;
    if (msg.subtype === "bot_message" || msg.bot_id)
      return null;
    const isDm = msg.channel_type === "im" || msg.channel && msg.channel.startsWith("D");
    return {
      id: String(msg.client_msg_id || msg.ts),
      channel: "slack",
      sender: {
        id: String(msg.user || ""),
        isBot: Boolean(msg.bot_id)
      },
      chat: {
        id: String(msg.channel),
        type: isDm ? "dm" : "channel"
      },
      content: {
        text: msg.text || "",
        replyToId: msg.thread_ts ? String(msg.thread_ts) : undefined
      },
      raw: event,
      timestamp: msg.ts ? parseFloat(msg.ts) * 1000 : Date.now()
    };
  }
  async callApi(method, body) {
    const res = await fetch(`${this.apiBase}/${method}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.config.botToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Slack API ${method} failed: ${res.status} ${errText}`);
    }
    const data = await res.json();
    if (!data.ok) {
      throw new Error(`Slack API ${method} error: ${data.error}`);
    }
    return data;
  }
  async sendText(chatId, text, options) {
    const payload = {
      channel: chatId,
      text
    };
    if (options?.replyToId) {
      payload.thread_ts = options.replyToId;
    }
    const res = await this.callApi("chat.postMessage", payload);
    return {
      messageId: String(res.ts),
      chatId,
      timestamp: parseFloat(res.ts) * 1000
    };
  }
  async sendMedia(chatId, media, options) {
    const payload = {
      channel: chatId,
      text: media.caption || "Attachment"
    };
    if (options?.replyToId) {
      payload.thread_ts = options.replyToId;
    }
    const res = await this.callApi("chat.postMessage", payload);
    return {
      messageId: String(res.ts),
      chatId,
      timestamp: parseFloat(res.ts) * 1000
    };
  }
  async addReaction(chatId, messageId, emoji) {
    const cleanName = emoji.replace(/:/g, "");
    await this.callApi("reactions.add", {
      channel: chatId,
      timestamp: messageId,
      name: cleanName
    });
  }
  async sendTyping(chatId) {}
  async editText(chatId, messageId, text) {
    const res = await this.callApi("chat.update", {
      channel: chatId,
      ts: messageId,
      text
    });
    return {
      messageId: String(res.ts || messageId),
      chatId,
      timestamp: Date.now()
    };
  }
}
export {
  SlackChannelAdapter
};
