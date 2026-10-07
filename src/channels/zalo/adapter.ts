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
  accountId?: string;
  ownId?: string;
  defaultIsGroup?: boolean;
  minDelayMs?: number;
  maxDelayMs?: number;
  cacheLimit?: number;
  proxy?: string;
  autoReconnect?: boolean;
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
  readonly capabilities = {
    inbound: true,
    outbound: true,
    media: ["image", "video", "file", "audio", "animation", "sticker"] as const,
    reactions: true,
    editing: false,
    typing: true,
    mode: "gateway" as const,
  };
  private api: any;
  private ownId?: string;
  private config: ZaloAdapterConfig;

  // Caches for Zalo-specific quirks
  private threadTypeCache = new Map<string, number>();
  private groupTitleCache = new Map<string, string>();
  private stickerUrlCache = new Map<string, string>();
  private messageCache = new Map<string, CachedMessage>();
  private reconnectAttempts = 0;
  private isReconnecting = false;
  private reconnectTimer?: ReturnType<typeof setTimeout>;
  private sendQueue: Promise<unknown> = Promise.resolve();

  constructor(config: ZaloAdapterConfig = {}) {
    super();
    this.config = {
      minDelayMs: 300,
      maxDelayMs: 800,
      cacheLimit: 1000,
      autoReconnect: true,
      ...config,
    };
    if (config.api) {
      this.api = config.api;
    }
    this.ownId = config.ownId;
  }

  async connect(signal?: AbortSignal): Promise<void> {
    this.assertNotAborted(signal);
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (!this.api && this.config.credentialsPath) {
      const fs = await import("node:fs");
      const { Zalo } = await import("zca-js");
      if (!fs.existsSync(this.config.credentialsPath)) {
        throw new Error(
          `Credentials not found at ${this.config.credentialsPath}. Please run login first.`,
        );
      }
      const creds = JSON.parse(fs.readFileSync(this.config.credentialsPath, "utf-8"));
      const proxyUrl = this.config.proxy || process.env.HTTPS_PROXY || process.env.https_proxy || process.env.HTTP_PROXY;
      let agent: any = undefined;
      if (proxyUrl) {
        try {
          // @ts-ignore
          const { HttpsProxyAgent } = await import("https-proxy-agent");
          agent = new HttpsProxyAgent(proxyUrl);
        } catch {}
      }
      const zalo = new Zalo({ ...(agent ? { agent } : {}) });
      this.api = await zalo.login(creds);
    }

    if (!this.api) {
      throw new Error("Zalo API instance or valid credentialsPath required to connect.");
    }

    this.setupEventListener();
    this.setConnected(true);
  }

  async disconnect(signal?: AbortSignal): Promise<void> {
    this.assertNotAborted(signal);
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
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

    this.api.listener.on("message", async (raw: any) => {
      this.recordInbound(raw);
      const unified = await this.normalizeMessage(raw);
      if (unified) {
        await this.dispatchMessage(unified);
      }
    });

    const onSessionDrop = (err?: any) => {
      const msg = String(err?.message || err || "");
      const isAuthRevoked = msg.includes("1002") || msg.includes("Forbidden") || msg.includes("session expired") || msg.includes("auth");

      if (isAuthRevoked) {
        this.emit("session:expired", { reason: "SESSION_EXPIRED_OR_REVOKED", raw: err, requiresQrScan: true });
        this.setConnected(false);
        return;
      }

      if (this.config.autoReconnect !== false && !this.isReconnecting) {
        this.isReconnecting = true;
        const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
        this.reconnectAttempts++;

        this.reconnectTimer = setTimeout(async () => {
          try {
            if (this.api?.listener?.start) {
              await this.api.listener.start({ retryOnClose: true });
              this.reconnectAttempts = 0;
              this.setConnected(true);
            }
          } catch (recErr) {
            onSessionDrop(recErr);
          } finally {
            this.isReconnecting = false;
          }
        }, delay);
      } else {
        this.setConnected(false);
      }
    };

    this.api.listener.on("closed", onSessionDrop);
    this.api.listener.on("error", (err: any) => onSessionDrop(err));

    if (this.api.listener.start) {
      try {
        this.api.listener.start({ retryOnClose: true });
      } catch {}
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
    const groupName = raw.groupName || data.groupName || (isGroup && data.dName ? data.dName : undefined);
    if (isGroup && chatId && groupName) {
      this.groupTitleCache.set(chatId, groupName);
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

  private async resolveThreadType(chatId: string): Promise<number> {
    if (this.threadTypeCache.has(chatId)) return this.threadTypeCache.get(chatId)!;
    if (this.api?.getGroupInfo) {
      try {
        const info = await this.api.getGroupInfo(chatId);
        if (info && (info.gridInfoMap || info.groupId || info.name)) {
          this.threadTypeCache.set(chatId, 1);
          if (info.name) this.groupTitleCache.set(chatId, info.name);
          return 1;
        }
      } catch {}
      this.threadTypeCache.set(chatId, 0);
      return 0;
    }
    return (this.config.defaultIsGroup ?? false) ? 1 : 0;
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

  private async normalizeMessage(raw: any): Promise<any> {
    if (!raw) return null;
    const data = raw.data || raw;
    const isGroup = raw.type === 1 || raw.type === "group" || Boolean(raw.isGroup);
    const chatId = String(raw.threadId || data.idTo || data.threadId || "");
    const senderId = String(data.uidFrom || raw.senderId || "");
    const msgId = String(data.msgId || raw.msgId || Date.now());
    const ts = Number(data.ts || raw.timestamp) || Date.now();
    const msgType = String(data.msgType || raw.msgType || "");

    let text = typeof data.content === "string" ? data.content : data.msg || "";
    const attachments: any[] = [];

    if (msgType === "chat.photo" || data.photo || data.thumb || data.href) {
      const url = data.href || data.url || data.thumb || (typeof data.content === "object" ? data.content?.href || data.content?.url : "");
      if (url) attachments.push({ type: "image", url });
      if (!text) text = "[Ảnh]";
    } else if (msgType === "chat.sticker" || (typeof data.content === "object" && data.content?.id && data.content?.catId)) {
      const stickerObj = typeof data.content === "object" ? data.content : data;
      const stickerId = String(stickerObj.id || stickerObj.stickerId || "");
      let stickerUrl = this.stickerUrlCache.get(stickerId);
      if (!stickerUrl && stickerId) {
        if (this.api?.getStickersDetail) {
          try {
            const detail = await this.api.getStickersDetail(stickerId);
            if (detail?.stickerUrl || detail?.url) stickerUrl = detail.stickerUrl || detail.url;
          } catch {}
        }
        if (!stickerUrl) stickerUrl = `https://zalo-api.zadn.vn/api/emoticon/sticker/webpc?eid=${stickerId}&size=130`;
        this.stickerUrlCache.set(stickerId, stickerUrl);
      }
      if (stickerUrl) attachments.push({ type: "sticker", url: stickerUrl });
      if (!text) text = "[Sticker]";
    } else if (msgType === "share.file" || (typeof data.content === "object" && (data.content?.title || data.content?.filename || data.content?.fileUrl))) {
      const fileObj = typeof data.content === "object" ? data.content : data;
      const filename = fileObj.filename || fileObj.title || fileObj.fileName || "Tệp đính kèm";
      const fileUrl = fileObj.fileUrl || fileObj.href || fileObj.url || "";
      attachments.push({ type: "file", url: fileUrl, filename, size: Number(fileObj.fileSize || fileObj.size) || undefined });
      if (!text) text = `[File] ${filename}`;
    }

    let chatTitle: string | undefined = undefined;
    let senderName = data.senderName;
    if (isGroup) {
      chatTitle = this.groupTitleCache.get(chatId) || raw.groupName || data.groupName;
      if (!chatTitle && this.api?.getGroupInfo) {
        try {
          const info = await this.api.getGroupInfo(chatId);
          if (info?.name) { chatTitle = info.name; this.groupTitleCache.set(chatId, info.name); }
        } catch {}
      }
      senderName = senderName || data.dName;
    } else {
      senderName = data.dName || senderName;
    }

    return {
      id: String(msgId),
      channel: "zalo",
      sender: { id: String(senderId), name: senderName, isBot: this.ownId ? String(senderId) === String(this.ownId) : false },
      chat: { id: String(chatId), type: isGroup ? "group" : "dm", ...(chatTitle ? { title: chatTitle } : {}) },
      content: { text, ...(attachments.length > 0 ? { attachments } : {}) },
      raw, timestamp: ts
    };
  }

  async sendText(
    chatId: string,
    text: string,
    options?: SendOptions,
  ): Promise<SentMessageResult> {
    this.assertNotAborted(options?.signal);
    if (!this.api) throw new Error("Zalo adapter is not connected.");

    const threadType = await this.resolveThreadType(chatId);
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
    this.assertNotAborted(options?.signal);
    if (!this.api) throw new Error("Zalo adapter is not connected.");

    const threadType = await this.resolveThreadType(chatId);
    const quote = this.resolveQuote(options?.replyToId);

    return await this.enqueueSend(async () => {
      let res: any;
      if (media.type === "sticker" && this.api.sendSticker) {
        res = await this.api.sendSticker(media.source, chatId, threadType);
      } else if (media.type === "animation" && this.api.sendAnimatedGif) {
        res = await this.api.sendAnimatedGif(
          { gif: media.source, msg: media.caption || "", quote },
          chatId,
          threadType,
        );
      } else if (media.type === "image") {
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

  async addReaction(chatId: string, messageId: string, emoji: string, options?: { signal?: AbortSignal }): Promise<void> {
    this.assertNotAborted(options?.signal);
    if (!this.api?.addReaction) return;

    const threadType = await this.resolveThreadType(chatId);
    const isGroup = threadType === 1;
    const reactionCode = EMOJI_TO_ZALO[emoji] || emoji;

    // Retrieve cached cliMsgId if available
    const cached = this.messageCache.get(messageId);
    const cliMsgId = cached?.cliMsgId || messageId;

    await this.enqueueSend(async () => {
      await this.api.addReaction(chatId, messageId, cliMsgId, reactionCode, threadType);
    });
  }

  async sendTyping(chatId: string, options?: { signal?: AbortSignal }): Promise<void> {
    this.assertNotAborted(options?.signal);
    if (!this.api?.sendTypingEvent) return;
    const threadType = await this.resolveThreadType(chatId);
    try {
      await this.api.sendTypingEvent(chatId, true, threadType);
    } catch {
      // ignore typing errors
    }
  }
}
