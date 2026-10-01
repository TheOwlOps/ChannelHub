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
  accountId?: string;
  intents?: number;
  autoStart?: boolean;
}

/**
 * Lightweight Discord adapter using Discord HTTP REST API.
 * Gateway WS is optional — messages can be pushed via normalizeEvent() for webhook/gateway bridges.
 */
export class DiscordChannelAdapter extends BaseChannel {
  readonly name: ChannelType = "discord";
  readonly capabilities = {
    inbound: true,
    outbound: true,
    media: ["image", "video", "document", "audio", "animation", "sticker"] as const,
    reactions: true,
    editing: true,
    typing: true,
    mode: "gateway" as const,
  };
  private config: DiscordAdapterConfig;
  private apiBase = "https://discord.com/api/v10";

  private ws?: any;
  private heartbeatTimer?: any;
  private sequence: number | null = null;

  constructor(config: DiscordAdapterConfig) {
    super();
    this.config = config;
  }

  async connect(signal?: AbortSignal): Promise<void> {
    this.assertNotAborted(signal);
    if (!this.config.botToken) throw new Error("Discord botToken is required.");
    // Verify token
    await this.callApi("GET", "/users/@me");
    this.setConnected(true);

    if (this.config.autoStart !== false && typeof (globalThis as any).WebSocket !== "undefined") {
      this.connectGateway();
    }
  }

  private async connectGateway(): Promise<void> {
    const WS = (globalThis as any).WebSocket || (await import("ws")).default;
    const ws = new WS("wss://gateway.discord.gg/?v=10&encoding=json");
    this.ws = ws;

    ws.onmessage = (event: any) => {
      try {
        const data = JSON.parse(event.data.toString());
        if (data.s !== null) this.sequence = data.s;

        // Hello Opcode 10
        if (data.op === 10) {
          const interval = data.d.heartbeat_interval;
          this.heartbeatTimer = setInterval(() => {
            ws.send(JSON.stringify({ op: 1, d: this.sequence }));
          }, interval);

          // Identify Opcode 2
          ws.send(JSON.stringify({
            op: 2,
            d: {
              token: this.config.botToken,
              intents: this.config.intents ?? 33280, // Guilds + GuildMessages + DirectMessages + MessageContent
              properties: {
                os: process.platform,
                browser: "channelhub",
                device: "channelhub",
              },
            },
          }));
        }

        // Dispatch Opcode 0
        if (data.op === 0 && data.t === "MESSAGE_CREATE") {
          const msg = this.normalizeEvent(data.d);
          if (msg) this.emit("message", msg);
        }
      } catch (err) {}
    };

    ws.onclose = () => {
      if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    };
  }

  async disconnect(signal?: AbortSignal): Promise<void> {
    this.assertNotAborted(signal);
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    if (this.ws) {
      this.ws.close();
      this.ws = undefined;
    }
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

  private async callApi(method: string, path: string, body?: Record<string, unknown>, signal?: AbortSignal): Promise<any> {
    const res = await fetch(`${this.apiBase}${path}`, {
      method,
      signal,
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
    const res = await this.callApi("POST", `/channels/${chatId}/messages`, payload, options?.signal);
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
    const res = await this.callApi("POST", `/channels/${chatId}/messages`, payload, options?.signal);
    return {
      messageId: String(res.id),
      chatId,
      timestamp: Date.parse(res.timestamp) || Date.now(),
    };
  }

  async addReaction(chatId: string, messageId: string, emoji: string, options?: { signal?: AbortSignal }): Promise<void> {
    const encoded = encodeURIComponent(emoji);
    await this.callApi(
      "PUT",
      `/channels/${chatId}/messages/${messageId}/reactions/${encoded}/@me`,
    );
  }

  async sendTyping(chatId: string, options?: { signal?: AbortSignal }): Promise<void> {
    await this.callApi("POST", `/channels/${chatId}/typing`, {});
  }

  async editText(chatId: string, messageId: string, text: string, options?: { signal?: AbortSignal }): Promise<SentMessageResult> {
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
