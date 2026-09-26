import { BaseChannel } from "../../core/adapter";
import type {
  ChannelType,
  MediaPayload,
  SendOptions,
  SentMessageResult,
  UnifiedMessage,
} from "../../core/types";

export interface SlackAdapterConfig {
  botToken: string;
  appToken?: string;
  signingSecret?: string;
}

export class SlackChannelAdapter extends BaseChannel {
  readonly name: ChannelType = "slack";
  private config: SlackAdapterConfig;
  private apiBase = "https://slack.com/api";

  constructor(config: SlackAdapterConfig) {
    super();
    this.config = config;
  }

  async connect(): Promise<void> {
    if (!this.config.botToken) throw new Error("Slack botToken is required.");
    await this.callApi("auth.test", {});
    this.setConnected(true);
  }

  async disconnect(): Promise<void> {
    this.setConnected(false);
  }

  public normalizeEvent(event: any): UnifiedMessage | null {
    // Slack Event API message payload
    const msg = event.event || event;
    if (!msg || msg.type !== "message") return null;
    if (msg.subtype === "bot_message" || msg.bot_id) return null;

    const isDm = msg.channel_type === "im" || (msg.channel && msg.channel.startsWith("D"));
    return {
      id: String(msg.client_msg_id || msg.ts),
      channel: "slack",
      sender: {
        id: String(msg.user || ""),
        isBot: Boolean(msg.bot_id),
      },
      chat: {
        id: String(msg.channel),
        type: isDm ? "dm" : "channel",
      },
      content: {
        text: msg.text || "",
        replyToId: msg.thread_ts ? String(msg.thread_ts) : undefined,
      },
      raw: event,
      timestamp: msg.ts ? parseFloat(msg.ts) * 1000 : Date.now(),
    };
  }

  private async callApi(method: string, body: Record<string, unknown>): Promise<any> {
    const res = await fetch(`${this.apiBase}/${method}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.config.botToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Slack API ${method} failed: ${res.status} ${errText}`);
    }
    const data = (await res.json()) as any;
    if (!data.ok) {
      throw new Error(`Slack API ${method} error: ${data.error}`);
    }
    return data;
  }

  async sendText(
    chatId: string,
    text: string,
    options?: SendOptions,
  ): Promise<SentMessageResult> {
    const payload: Record<string, unknown> = {
      channel: chatId,
      text,
    };
    if (options?.replyToId) {
      payload.thread_ts = options.replyToId;
    }
    const res = await this.callApi("chat.postMessage", payload);
    return {
      messageId: String(res.ts),
      chatId,
      timestamp: parseFloat(res.ts) * 1000,
    };
  }

  async sendMedia(
    chatId: string,
    media: MediaPayload,
    options?: SendOptions,
  ): Promise<SentMessageResult> {
    // Slack postMessage with block/attachment fallback
    const payload: Record<string, unknown> = {
      channel: chatId,
      text: media.caption || "Attachment",
    };
    if (options?.replyToId) {
      payload.thread_ts = options.replyToId;
    }
    const res = await this.callApi("chat.postMessage", payload);
    return {
      messageId: String(res.ts),
      chatId,
      timestamp: parseFloat(res.ts) * 1000,
    };
  }

  async addReaction(chatId: string, messageId: string, emoji: string): Promise<void> {
    // Remove colons if user passed :smile:
    const cleanName = emoji.replace(/:/g, "");
    await this.callApi("reactions.add", {
      channel: chatId,
      timestamp: messageId,
      name: cleanName,
    });
  }

  async sendTyping(chatId: string): Promise<void> {
    // Slack doesn't have a dedicated typing API for bots; no-op for now.
  }

  async editText(chatId: string, messageId: string, text: string): Promise<SentMessageResult> {
    const res = await this.callApi("chat.update", {
      channel: chatId,
      ts: messageId,
      text,
    });
    return {
      messageId: String(res.ts || messageId),
      chatId,
      timestamp: Date.now(),
    };
  }
}
