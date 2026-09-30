// src/core/adapter.ts
import { EventEmitter } from "node:events";

class BaseChannel extends EventEmitter {
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
}

// src/channels/messenger/adapter.ts
class MessengerChannelAdapter extends BaseChannel {
  name = "messenger";
  config;
  apiBase;
  constructor(config) {
    super();
    this.config = config;
    const version = config.apiVersion || "v19.0";
    this.apiBase = `https://graph.facebook.com/${version}`;
  }
  async connect() {
    if (!this.config.pageAccessToken) {
      throw new Error("Messenger pageAccessToken is required.");
    }
    const res = await fetch(`${this.apiBase}/me?access_token=${this.config.pageAccessToken}`);
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Failed to authenticate with Messenger Graph API: ${err}`);
    }
    this.setConnected(true);
  }
  async disconnect() {
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
        if (!event.message)
          continue;
        const senderId = event.sender?.id || "";
        const text = event.message.text || "";
        const attachments = (event.message.attachments || []).map((att) => ({
          type: att.type || "file",
          url: att.payload?.url || ""
        }));
        messages.push({
          id: event.message.mid || `fb_${Date.now()}`,
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
            replyToId: event.message.reply_to?.mid
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
    const res = await this.callApi("POST", "/me/messages", payload);
    return {
      messageId: res.message_id || res.recipient_id || `msg_${Date.now()}`,
      chatId,
      timestamp: Date.now()
    };
  }
  async sendMedia(chatId, media, options) {
    if (typeof media.source === "string" && (media.source.startsWith("http://") || media.source.startsWith("https://"))) {
      const payload = {
        recipient: { id: chatId },
        message: {
          attachment: {
            type: media.type,
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
      const res = await this.callApi("POST", "/me/messages", payload);
      return {
        messageId: res.message_id || res.recipient_id || `msg_${Date.now()}`,
        chatId,
        timestamp: Date.now()
      };
    }
    const formData = new FormData;
    formData.append("recipient", JSON.stringify({ id: chatId }));
    let blob;
    if (typeof media.source === "string") {
      const fs = await import("node:fs");
      const buffer = fs.readFileSync(media.source);
      blob = new Blob([new Uint8Array(buffer)], { type: media.mimeType || "application/octet-stream" });
    } else {
      blob = new Blob([new Uint8Array(media.source)], { type: media.mimeType || "application/octet-stream" });
    }
    formData.append("message", JSON.stringify({
      attachment: {
        type: media.type,
        payload: {}
      }
    }));
    formData.append("filedata", blob, media.filename || "file");
    const url = `${this.apiBase}/me/messages?access_token=${encodeURIComponent(this.config.pageAccessToken)}`;
    const response = await fetch(url, {
      method: "POST",
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
  async sendTyping(chatId) {
    await this.callApi("POST", "/me/messages", {
      recipient: { id: chatId },
      sender_action: "typing_on"
    });
  }
  async callApi(method, path, body) {
    const url = `${this.apiBase}${path}?access_token=${encodeURIComponent(this.config.pageAccessToken)}`;
    const headers = {
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
export {
  MessengerChannelAdapter
};
