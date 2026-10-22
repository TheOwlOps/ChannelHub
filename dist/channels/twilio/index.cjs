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

// src/channels/twilio/index.ts
var exports_twilio = {};
__export(exports_twilio, {
  TwilioChannelAdapter: () => TwilioChannelAdapter
});
module.exports = __toCommonJS(exports_twilio);

// src/channels/twilio/adapter.ts
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

// src/channels/twilio/adapter.ts
class TwilioChannelAdapter extends BaseChannel {
  name = "twilio";
  capabilities = {
    inbound: true,
    outbound: true,
    media: ["image", "video", "audio", "file"],
    reactions: false,
    editing: false,
    typing: false,
    mode: "webhook"
  };
  config;
  apiRoot;
  constructor(config) {
    super();
    if (!config.accountSid)
      throw new Error("TwilioChannelAdapter: accountSid required");
    if (!config.authToken)
      throw new Error("TwilioChannelAdapter: authToken required");
    if (!config.fromNumber)
      throw new Error("TwilioChannelAdapter: fromNumber required");
    this.config = config;
    this.apiRoot = config.apiRoot || "https://api.twilio.com";
  }
  async connect(signal) {
    this.assertNotAborted(signal);
    this.setConnected(true);
  }
  async disconnect(signal) {
    this.assertNotAborted(signal);
    this.setConnected(false);
  }
  verifySignature(signatureHeader, url, postData) {
    if (!signatureHeader)
      return false;
    const sortedKeys = Object.keys(postData).sort();
    let dataStr = url;
    for (const k of sortedKeys) {
      dataStr += k + postData[k];
    }
    const expectedB64 = import_node_crypto.createHmac("sha1", this.config.authToken).update(dataStr, "utf8").digest("base64");
    const expectedBuf = Buffer.from(expectedB64, "utf8");
    const receivedBuf = Buffer.from(signatureHeader, "utf8");
    if (expectedBuf.length !== receivedBuf.length)
      return false;
    return import_node_crypto.timingSafeEqual(expectedBuf, receivedBuf);
  }
  async handleWebhook(postData, signatureHeader, exactUrl) {
    if (exactUrl && signatureHeader) {
      const isValid = this.verifySignature(signatureHeader, exactUrl, postData);
      if (!isValid)
        return false;
    }
    const unified = this.normalizeMessage(postData);
    if (unified) {
      await this.dispatchMessage(unified);
    }
    return true;
  }
  normalizeMessage(msg) {
    if (!msg || !msg.MessageSid)
      return null;
    let channelAlias = "sms";
    if (msg.From.startsWith("whatsapp:"))
      channelAlias = "whatsapp";
    const attachments = [];
    const numMedia = parseInt(msg.NumMedia || "0", 10);
    for (let i = 0;i < numMedia; i++) {
      const url = msg[`MediaUrl${i}`];
      const mime = msg[`MediaContentType${i}`];
      if (url) {
        let type = "file";
        if (mime?.startsWith("image/"))
          type = "image";
        else if (mime?.startsWith("video/"))
          type = "video";
        else if (mime?.startsWith("audio/"))
          type = "audio";
        attachments.push({ type, url, mimeType: mime });
      }
    }
    return {
      id: msg.MessageSid,
      channel: this.name,
      sender: {
        id: msg.From
      },
      chat: {
        id: msg.From,
        type: "dm"
      },
      content: {
        text: msg.Body || "",
        attachments: attachments.length > 0 ? attachments : undefined
      },
      raw: msg,
      timestamp: Date.now(),
      metadata: { twilioChannel: channelAlias }
    };
  }
  async sendText(chatId, text, options) {
    const params = new URLSearchParams;
    params.append("To", chatId);
    params.append("From", this.config.fromNumber);
    params.append("Body", text);
    return this.postTwilioMessage(params, options?.signal);
  }
  async sendMedia(chatId, media, options) {
    const params = new URLSearchParams;
    params.append("To", chatId);
    params.append("From", this.config.fromNumber);
    if (media.caption) {
      params.append("Body", media.caption);
    }
    if (typeof media.source !== "string" || !media.source.startsWith("http")) {
      throw new Error("TwilioChannelAdapter: media.source must be a public HTTP URL.");
    }
    params.append("MediaUrl", media.source);
    return this.postTwilioMessage(params, options?.signal);
  }
  async postTwilioMessage(params, signal) {
    const url = `${this.apiRoot}/2010-04-01/Accounts/${this.config.accountSid}/Messages.json`;
    const authBuf = Buffer.from(`${this.config.accountSid}:${this.config.authToken}`).toString("base64");
    const res = await fetch(url, {
      method: "POST",
      signal,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${authBuf}`
      },
      body: params
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Twilio API failed: HTTP ${res.status} [REDACTED]`);
    }
    const data = await res.json();
    return {
      messageId: data.sid,
      chatId: data.to,
      timestamp: Date.now()
    };
  }
}
