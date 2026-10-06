var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __hasOwnProp = Object.prototype.hasOwnProperty;
function __accessProp(key) {
  return this[key];
}
var __toCommonJS = (from) => {
  var entry = (__moduleCache ??= new WeakMap).get(from), desc;
  if (entry)
    return entry;
  entry = __defProp({}, "__esModule", { value: true });
  if (from && typeof from === "object" || typeof from === "function") {
    for (var key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(entry, key))
        __defProp(entry, key, {
          get: __accessProp.bind(from, key),
          enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
        });
  }
  __moduleCache.set(from, entry);
  return entry;
};
var __moduleCache;
var __returnValue = (v) => v;
function __exportSetter(name, newValue) {
  this[name] = __returnValue.bind(null, newValue);
}
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, {
      get: all[name],
      enumerable: true,
      configurable: true,
      set: __exportSetter.bind(all, name)
    });
};

// src/channels/webhook-generic/index.ts
var exports_webhook_generic = {};
__export(exports_webhook_generic, {
  WebhookGenericAdapter: () => WebhookGenericAdapter
});
module.exports = __toCommonJS(exports_webhook_generic);

// src/channels/webhook-generic/adapter.ts
var import_node_crypto = require("node:crypto");

// src/core/adapter.ts
var import_node_events = require("node:events");

class BaseChannel extends import_node_events.EventEmitter {
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
    const expected = import_node_crypto.createHmac("sha256", this.config.webhookSecret).update(payload).digest("hex");
    const a = Buffer.from(expected);
    const b = Buffer.from(cleanHeader);
    if (a.length !== b.length)
      return false;
    return import_node_crypto.timingSafeEqual(a, b);
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
