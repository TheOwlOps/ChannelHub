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

// src/channels/tiktok/index.ts
var exports_tiktok = {};
__export(exports_tiktok, {
  TikTokBusinessAdapter: () => TikTokBusinessAdapter
});
module.exports = __toCommonJS(exports_tiktok);

// src/channels/tiktok/adapter.ts
var import_node_crypto = require("node:crypto");

// src/core/contracts/adapter.ts
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

// src/channels/tiktok/adapter.ts
class TikTokBusinessAdapter extends BaseChannel {
  name = "tiktok";
  capabilities = {
    inbound: true,
    outbound: true,
    media: ["image"],
    reactions: false,
    editing: false,
    typing: false,
    mode: "webhook"
  };
  config;
  apiRoot;
  maxAgeSec;
  constructor(config) {
    super();
    if (!config.appId)
      throw new Error("TikTokBusinessAdapter: appId is required");
    if (!config.clientSecret)
      throw new Error("TikTokBusinessAdapter: clientSecret is required");
    if (!config.accessToken)
      throw new Error("TikTokBusinessAdapter: accessToken is required");
    this.config = config;
    this.apiRoot = (config.apiRoot || "https://business-api.tiktok.com").replace(/\/$/, "");
    this.maxAgeSec = config.maxWebhookAgeSeconds ?? 300;
  }
  async connect(signal) {
    this.assertNotAborted(signal);
    this.setConnected(true);
  }
  async disconnect(signal) {
    this.assertNotAborted(signal);
    this.setConnected(false);
  }
  verifySignature(rawBody, signatureHeader) {
    if (!signatureHeader)
      return false;
    const params = new Map;
    for (const part of signatureHeader.split(",")) {
      const idx = part.indexOf("=");
      if (idx !== -1) {
        params.set(part.slice(0, idx).trim(), part.slice(idx + 1).trim());
      }
    }
    const timestampStr = params.get("t");
    const receivedSig = params.get("s");
    if (!timestampStr || !receivedSig)
      return false;
    const timestampSec = Number(timestampStr);
    if (isNaN(timestampSec))
      return false;
    const nowSec = Math.floor(Date.now() / 1000);
    if (Math.abs(nowSec - timestampSec) > this.maxAgeSec) {
      return false;
    }
    const bodyStr = typeof rawBody === "string" ? rawBody : rawBody.toString("utf8");
    const message = `${timestampStr}.${bodyStr}`;
    const expectedHex = import_node_crypto.createHmac("sha256", this.config.clientSecret).update(message, "utf8").digest("hex");
    const expectedBuf = Buffer.from(expectedHex, "utf8");
    const receivedBuf = Buffer.from(receivedSig, "utf8");
    if (expectedBuf.length !== receivedBuf.length)
      return false;
    return import_node_crypto.timingSafeEqual(expectedBuf, receivedBuf);
  }
  async handleWebhook(rawBody, signatureHeader) {
    if (!this.verifySignature(rawBody, signatureHeader)) {
      return false;
    }
    try {
      const bodyStr = typeof rawBody === "string" ? rawBody : rawBody.toString("utf8");
      const envelope = JSON.parse(bodyStr);
      if (envelope.event !== "message.receive") {
        return true;
      }
      const rawMsg = JSON.parse(envelope.content);
      const unified = this.normalizeMessage(rawMsg);
      if (unified) {
        await this.dispatchMessage(unified);
      }
      return true;
    } catch (err) {
      this.emit("error", new Error(`TikTokBusinessAdapter webhook parse error: ${err.message}`));
      return false;
    }
  }
  normalizeMessage(msg) {
    if (!msg || !msg.message_id || !msg.conversation_id)
      return null;
    const unified = {
      id: String(msg.message_id),
      channel: "tiktok",
      sender: {
        id: String(msg.sender_open_id),
        name: msg.sender_display_name || undefined,
        isBot: false
      },
      chat: {
        id: String(msg.conversation_id),
        type: "dm"
      },
      content: {
        text: msg.text || "",
        attachments: msg.image_url ? [
          {
            type: "image",
            url: msg.image_url
          }
        ] : undefined
      },
      raw: msg,
      timestamp: (msg.create_time || Math.floor(Date.now() / 1000)) * 1000
    };
    return unified;
  }
  async sendText(conversationId, text, options) {
    this.assertNotAborted(options?.signal);
    const payload = {
      conversation_id: conversationId,
      message_type: "TEXT",
      content: { text }
    };
    return this.postMessage(conversationId, payload, options?.signal);
  }
  async sendMedia(conversationId, media, options) {
    this.assertNotAborted(options?.signal);
    if (media.type !== "image") {
      throw new Error(`TikTokBusinessAdapter: media type "${media.type}" is not supported. Only "image" is supported by TikTok Business API.`);
    }
    const mediaId = typeof media.source === "string" ? media.source : media.source.toString();
    const payload = {
      conversation_id: conversationId,
      message_type: "IMAGE",
      content: { media_id: mediaId }
    };
    return this.postMessage(conversationId, payload, options?.signal);
  }
  async postMessage(conversationId, payload, signal) {
    const url = `${this.apiRoot}/open_api/v1.3/business/message/send/`;
    const res = await fetch(url, {
      method: "POST",
      signal,
      headers: {
        "Content-Type": "application/json",
        "Access-Token": this.config.accessToken
      },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`TikTok API error: HTTP ${res.status} [REDACTED]`);
    }
    const data = await res.json();
    if (data.code !== 0) {
      throw new Error(`TikTok API error code ${data.code}: ${data.message || "Unknown error"}`);
    }
    return {
      messageId: String(data.data?.message_id || Date.now()),
      chatId: conversationId,
      timestamp: Date.now()
    };
  }
}
