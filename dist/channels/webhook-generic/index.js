// src/channels/webhook-generic/adapter.ts
import { createHmac, timingSafeEqual } from "node:crypto";

// src/core/adapter.ts
import { EventEmitter } from "node:events";

class BaseChannel extends EventEmitter {
  get provider() {
    return this.name;
  }
  async dispatchMessage(msg) {
    const listeners = this.listeners("message");
    for (const listener of listeners) {
      try {
        await listener(msg);
      } catch (err) {
        this.emit("error", err);
      }
    }
  }
  get accountId() {
    return this.config?.accountId || "default";
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

// src/channels/webhook-generic/adapter.ts
class WebhookGenericAdapter extends BaseChannel {
  name;
  config;
  constructor(config) {
    super();
    if (!config.serviceName)
      throw new Error("WebhookGenericAdapterConfig.serviceName is required");
    this.name = config.serviceName;
    this.config = config;
  }
  async connect(_signal) {
    this.setConnected(true);
  }
  async disconnect() {
    this.setConnected(false);
  }
  verifySignature(payload, headerValue) {
    if (!this.config.webhookSecret)
      return true;
    if (!headerValue)
      return false;
    const prefix = this.config.signaturePrefix || "";
    let cleanHeader = headerValue;
    if (prefix && cleanHeader.startsWith(prefix)) {
      cleanHeader = cleanHeader.slice(prefix.length);
    }
    const expected = createHmac("sha256", this.config.webhookSecret).update(payload).digest("hex");
    const a = Buffer.from(expected);
    const b = Buffer.from(cleanHeader);
    if (a.length !== b.length)
      return false;
    return timingSafeEqual(a, b);
  }
  getByPath(obj, path) {
    if (!path)
      return;
    return path.split(".").reduce((acc, part) => acc && acc[part] !== undefined ? acc[part] : undefined, obj);
  }
  normalizePayload(payload) {
    const fm = this.config.fieldMap || {};
    const messageId = String(this.getByPath(payload, fm.messageId) || payload.id || `wh-${Date.now()}`);
    const senderId = String(this.getByPath(payload, fm.senderId) || payload.sender || payload.user || "webhook");
    const senderName = String(this.getByPath(payload, fm.senderName) || senderId);
    const chatId = String(this.getByPath(payload, fm.chatId) || payload.channel || payload.room || "default");
    const text = String(this.getByPath(payload, fm.text) || payload.message || payload.text || JSON.stringify(payload));
    return {
      channel: this.name,
      id: messageId,
      sender: { id: senderId, name: senderName },
      chat: { id: chatId, type: "group" },
      content: { text },
      timestamp: Date.now(),
      raw: payload
    };
  }
  async sendText(chatId, text, _options) {
    if (this.config.sendHandler) {
      return await this.config.sendHandler(chatId, text);
    }
    return {
      messageId: `sent-${Date.now()}`,
      chatId,
      timestamp: Date.now()
    };
  }
  async sendMedia(chatId, _media, _options) {
    throw new Error(`sendMedia is not implemented for generic webhook service "${this.name}".`);
  }
}
export {
  WebhookGenericAdapter
};
