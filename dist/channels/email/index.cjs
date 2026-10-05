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

// src/channels/email/index.ts
var exports_email = {};
__export(exports_email, {
  EmailChannelAdapter: () => EmailChannelAdapter
});
module.exports = __toCommonJS(exports_email);

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

// src/channels/email/adapter.ts
class EmailChannelAdapter extends BaseChannel {
  name = "email";
  config;
  constructor(config) {
    super();
    if (!config.apiKey)
      throw new Error("EmailAdapter requires apiKey");
    if (!config.fromAddress)
      throw new Error("EmailAdapter requires fromAddress");
    this.config = {
      provider: "resend",
      ...config
    };
  }
  async connect(signal) {
    if (signal?.aborted)
      throw new Error("Connection aborted");
    if (this.config.provider === "resend") {
      const base = this.config.apiBaseUrl || "https://api.resend.com";
      const res = await fetch(`${base}/api-keys`, {
        signal,
        headers: { Authorization: `Bearer ${this.config.apiKey}` }
      });
      if (res.status === 401) {
        throw new Error("Invalid Resend API Key provided to EmailChannelAdapter");
      }
    }
    this.setConnected(true);
  }
  async disconnect() {
    this.setConnected(false);
  }
  async sendText(chatId, text, options) {
    if (options?.signal?.aborted)
      throw new Error("Send aborted");
    const subject = options?.subject || this.config.defaultSubject || "Message from AI Agent";
    const recipient = chatId;
    if (this.config.provider === "resend") {
      const base = this.config.apiBaseUrl || "https://api.resend.com";
      const body = {
        from: this.config.fromAddress,
        to: [recipient],
        subject,
        text
      };
      if (options?.html)
        body.html = options.html;
      if (options?.cc)
        body.cc = options.cc;
      if (options?.bcc)
        body.bcc = options.bcc;
      if (options?.replyTo)
        body.reply_to = options.replyTo;
      const res = await fetch(`${base}/emails`, {
        method: "POST",
        signal: options?.signal,
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      });
      if (!res.ok) {
        const err = await res.text();
        throw new Error(`Resend API failed (${res.status}): ${err}`);
      }
      const data = await res.json();
      return {
        messageId: data.id || `email_${Date.now()}`,
        chatId: recipient,
        timestamp: Date.now()
      };
    } else {
      const base = this.config.apiBaseUrl || "https://api.sendgrid.com/v3";
      const body = {
        personalizations: [{ to: [{ email: recipient }] }],
        from: { email: this.config.fromAddress },
        subject,
        content: [{ type: "text/plain", value: text }]
      };
      if (options?.html) {
        body.content.push({ type: "text/html", value: options.html });
      }
      const res = await fetch(`${base}/mail/send`, {
        method: "POST",
        signal: options?.signal,
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      });
      if (!res.ok) {
        const err = await res.text();
        throw new Error(`SendGrid API failed (${res.status}): ${err}`);
      }
      return {
        messageId: res.headers.get("x-message-id") || `sg_${Date.now()}`,
        chatId: recipient,
        timestamp: Date.now()
      };
    }
  }
  async sendMedia(chatId, media, options) {
    if (options?.signal?.aborted)
      throw new Error("Send aborted");
    let base64Content = "";
    if (typeof media.source === "string") {
      base64Content = Buffer.from(media.source).toString("base64");
    } else if (media.source instanceof Uint8Array || Buffer.isBuffer(media.source)) {
      base64Content = Buffer.from(media.source).toString("base64");
    }
    const filename = media.filename || "attachment.dat";
    const subject = options?.subject || this.config.defaultSubject || `Attachment: ${filename}`;
    if (this.config.provider === "resend") {
      const base = this.config.apiBaseUrl || "https://api.resend.com";
      const body = {
        from: this.config.fromAddress,
        to: [chatId],
        subject,
        text: media.caption || `Attached file: ${filename}`,
        attachments: [
          {
            filename,
            content: base64Content
          }
        ]
      };
      const res = await fetch(`${base}/emails`, {
        method: "POST",
        signal: options?.signal,
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      });
      if (!res.ok) {
        const err = await res.text();
        throw new Error(`Resend sendMedia failed (${res.status}): ${err}`);
      }
      const data = await res.json();
      return {
        messageId: data.id || `email_${Date.now()}`,
        chatId,
        timestamp: Date.now()
      };
    } else {
      const base = this.config.apiBaseUrl || "https://api.sendgrid.com/v3";
      const body = {
        personalizations: [{ to: [{ email: chatId }] }],
        from: { email: this.config.fromAddress },
        subject,
        content: [{ type: "text/plain", value: media.caption || `Attached file: ${filename}` }],
        attachments: [
          {
            content: base64Content,
            filename,
            type: media.mimeType || "application/octet-stream",
            disposition: "attachment"
          }
        ]
      };
      const res = await fetch(`${base}/mail/send`, {
        method: "POST",
        signal: options?.signal,
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      });
      if (!res.ok) {
        const err = await res.text();
        throw new Error(`SendGrid sendMedia failed (${res.status}): ${err}`);
      }
      return {
        messageId: res.headers.get("x-message-id") || `sg_${Date.now()}`,
        chatId,
        timestamp: Date.now()
      };
    }
  }
  handleInboundWebhook(rawPayload) {
    const from = rawPayload.from || rawPayload.envelope?.from || "unknown@domain.com";
    const text = rawPayload.text || rawPayload.body || rawPayload.subject || "";
    const id = rawPayload.id || `inbound_email_${Date.now()}`;
    const unified = {
      id,
      channel: "email",
      chat: {
        id: from,
        type: "dm"
      },
      sender: {
        id: from,
        name: rawPayload.sender_name || from
      },
      content: {
        text
      },
      timestamp: Date.now(),
      raw: rawPayload
    };
    this.dispatchMessage(unified);
    return unified;
  }
}
