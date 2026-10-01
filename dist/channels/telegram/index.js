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

// src/channels/telegram/adapter.ts
class TelegramChannelAdapter extends BaseChannel {
  name = "telegram";
  capabilities = {
    inbound: true,
    outbound: true,
    media: ["image", "video", "file", "audio", "animation", "sticker"],
    reactions: true,
    editing: true,
    typing: true,
    mode: "polling"
  };
  config;
  apiRoot;
  pollTimer = null;
  lastUpdateId = 0;
  isPolling = false;
  constructor(config) {
    super();
    this.config = config;
    this.apiRoot = config.apiRoot || "https://api.telegram.org";
  }
  async connect(signal) {
    this.assertNotAborted(signal);
    if (!this.config.botToken) {
      throw new Error("Telegram botToken is required.");
    }
    await this.callApi("getMe", {}, signal);
    this.setConnected(true);
    if (this.config.autoStart !== false) {
      this.startPolling();
    }
  }
  async disconnect(signal) {
    this.assertNotAborted(signal);
    this.stopPolling();
    this.setConnected(false);
  }
  normalizeUpdate(update) {
    if (!update)
      return null;
    const msg = update.message || update.edited_message || update.channel_post;
    if (!msg)
      return null;
    const chatType = msg.chat.type === "private" ? "dm" : msg.chat.type === "channel" ? "channel" : "group";
    const senderName = [msg.from?.first_name, msg.from?.last_name].filter(Boolean).join(" ");
    return {
      id: String(msg.message_id),
      channel: "telegram",
      sender: {
        id: String(msg.from?.id ?? ""),
        name: senderName || undefined,
        username: msg.from?.username,
        isBot: Boolean(msg.from?.is_bot)
      },
      chat: {
        id: String(msg.chat.id),
        type: chatType,
        title: msg.chat.title
      },
      content: {
        text: msg.text || msg.caption || "",
        replyToId: msg.reply_to_message?.message_id ? String(msg.reply_to_message.message_id) : undefined
      },
      raw: update,
      timestamp: (msg.date || Math.floor(Date.now() / 1000)) * 1000
    };
  }
  async callApi(method, body, signal) {
    const url = `${this.apiRoot}/bot${this.config.botToken}/${method}`;
    const res = await fetch(url, {
      method: "POST",
      signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Telegram API ${method} failed: ${res.status} ${errText}`);
    }
    const data = await res.json();
    if (!data.ok) {
      throw new Error(`Telegram API ${method} error: ${data.description}`);
    }
    return data.result;
  }
  startPolling() {
    if (this.isPolling)
      return;
    this.isPolling = true;
    const interval = this.config.pollIntervalMs || 1000;
    const poll = async () => {
      if (!this.isPolling)
        return;
      try {
        const updates = await this.callApi("getUpdates", {
          offset: this.lastUpdateId + 1,
          timeout: 10
        });
        if (Array.isArray(updates)) {
          for (const u of updates) {
            const unified = this.normalizeUpdate(u);
            if (unified) {
              await this.dispatchMessage(unified);
            }
            this.lastUpdateId = Math.max(this.lastUpdateId, u.update_id);
          }
        }
      } catch (err) {
        this.emit("error", err);
      } finally {
        if (this.isPolling) {
          this.pollTimer = setTimeout(poll, interval);
        }
      }
    };
    poll();
  }
  stopPolling() {
    this.isPolling = false;
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }
  }
  async sendText(chatId, text, options) {
    const payload = {
      chat_id: chatId,
      text
    };
    if (options?.replyToId) {
      payload.reply_to_message_id = Number(options.replyToId);
    }
    const res = await this.callApi("sendMessage", payload, options?.signal);
    return {
      messageId: String(res.message_id),
      chatId,
      timestamp: res.date * 1000
    };
  }
  async sendMedia(chatId, media, options) {
    const method = media.type === "image" ? "sendPhoto" : media.type === "video" ? "sendVideo" : media.type === "animation" ? "sendAnimation" : media.type === "sticker" ? "sendSticker" : "sendDocument";
    const payload = {
      chat_id: chatId,
      caption: media.caption
    };
    if (typeof media.source === "string") {
      if (media.type === "image")
        payload.photo = media.source;
      else if (media.type === "video")
        payload.video = media.source;
      else if (media.type === "animation")
        payload.animation = media.source;
      else if (media.type === "sticker")
        payload.sticker = media.source;
      else
        payload.document = media.source;
    }
    if (options?.replyToId) {
      payload.reply_to_message_id = Number(options.replyToId);
    }
    const res = await this.callApi(method, payload, options?.signal);
    return {
      messageId: String(res.message_id),
      chatId,
      timestamp: (res.date || Date.now()) * 1000
    };
  }
  async addReaction(chatId, messageId, emoji, options) {
    await this.callApi("setMessageReaction", {
      chat_id: chatId,
      message_id: Number(messageId),
      reaction: [{ type: "emoji", emoji }]
    }, options?.signal);
  }
  async sendTyping(chatId, options) {
    await this.callApi("sendChatAction", {
      chat_id: chatId,
      action: "typing"
    }, options?.signal);
  }
  async editText(chatId, messageId, text, options) {
    const res = await this.callApi("editMessageText", {
      chat_id: chatId,
      message_id: Number(messageId),
      text
    }, options?.signal);
    return {
      messageId: String(res.message_id || messageId),
      chatId,
      timestamp: Date.now()
    };
  }
}
export {
  TelegramChannelAdapter
};
