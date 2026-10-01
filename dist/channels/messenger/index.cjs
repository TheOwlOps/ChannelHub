var __create = Object.create;
var __getProtoOf = Object.getPrototypeOf;
var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __hasOwnProp = Object.prototype.hasOwnProperty;
function __accessProp(key) {
  return this[key];
}
var __toESMCache_node;
var __toESMCache_esm;
var __toESM = (mod, isNodeMode, target) => {
  var canCache = mod != null && typeof mod === "object";
  if (canCache) {
    var cache = isNodeMode ? __toESMCache_node ??= new WeakMap : __toESMCache_esm ??= new WeakMap;
    var cached = cache.get(mod);
    if (cached)
      return cached;
  }
  target = mod != null ? __create(__getProtoOf(mod)) : {};
  const to = isNodeMode || !mod || !mod.__esModule || !__hasOwnProp.call(mod, "default") ? __defProp(target, "default", { value: mod, enumerable: true }) : target;
  if (mod && typeof mod === "object" || typeof mod === "function") {
    for (let key of __getOwnPropNames(mod))
      if (!__hasOwnProp.call(to, key))
        __defProp(to, key, {
          get: __accessProp.bind(mod, key),
          enumerable: true
        });
  }
  if (canCache)
    cache.set(mod, to);
  return to;
};
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

// src/channels/messenger/index.ts
var exports_messenger = {};
__export(exports_messenger, {
  MessengerChannelAdapter: () => MessengerChannelAdapter
});
module.exports = __toCommonJS(exports_messenger);

// src/channels/messenger/adapter.ts
var import_node_http = __toESM(require("node:http"), 1);

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

