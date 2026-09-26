import { BaseChannel } from "../../core/adapter";
import type {
  ChannelType,
  MediaPayload,
  SendOptions,
  SentMessageResult,
  UnifiedMessage,
} from "../../core/types";

export interface ZaloAdapterConfig {
  api?: any;
  credentialsPath?: string;
  ownId?: string;
  defaultIsGroup?: boolean;
}

export class ZaloChannelAdapter extends BaseChannel {
  readonly name: ChannelType = "zalo";
  private api: any;
  private ownId?: string;
  private config: ZaloAdapterConfig;

  constructor(config: ZaloAdapterConfig = {}) {
    super();
    this.config = config;
    if (config.api) {
      this.api = config.api;
    }
    this.ownId = config.ownId;
  }

  async connect(): Promise<void> {
    if (!this.api && this.config.credentialsPath) {
      const fs = await import("node:fs");
      const { Zalo } = await import("zca-js");
      if (!fs.existsSync(this.config.credentialsPath)) {
        throw new Error(
          `Credentials not found at ${this.config.credentialsPath}. Please run login first.`,
        );
      }
      const creds = JSON.parse(fs.readFileSync(this.config.credentialsPath, "utf-8"));
      const zalo = new Zalo();
      this.api = await zalo.login(creds);
    }

    if (!this.api) {
      throw new Error("Zalo API instance or valid credentialsPath required to connect.");
    }

    this.setupEventListener();
    this.setConnected(true);
  }

  async disconnect(): Promise<void> {
    if (this.api?.listener?.stop) {
      try {
        this.api.listener.stop();
      } catch {
        // ignore listener stop error
      }
    }
    this.setConnected(false);
  }

  private setupEventListener(): void {
    if (!this.api?.listener?.on) return;

    this.api.listener.on("message", (raw: any) => {
      const unified = this.normalizeMessage(raw);
      if (unified) {
        this.emit("message", unified);
      }
    });

    if (this.api.listener.start) {
      try {
        this.api.listener.start();
      } catch {
        // listener might already be running
      }
    }
  }

  private normalizeMessage(raw: any): UnifiedMessage | null {
    if (!raw) return null;

    const data = raw.data || raw;
    const isGroup = raw.type === 1 || raw.type === "group" || Boolean(raw.isGroup);
    const chatId = raw.threadId || data.idTo || data.threadId || "";
    const senderId = data.uidFrom || raw.senderId || "";
    const senderName = data.dName || data.senderName;
    const text = typeof data.content === "string" ? data.content : data.msg || "";
    const msgId = data.msgId || raw.msgId || String(Date.now());
    const ts = Number(data.ts || raw.timestamp) || Date.now();

    return {
      id: String(msgId),
      channel: "zalo",
      sender: {
        id: String(senderId),
        name: senderName,
        isBot: this.ownId ? String(senderId) === String(this.ownId) : false,
      },
      chat: {
        id: String(chatId),
        type: isGroup ? "group" : "dm",
      },
      content: {
        text,
      },
      raw,
      timestamp: ts,
    };
  }

  async sendText(
    chatId: string,
    text: string,
    options?: SendOptions,
  ): Promise<SentMessageResult> {
    if (!this.api) throw new Error("Zalo adapter is not connected.");

    // type 1: Group, type 0: User DM in zca-js
    const isGroup = this.config.defaultIsGroup ?? true;
    const threadType = isGroup ? 1 : 0;

    const payload: any = { msg: text, quote: options?.replyToId };
    const res = await this.api.sendMessage(payload, chatId, threadType);

    const resMsgId = res?.message?.msgId || res?.msgId || `z-${Date.now()}`;
    return {
      messageId: String(resMsgId),
      chatId,
      timestamp: Date.now(),
    };
  }

  async sendMedia(
    chatId: string,
    media: MediaPayload,
    _options?: SendOptions,
  ): Promise<SentMessageResult> {
    if (!this.api) throw new Error("Zalo adapter is not connected.");
    const isGroup = this.config.defaultIsGroup ?? true;
    const threadType = isGroup ? 1 : 0;

    let res: any;
    if (media.type === "image") {
      res = await this.api.sendMessage(
        { msg: media.caption || "", attachments: [media.source] },
        chatId,
        threadType,
      );
    } else if (media.type === "video" && this.api.sendVideo) {
      res = await this.api.sendVideo(
        { video: media.source, msg: media.caption || "" },
        chatId,
        threadType,
      );
    } else {
      res = await this.api.sendMessage(
        { msg: media.caption || "", attachments: [media.source] },
        chatId,
        threadType,
      );
    }

    const resMsgId = res?.message?.msgId || res?.msgId || `z-${Date.now()}`;
    return {
      messageId: String(resMsgId),
      chatId,
      timestamp: Date.now(),
    };
  }

  async addReaction(chatId: string, messageId: string, emoji: string): Promise<void> {
    if (this.api?.addReaction) {
      await this.api.addReaction(chatId, messageId, emoji);
    }
  }
}
