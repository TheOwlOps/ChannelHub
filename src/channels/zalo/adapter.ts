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
  minDelayMs?: number;
  maxDelayMs?: number;
  cacheLimit?: number;
}

export const EMOJI_TO_ZALO: Record<string, string> = {
  "❤️": "HEART",
  "💖": "HEART",
  "👍": "LIKE",
  "😆": "HAHA",
  "😂": "TEARS_OF_JOY",
  "😮": "WOW",
  "😭": "CRY",
  "😡": "ANGRY",
  "😘": "KISS",
  "💩": "SHIT",
  "🌹": "ROSE",
  "💔": "BROKEN_HEART",
  "👎": "DISLIKE",
  "😍": "LOVE",
  "🤔": "CONFUSED",
  "😉": "WINK",
  "heart": "HEART",
  "like": "LIKE",
  "haha": "HAHA",
  "wow": "WOW",
  "cry": "CRY",
  "angry": "ANGRY",
};

interface CachedMessage {
  msgId: string;
  cliMsgId?: string;
  uidFrom?: string;
  content?: string;
  threadId: string;
  isGroup: boolean;
}

export class ZaloChannelAdapter extends BaseChannel {
  readonly name: ChannelType = "zalo";
  private api: any;
  private ownId?: string;
  private config: ZaloAdapterConfig;

  // Caches for Zalo-specific quirks
  private threadTypeCache = new Map<string, number>(); // chatId -> 1 (Group) | 0 (User DM)
  private messageCache = new Map<string, CachedMessage>(); // msgId / cliMsgId -> CachedMessage
  private sendQueue: Promise<unknown> = Promise.resolve();

  constructor(config: ZaloAdapterConfig = {}) {
    super();
    this.config = {
      minDelayMs: 300,
      maxDelayMs: 800,
      cacheLimit: 1000,
      ...config,
    };
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
      this.recordInbound(raw);
      const unified = this.normalizeMessage(raw);
      if (unified) {
        this.emit("message", unified);
      }
    });

    // Session watcher / disconnect alert
    const onSessionDrop = (err?: any) => {
      this.emit("session:expired", {
        reason: "SESSION_EXPIRED_OR_DROPPED",
        raw: err,
        requiresQrScan: true,
      });
      this.setConnected(false);
    };

    this.api.listener.on("closed", onSessionDrop);
    this.api.listener.on("error", (err: any) => {
      const msg = String(err?.message || err);
      if (msg.includes("1002") || msg.includes("session") || msg.includes("auth")) {
        onSessionDrop(err);
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

  private recordInbound(raw: any): void {
    if (!raw) return;
    const data = raw.data || raw;
    const isGroup = raw.type === 1 || raw.type === "group" || Boolean(raw.isGroup);
    const chatId = String(raw.threadId || data.idTo || data.threadId || "");
    const msgId = String(data.msgId || raw.msgId || "");
    const cliMsgId = data.cliMsgId ? String(data.cliMsgId) : undefined;
    const uidFrom = String(data.uidFrom || raw.senderId || "");
    const content = typeof data.content === "string" ? data.content : data.msg || "";

    if (chatId) {
      this.threadTypeCache.set(chatId, isGroup ? 1 : 0);
    }

    const cached: CachedMessage = {
      msgId,
      cliMsgId,
      uidFrom,
      content,
      threadId: chatId,
      isGroup,
    };

    const limit = this.config.cacheLimit || 1000;
    if (this.messageCache.size >= limit) {
      const firstKey = this.messageCache.keys().next().value;
      if (firstKey) this.messageCache.delete(firstKey);
    }

    if (msgId) this.messageCache.set(msgId, cached);
    if (cliMsgId) this.messageCache.set(cliMsgId, cached);
  }

  private resolveThreadType(chatId: string): number {
    if (this.threadTypeCache.has(chatId)) {
      return this.threadTypeCache.get(chatId)!;
    }
    return (this.config.defaultIsGroup ?? true) ? 1 : 0;
  }

  private resolveQuote(replyToId?: string): any {
    if (!replyToId) return undefined;
    const cached = this.messageCache.get(replyToId);
    if (cached) {
      return {
        msgId: cached.msgId,
        cliMsgId: cached.cliMsgId,
        uidFrom: cached.uidFrom,
        content: cached.content,
      };
    }
    // Fallback if not in cache
    return replyToId;
  }

  // Anti-ban rate limiting with jitter
  private async enqueueSend<T>(operation: () => Promise<T>): Promise<T> {
    const minDelay = this.config.minDelayMs ?? 300;
    const maxDelay = this.config.maxDelayMs ?? 800;

    const execute = async () => {
      if (maxDelay > 0) {
        const jitter = Math.floor(minDelay + Math.random() * Math.max(0, maxDelay - minDelay));
        if (jitter > 0) {
          await new Promise((r) => setTimeout(r, jitter));
        }
      }
      return await operation();
    };

    const next = this.sendQueue.then(execute, execute);
    this.sendQueue = next.catch(() => {});
    return next;
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

    const threadType = this.resolveThreadType(chatId);
    const quote = this.resolveQuote(options?.replyToId);
    const payload: any = { msg: text, quote };

    return await this.enqueueSend(async () => {
      const res = await this.api.sendMessage(payload, chatId, threadType);
      const resMsgId = res?.message?.msgId || res?.msgId || `z-${Date.now()}`;
      return {
        messageId: String(resMsgId),
        chatId,
        timestamp: Date.now(),
      };
    });
  }

  async sendMedia(
    chatId: string,
    media: MediaPayload,
    options?: SendOptions,
  ): Promise<SentMessageResult> {
    if (!this.api) throw new Error("Zalo adapter is not connected.");

    const threadType = this.resolveThreadType(chatId);
    const quote = this.resolveQuote(options?.replyToId);

    return await this.enqueueSend(async () => {
      let res: any;
      if (media.type === "image") {
        res = await this.api.sendMessage(
          { msg: media.caption || "", attachments: [media.source], quote },
          chatId,
          threadType,
        );
      } else if (media.type === "video" && this.api.sendVideo) {
        res = await this.api.sendVideo(
          { video: media.source, msg: media.caption || "", quote },
          chatId,
          threadType,
        );
      } else {
        res = await this.api.sendMessage(
          { msg: media.caption || "", attachments: [media.source], quote },
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
    });
  }

  async addReaction(chatId: string, messageId: string, emoji: string): Promise<void> {
    if (!this.api?.addReaction) return;

    const threadType = this.resolveThreadType(chatId);
    const isGroup = threadType === 1;
    const reactionCode = EMOJI_TO_ZALO[emoji] || emoji;

    // Retrieve cached cliMsgId if available
    const cached = this.messageCache.get(messageId);
    const cliMsgId = cached?.cliMsgId || messageId;

    await this.enqueueSend(async () => {
      await this.api.addReaction(chatId, messageId, cliMsgId, reactionCode, threadType);
    });
  }
}