// src/channels/messenger/adapter.ts
class MessengerChannelAdapter extends BaseChannel {
  name = "messenger";
  capabilities = {
    inbound: true,
    outbound: true,
    media: ["image", "video", "file", "audio", "animation", "sticker"],
    reactions: true,
    editing: false,
    typing: true,
    mode: "webhook"
  };
  config;
  apiBase;
  server;
  constructor(config) {
    super();
    this.config = config;
    const version = config.apiVersion || "v19.0";
    this.apiBase = `https://graph.facebook.com/${version}`;
  }
  async connect(signal) {
    this.assertNotAborted(signal);
    if (!this.config.pageAccessToken) {
      throw new Error("Messenger pageAccessToken is required.");
    }
    const res = await fetch(`${this.apiBase}/me`, {
      signal,
      headers: { Authorization: `Bearer ${this.config.pageAccessToken}` }
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Failed to authenticate with Messenger Graph API: ${err}`);
    }
    if (this.config.port) {
      const path = this.config.webhookPath || "/webhook";
      this.server = import_node_http.default.createServer(async (req, res) => {
        const url = new URL(req.url || "/", `http://${req.headers.host}`);
        if (url.pathname !== path) {
          res.writeHead(404).end("Not Found");
          return;
        }
        if (req.method === "GET") {
          const mode = url.searchParams.get("hub.mode") || "";
          const token = url.searchParams.get("hub.verify_token") || "";
          const challenge = url.searchParams.get("hub.challenge") || "";
          const verified = this.verifyWebhook(mode, token, challenge);
          if (verified) {
            res.writeHead(200, { "Content-Type": "text/plain" }).end(verified);
          } else {
            res.writeHead(403).end("Forbidden");
          }
          return;
        }
        if (req.method === "POST") {
          let body = "";
          req.on("data", (chunk) => {
            body += chunk;
            if (body.length > 1024 * 1024)
              req.destroy();
          });
          req.on("end", async () => {
            try {
              const data = JSON.parse(body);
              const msgs = this.normalizeEvent(data);
              for (const m of msgs) {
                await this.dispatchMessage(m);
              }
              res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify({ status: "ok" }));
            } catch (err) {
              res.writeHead(400).end("Bad Request");
            }
          });
          return;
        }
        res.writeHead(405).end("Method Not Allowed");
      });
      await new Promise((resolve) => {
        this.server?.listen(this.config.port, "0.0.0.0", () => {
          resolve();
        });
      });
    }
    this.setConnected(true);
  }
  async disconnect(signal) {
    this.assertNotAborted(signal);
    if (this.server) {
      await new Promise((resolve) => this.server?.close(() => resolve()));
      this.server = undefined;
    }
    this.setConnected(false);
  }
  verifyWebhook(mode, token, challenge) {
    if (mode === "subscribe" && token === this.config.verifyToken) {
      return challenge;
    }
    return null;
  }
  normalizeEvent(body) {
    const messages = [];
    if (body?.object !== "page" || !Array.isArray(body?.entry)) {
      return messages;
    }
    for (const entry of body.entry) {
      if (!Array.isArray(entry.messaging))
        continue;
      for (const event of entry.messaging) {
        if (!event.message && !event.postback)
          continue;
        const senderId = event.sender?.id || "";
        let text = event.message?.text || event.postback?.title || event.postback?.payload || "";
        const attachments = [];
        if (event.message?.sticker_id) {
          attachments.push({
            type: "image",
            url: event.message?.attachments?.[0]?.payload?.url || `https://facebook.com/sticker/${event.message.sticker_id}`,
            filename: `sticker_${event.message.sticker_id}.png`
          });
        }
        if (Array.isArray(event.message?.attachments)) {
          for (const att of event.message.attachments) {
            let type = "file";
            let url = att.payload?.url || att.url || "";
            let filename = att.payload?.name || att.title || undefined;
            if (att.type === "image")
              type = "image";
            else if (att.type === "video")
              type = "video";
            else if (att.type === "audio")
              type = "audio";
            else if (att.type === "location") {
              type = "file";
              const lat = att.payload?.coordinates?.lat;
              const long = att.payload?.coordinates?.long;
              if (lat != null && long != null) {
                url = `https://www.google.com/maps?q=${lat},${long}`;
                filename = "location.json";
                if (!text)
                  text = `\uD83D\uDCCD [Shared Location: ${lat}, ${long}]`;
              }
            } else if (att.type === "fallback") {
              type = "file";
              if (!text)
                text = `\uD83D\uDD17 [Shared Link: ${att.title || "URL"}]`;
            } else {
              type = "file";
            }
            if (filename) {
              filename = filename.replace(/[\/\\]/g, "_").replace(/\0/g, "");
            }
            if (att.type === "image" && att.payload?.sticker_id)
              continue;
            attachments.push({ type, url, filename });
          }
        }
        messages.push({
          id: event.message?.mid || event.postback?.mid || `fb_${Date.now()}`,
          channel: this.name,
          sender: {
            id: senderId,
            name: undefined
          },
          chat: {
            id: senderId,
            type: "dm"
          },
          content: {
            text,
            attachments,
            replyToId: event.message?.reply_to?.mid
          },
          raw: event,
          timestamp: event.timestamp || Date.now()
        });
      }
    }
    return messages;
  }
  async sendText(chatId, text, options) {
    const payload = {
      recipient: { id: chatId },
      message: { text }
    };
    if (options?.replyToId) {
      payload.message.reply_to = { mid: options.replyToId };
    }
    const res = await this.callApi("POST", "/me/messages", payload, options?.signal);
    return {
      messageId: res.message_id || res.recipient_id || `msg_${Date.now()}`,
      chatId,
      timestamp: Date.now()
    };
  }
  async sendMedia(chatId, media, options) {
    if (media.type === "sticker" && typeof media.source === "string" && /^\d+$/.test(media.source)) {
      const payload = {
        recipient: { id: chatId },
        message: {
          attachment: {
            type: "image",
            payload: { sticker_id: Number(media.source) }
          }
        }
      };
      if (options?.replyToId)
        payload.message.reply_to = { mid: options.replyToId };
      const res = await this.callApi("POST", "/me/messages", payload, options?.signal);
      return {
        messageId: res.message_id || res.recipient_id || `msg_${Date.now()}`,
        chatId,
        timestamp: Date.now()
      };
    }
    const attachmentType = media.type === "sticker" || media.type === "animation" ? "image" : media.type;
    if (typeof media.source === "string" && (media.source.startsWith("http://") || media.source.startsWith("https://"))) {
      const payload = {
        recipient: { id: chatId },
        message: {
          attachment: {
            type: attachmentType,
            payload: {
              url: media.source,
              is_reusable: true
            }
          }
        }
      };
      if (options?.replyToId) {
        payload.message.reply_to = { mid: options.replyToId };
      }
      const res = await this.callApi("POST", "/me/messages", payload, options?.signal);
      return {
        messageId: res.message_id || res.recipient_id || `msg_${Date.now()}`,
        chatId,
        timestamp: Date.now()
      };
    }
    let buffer;
    let mimeType = media.mimeType;
    let filename = media.filename || "file";
    if (typeof media.source === "string") {
      const fs = await import("node:fs");
      const path = await import("node:path");
      const resolvedPath = path.resolve(media.source);
      if (!fs.existsSync(resolvedPath) || !fs.statSync(resolvedPath).isFile()) {
        throw new Error(`Media file not found or is invalid: ${media.source}`);
      }
      buffer = new Uint8Array(fs.readFileSync(resolvedPath));
      if (!media.filename) {
        filename = path.basename(resolvedPath);
      }
    } else {
      buffer = new Uint8Array(media.source);
    }
    const fileSize = buffer.byteLength;
    if (fileSize > 104857600) {
      throw new Error(`Messenger attachment limit exceeded: File size is ${(fileSize / 1048576).toFixed(1)}MB. Meta Messenger caps file/video uploads at 100MB. Please compress the file or provide a streaming URL.`);
    }
    if (!mimeType) {
      const ext = filename.split(".").pop()?.toLowerCase();
      if (ext === "mp4")
        mimeType = "video/mp4";
      else if (ext === "mov")
        mimeType = "video/quicktime";
      else if (ext === "webm")
        mimeType = "video/webm";
      else if (ext === "avi")
        mimeType = "video/x-msvideo";
      else if (ext === "mkv")
        mimeType = "video/x-matroska";
      else if (ext === "jpg" || ext === "jpeg")
        mimeType = "image/jpeg";
      else if (ext === "png")
        mimeType = "image/png";
      else if (ext === "gif")
        mimeType = "image/gif";
      else if (ext === "webp")
        mimeType = "image/webp";
      else if (ext === "mp3")
        mimeType = "audio/mpeg";
      else if (ext === "wav")
        mimeType = "audio/wav";
      else if (ext === "ogg")
        mimeType = "audio/ogg";
      else if (ext === "m4a")
        mimeType = "audio/mp4";
      else if (ext === "pdf")
        mimeType = "application/pdf";
      else
        mimeType = "application/octet-stream";
    }
    const blob = new Blob([buffer], { type: mimeType });
    if (fileSize > 26214400) {
      const uploadFormData = new FormData;
      uploadFormData.append("message", JSON.stringify({
        attachment: {
          type: attachmentType,
          payload: { is_reusable: true }
        }
      }));
      uploadFormData.append("filedata", blob, filename);
      const uploadUrl = `${this.apiBase}/me/message_attachments`;
      const uploadRes = await fetch(uploadUrl, {
        method: "POST",
        signal: options?.signal,
        headers: {
          Authorization: `Bearer ${this.config.pageAccessToken}`
        },
        body: uploadFormData
      });
      if (uploadRes.ok) {
        const uploadData = await uploadRes.json();
        if (uploadData.attachment_id) {
          const payload = {
            recipient: { id: chatId },
            message: {
              attachment: {
                type: attachmentType,
                payload: { attachment_id: uploadData.attachment_id }
              }
            }
          };
          if (options?.replyToId)
            payload.message.reply_to = { mid: options.replyToId };
          const res = await this.callApi("POST", "/me/messages", payload, options?.signal);
          return {
            messageId: res.message_id || res.recipient_id || `msg_${Date.now()}`,
            chatId,
            timestamp: Date.now()
          };
        }
      }
    }
    const formData = new FormData;
    formData.append("recipient", JSON.stringify({ id: chatId }));
    formData.append("message", JSON.stringify({
      attachment: {
        type: attachmentType,
        payload: {}
      }
    }));
    formData.append("filedata", blob, filename);
    const url = `${this.apiBase}/me/messages`;
    const response = await fetch(url, {
      method: "POST",
      signal: options?.signal,
      headers: {
        Authorization: `Bearer ${this.config.pageAccessToken}`
      },
      body: formData
    });
    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Messenger API Error (${response.status}): ${err}`);
    }
    const res = await response.json();
    return {
      messageId: res.message_id || res.recipient_id || `msg_${Date.now()}`,
      chatId,
      timestamp: Date.now()
    };
  }
  async sendTyping(chatId, options) {
    await this.callApi("POST", "/me/messages", {
      recipient: { id: chatId },
      sender_action: "typing_on"
    }, options?.signal);
  }
  async callApi(method, path, body, signal) {
    const url = `${this.apiBase}${path}`;
    const headers = {
      Authorization: `Bearer ${this.config.pageAccessToken}`,
      "Content-Type": "application/json"
    };
    const res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Messenger API Error (${res.status}): ${err}`);
    }
    return await res.json();
  }
}
