// src/channels/messenger/adapter.ts
import http from "node:http";
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
    if (this.config.checkPermissionsOnConnect !== false) {
      try {
        const perms = await this.getPermissions(signal);
        const hasMessaging = perms.some((p) => (p.permission === "pages_messaging" || p.permission === "messages") && p.status === "granted");
        if (!hasMessaging) {
          console.warn("[MessengerChannelAdapter] ⚠️ Warning: Token is missing 'pages_messaging' permission. Messages may fail to send/receive.");
        }
      } catch (err) {
        console.warn(`[MessengerChannelAdapter] Unable to inspect token permissions: ${err.message}`);
      }
    }
    if (this.config.autoSubscribePage) {
      await this.subscribePage(this.config.subscribedFields, signal);
    }
    if (this.config.port) {
      const path = this.config.webhookPath || "/webhook";
      this.server = http.createServer(async (req, res) => {
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
            if (this.config.appSecret) {
              const signature = req.headers["x-hub-signature-256"];
              if (!this.verifySignature(body, signature)) {
                res.writeHead(401).end("Invalid Signature");
                return;
              }
            }
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
    if (mode !== "subscribe" || !this.config.verifyToken)
      return null;
    const a = Buffer.from(token);
    const b = Buffer.from(this.config.verifyToken);
    if (a.length !== b.length)
      return null;
    return timingSafeEqual(a, b) ? challenge : null;
  }
  verifySignature(rawBody, signatureHeader) {
    if (!signatureHeader || !this.config.appSecret)
      return false;
    const parts = signatureHeader.split("=");
    if (parts.length !== 2 || parts[0] !== "sha256")
      return false;
    const expected = createHmac("sha256", this.config.appSecret).update(typeof rawBody === "string" ? Buffer.from(rawBody) : rawBody).digest("hex");
    const a = Buffer.from(expected);
    const b = Buffer.from(parts[1]);
    if (a.length !== b.length)
      return false;
    return timingSafeEqual(a, b);
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
    if (options?.messagingType) {
      payload.messaging_type = options.messagingType;
    }
    if (options?.tag) {
      payload.messaging_type = "MESSAGE_TAG";
      payload.tag = options.tag;
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
      if (options?.messagingType)
        payload.messaging_type = options.messagingType;
      if (options?.tag) {
        payload.messaging_type = "MESSAGE_TAG";
        payload.tag = options.tag;
      }
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
  async getPermissions(signal) {
    const res = await this.callApi("GET", "/me/permissions", undefined, signal);
    return res.data || [];
  }
  async subscribePage(fields = ["messages", "messaging_postbacks"], signal) {
    try {
      const res = await this.callApi("POST", "/me/subscribed_apps", { subscribed_fields: fields }, signal);
      return Boolean(res.success);
    } catch (err) {
      console.error("[MessengerChannelAdapter] Failed to subscribe page:", err.message);
      return false;
    }
  }
  async setMessengerProfile(payload, signal) {
    try {
      const res = await this.callApi("POST", "/me/messenger_profile", payload, signal);
      return res.result === "success";
    } catch (err) {
      console.error("[MessengerChannelAdapter] Failed to set messenger profile:", err.message);
      return false;
    }
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
// src/channels/messenger/personal.ts
import fs from "node:fs";
import path from "node:path";
class MessengerPersonalAdapter extends BaseChannel {
  name = "messenger";
  _config;
  _browserContext = null;
  _activePage = null;
  _recentSentTimestamps = [];
  constructor(config = {}) {
    super();
    this._config = {
      headless: config.headless ?? true,
      humanTypingDelayMs: config.humanTypingDelayMs ?? 30,
      maxMessagesPerMinute: config.maxMessagesPerMinute ?? 15,
      ...config
    };
  }
  async connect(signal) {
    if (signal?.aborted)
      throw new Error("Connection aborted");
    let playwright;
    try {
      playwright = await import("playwright");
    } catch {
      throw new Error("Playwright is required for MessengerPersonalAdapter. Install with: bun add -d playwright / npm install playwright");
    }
    const { chromium } = playwright;
    const userDataDir = this._config.userDataDir || path.resolve(process.cwd(), ".messenger-profile");
    this._browserContext = await chromium.launchPersistentContext(userDataDir, {
      headless: this._config.headless,
      args: [
        "--disable-blink-features=AutomationControlled",
        "--disable-notifications",
        "--no-sandbox"
      ],
      viewport: { width: 1280, height: 800 }
    });
    const credPath = this._config.credentialsPath || path.resolve(process.cwd(), "messenger.credentials.json");
    if (fs.existsSync(credPath)) {
      try {
        const raw = fs.readFileSync(credPath, "utf-8");
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.cookies)) {
          await this._browserContext.addCookies(parsed.cookies);
        }
      } catch {}
    }
    this._activePage = await this._browserContext.newPage();
    await this._activePage.goto("https://www.messenger.com/", {
      waitUntil: "domcontentloaded",
      timeout: 30000
    });
    const currentUrl = this._activePage.url();
    if (currentUrl.includes("/login") || currentUrl.includes("/checkpoint")) {
      await this.disconnect();
      throw new Error("Messenger personal session is not authenticated or hit checkpoint. Run 'channelhub login:messenger' first.");
    }
    this.setConnected(true);
    await this.setupInboundListener();
  }
  async setupInboundListener() {
    if (!this._activePage)
      return;
    await this._activePage.exposeFunction("__ch_on_message", (data) => {
      if (!data || !data.text)
        return;
      const unified = {
        id: `msg_ps_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        channel: "messenger",
        chat: {
          id: data.chatId || "unknown",
          type: "dm"
        },
        sender: {
          id: data.senderId || "unknown",
          name: data.senderName || "Personal User"
        },
        content: {
          text: data.text
        },
        timestamp: Date.now(),
        raw: data
      };
      this.dispatchMessage(unified);
    });
    await this._activePage.evaluate(() => {
      const observer = new MutationObserver((mutations) => {
        for (const mut of mutations) {
          for (const node of Array.from(mut.addedNodes)) {
            if (node?.querySelector) {
              const textEl = node.querySelector('div[dir="auto"][role="none"]');
              if (textEl && textEl.textContent) {
                const urlParts = window.location.pathname.split("/");
                const chatId = urlParts[urlParts.length - 1] || "unknown";
                window.__ch_on_message({
                  chatId,
                  text: textEl.textContent,
                  senderName: "Messenger Contact"
                });
              }
            }
          }
        }
      });
      const root = document.querySelector('[role="main"]') || document.body;
      observer.observe(root, { childList: true, subtree: true });
    });
  }
  checkRateLimit() {
    const now = Date.now();
    const windowStart = now - 60000;
    this._recentSentTimestamps = this._recentSentTimestamps.filter((ts) => ts > windowStart);
    if (this._recentSentTimestamps.length >= (this._config.maxMessagesPerMinute || 15)) {
      throw new Error(`Rate limit exceeded: Personal Messenger allows max ${this._config.maxMessagesPerMinute} msgs/min to avoid checkpoint.`);
    }
    this._recentSentTimestamps.push(now);
  }
  async sendText(chatId, text, options) {
    if (!this.isConnected() || !this._activePage) {
      throw new Error("MessengerPersonalAdapter is not connected");
    }
    if (options?.signal?.aborted) {
      throw new Error("Send aborted");
    }
    this.checkRateLimit();
    const targetUrl = `https://www.messenger.com/t/${chatId}`;
    if (!this._activePage.url().includes(`/t/${chatId}`)) {
      await this._activePage.goto(targetUrl, {
        waitUntil: "domcontentloaded",
        timeout: 20000
      });
    }
    const inputSelector = 'div[role="textbox"][contenteditable="true"], div[aria-label="Message"][contenteditable="true"]';
    await this._activePage.waitForSelector(inputSelector, { timeout: 1e4 });
    await this._activePage.click(inputSelector);
    const delay = this._config.humanTypingDelayMs || 30;
    await this._activePage.type(inputSelector, text, { delay });
    await this._activePage.keyboard.press("Enter");
    const messageId = `mid_ps_${Date.now()}`;
    return {
      messageId,
      chatId,
      timestamp: Date.now()
    };
  }
  async sendMedia(chatId, media, options) {
    throw new Error("Direct file upload on personal Messenger is disabled in safe mode to prevent account checkpoints. Use sendText or Page Graph API.");
  }
  async disconnect() {
    this.setConnected(false);
    if (this._browserContext) {
      try {
        await this._browserContext.close();
      } catch {}
      this._browserContext = null;
      this._activePage = null;
    }
  }
}
export {
  MessengerChannelAdapter,
  MessengerPersonalAdapter
};
