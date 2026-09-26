import { BaseChannel } from "../../core/adapter";
import type {
  ChannelType,
  MediaPayload,
  SendOptions,
  SentMessageResult,
  UnifiedMessage,
} from "../../core/types";
import type { TelegramAdapterConfig } from "./types";

export class TelegramChannelAdapter extends BaseChannel {
  readonly name: ChannelType = "telegram";
  private config: TelegramAdapterConfig;
  private apiRoot: string;
  private pollTimer: any = null;
  private lastUpdateId = 0;
  private isPolling = false;

  constructor(config: TelegramAdapterConfig) {
    super();
    this.config = config;
    this.apiRoot = config.apiRoot || "https://api.telegram.org";
  }

  async connect(): Promise<void> {
    if (!this.config.botToken) {
      throw new Error("Telegram botToken is required.");
    }
    this.setConnected(true);
    if (this.config.autoStart !== false) {
      this.startPolling();
    }
  }

  async disconnect(): Promise<void> {
    this.stopPolling();
    this.setConnected(false);
  }

  public normalizeUpdate(update: any): UnifiedMessage | null {
    if (!update) return null;
    const msg = update.message || update.edited_message || update.channel_post;
    if (!msg) return null;

    const chatType =
      msg.chat.type === "private"
        ? "dm"
        : msg.chat.type === "channel"
          ? "channel"
          : "group";

    const senderName = [msg.from?.first_name, msg.from?.last_name]
      .filter(Boolean)
      .join(" ");

    return {
      id: String(msg.message_id),
      channel: "telegram",
      sender: {
        id: String(msg.from?.id ?? ""),
        name: senderName || undefined,
        username: msg.from?.username,
        isBot: Boolean(msg.from?.is_bot),
      },
      chat: {
        id: String(msg.chat.id),
        type: chatType,
        title: msg.chat.title,
      },
      content: {
        text: msg.text || msg.caption || "",
        replyToId: msg.reply_to_message?.message_id
          ? String(msg.reply_to_message.message_id)
          : undefined,
      },
      raw: update,
      timestamp: (msg.date || Math.floor(Date.now() / 1000)) * 1000,
    };
  }

  private async callApi(method: string, body: Record<string, unknown>): Promise<any> {
    const url = `${this.apiRoot}/bot${this.config.botToken}/${method}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Telegram API ${method} failed: ${res.status} ${errText}`);
    }
    const data = (await res.json()) as any;
    if (!data.ok) {
      throw new Error(`Telegram API ${method} error: ${data.description}`);
    }
    return data.result;
  }

  private startPolling(): void {
    if (this.isPolling) return;
    this.isPolling = true;
    const interval = this.config.pollIntervalMs || 1000;

    const poll = async () => {
      if (!this.isPolling) return;
      try {
        const updates = await this.callApi("getUpdates", {
          offset: this.lastUpdateId + 1,
          timeout: 10,
        });
        if (Array.isArray(updates)) {
          for (const u of updates) {
            this.lastUpdateId = Math.max(this.lastUpdateId, u.update_id);
            const unified = this.normalizeUpdate(u);
            if (unified) {
              this.emit("message", unified);
            }
          }
        }
      } catch (err: any) {
        this.emit("error", err);
      } finally {
        if (this.isPolling) {
          this.pollTimer = setTimeout(poll, interval);
        }
      }
    };

    poll();
  }

  private stopPolling(): void {
    this.isPolling = false;
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }
  }

  async sendText(
    chatId: string,
    text: string,
    options?: SendOptions,
  ): Promise<SentMessageResult> {
    const payload: Record<string, unknown> = {
      chat_id: chatId,
      text,
    };
    if (options?.replyToId) {
      payload.reply_to_message_id = Number(options.replyToId);
    }
    const res = await this.callApi("sendMessage", payload);
    return {
      messageId: String(res.message_id),
      chatId,
      timestamp: res.date * 1000,
    };
  }

  async sendMedia(
    chatId: string,
    media: MediaPayload,
    options?: SendOptions,
  ): Promise<SentMessageResult> {
    const method =
      media.type === "image"
        ? "sendPhoto"
        : media.type === "video"
          ? "sendVideo"
          : "sendDocument";

    const payload: Record<string, unknown> = {
      chat_id: chatId,
      caption: media.caption,
    };

    if (typeof media.source === "string") {
      if (media.type === "image") payload.photo = media.source;
      else if (media.type === "video") payload.video = media.source;
      else payload.document = media.source;
    }

    if (options?.replyToId) {
      payload.reply_to_message_id = Number(options.replyToId);
    }

    const res = await this.callApi(method, payload);
    return {
      messageId: String(res.message_id),
      chatId,
      timestamp: (res.date || Date.now()) * 1000,
    };
  }

  async addReaction(chatId: string, messageId: string, emoji: string): Promise<void> {
    await this.callApi("setMessageReaction", {
      chat_id: chatId,
      message_id: Number(messageId),
      reaction: [{ type: "emoji", emoji }],
    });
  }

  async sendTyping(chatId: string): Promise<void> {
    await this.callApi("sendChatAction", {
      chat_id: chatId,
      action: "typing",
    });
  }

  async editText(chatId: string, messageId: string, text: string): Promise<SentMessageResult> {
    const res = await this.callApi("editMessageText", {
      chat_id: chatId,
      message_id: Number(messageId),
      text,
    });
    return {
      messageId: String(res.message_id || messageId),
      chatId,
      timestamp: Date.now(),
    };
  }
}
