import { BaseChannel } from "../../core/adapter";
import type {
  ChannelType,
  MediaPayload,
  SendOptions,
  SentMessageResult,
  UnifiedMessage,
} from "../../core/types";

export interface DiscordAdapterConfig {
  botToken: string;
  intents?: number;
  autoStart?: boolean;
}

/**
 * Lightweight Discord adapter using Discord HTTP REST API.
 * Gateway WS is optional — messages can be pushed via normalizeEvent() for webhook/gateway bridges.
 */
export class DiscordChannelAdapter extends BaseChannel {
  readonly name: ChannelType = "discord";
  private config: DiscordAdapterConfig;
  private apiBase = "https://discord.com/api/v10";

  constructor(config: DiscordAdapterConfig) {
    super();
    this.config = config;
  }

  async connect(): Promise<void> {
    if (!this.config.botToken) throw new Error("Discord botToken is required.");
    // Verify token
    await this.callApi("GET", "/users/@me");
    this.setConnected(true);
  }

  async disconnect(): Promise<void> {
    this.setConnected(false);
  }

  public normalizeEvent(event: any): UnifiedMessage | null {
    // Discord MESSAGE_CREATE payload
    if (!event || event.type !== 0 && !event.content && !event.author) {
      // Accept both gateway event wrapper and raw message
      if (!event?.content && !event?.d?.content) return null;
    }
    const msg = event.d || event;
    if (!msg.content && !msg.attachments?.length) return null;
    if (msg.author?.bot) return null; // ignore bot self-messages by default

    const isDm = !msg.guild_id;
    return {
      id: String(msg.id),
      channel: "discord",
      sender: {
        id: String(msg.author?.id ?? ""),
        name: msg.author?.global_name || msg.author?.username,
        username: msg.author?.username,
        isBot: Boolean(msg.author?.bot),
        avatarUrl: msg.author?.avatar
          ? `https://cdn.discordapp.com/avatars/${msg.author.id}/${msg.author.avatar}.png`
          : undefined,
      },
      chat: {
        id: String(msg.channel_id),
        type: isDm ? "dm" : "channel",
        title: undefined,
      },
      content: {
        text: msg.content || "",
        attachments: (msg.attachments || []).map((a: any) => ({
          type: a.content_type?.startsWith("image/")
            ? "image"
            : a.content_type?.startsWith("video/")
              ? "video"
              : "file",
          url: a.url,
          filename: a.filename,
          mimeType: a.content_type,
          size: a.size,
        })),
        replyToId: msg.message_reference?.message_id
          ? String(msg.message_reference.message_id)
          : undefined,
      },
      raw: event,
      timestamp: msg.timestamp ? Date.parse(msg.timestamp) : Date.now(),
    };
  }

  private async callApi(method: string, path: string, body?: Record<string, unknown>): Promise<any> {
    const res = await fetch(`${this.apiBase}${path}`, {
      method,
      headers: {
        Authorization: `Bot ${this.config.botToken}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Discord API ${method} ${path} failed: ${res.status} ${errText}`);
    }
    if (res.status === 204) return null;
    return res.json();
  }

  async sendText(
    chatId: string,
    text: string,
    options?: SendOptions,
  ): Promise<SentMessageResult> {
    const payload: Record<string, unknown> = { content: text };
    if (options?.replyToId) {
      payload.message_reference = { message_id: options.replyToId };
    }
    const res = await this.callApi("POST", `/channels/${chatId}/messages`, payload);
    return {
      messageId: String(res.id),
      chatId,
      timestamp: Date.parse(res.timestamp) || Date.now(),
    };
  }

  async sendMedia(
    chatId: string,
    media: MediaPayload,
    options?: SendOptions,
  ): Promise<SentMessageResult> {
    const payload: Record<string, unknown> = {
      content: media.caption || "",
    };
    if (typeof media.source === "string") {
      payload.embeds = [{ image: { url: media.source } }];
    }
    if (options?.replyToId) {
      payload.message_reference = { message_id: options.replyToId };
    }
    const res = await this.callApi("POST", `/channels/${chatId}/messages`, payload);
    return {
      messageId: String(res.id),
      chatId,
      timestamp: Date.parse(res.timestamp) || Date.now(),
    };
  }

  async addReaction(chatId: string, messageId: string, emoji: string): Promise<void> {
    const encoded = encodeURIComponent(emoji);
    await this.callApi(
      "PUT",
      `/channels/${chatId}/messages/${messageId}/reactions/${encoded}/@me`,
    );
  }

  async sendTyping(chatId: string): Promise<void> {
    await this.callApi("POST", `/channels/${chatId}/typing`, {});
  }

  async editText(chatId: string, messageId: string, text: string): Promise<SentMessageResult> {
    const res = await this.callApi("PATCH", `/channels/${chatId}/messages/${messageId}`, {
      content: text,
    });
    return {
      messageId: String(res.id || messageId),
      chatId,
      timestamp: Date.now(),
    };
  }
}
