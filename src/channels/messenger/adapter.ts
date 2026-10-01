import { BaseChannel } from "../../core/adapter";
import type {
  ChannelType,
  MediaPayload,
  SendOptions,
  SentMessageResult,
  UnifiedMessage,
} from "../../core/types";
import type { MessengerAdapterConfig } from "./types";

export class MessengerChannelAdapter extends BaseChannel {
  readonly name: ChannelType = "messenger";
  private config: MessengerAdapterConfig;
  private apiBase: string;

  constructor(config: MessengerAdapterConfig) {
    super();
    this.config = config;
    const version = config.apiVersion || "v19.0";
    this.apiBase = `https://graph.facebook.com/${version}`;
  }

  async connect(): Promise<void> {
    if (!this.config.pageAccessToken) {
      throw new Error("Messenger pageAccessToken is required.");
    }
    // Verify Page Access Token
    const res = await fetch(`${this.apiBase}/me?access_token=${this.config.pageAccessToken}`);
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Failed to authenticate with Messenger Graph API: ${err}`);
    }
    this.setConnected(true);
  }

  async disconnect(): Promise<void> {
    this.setConnected(false);
  }

  /**
   * Verify Facebook webhook subscription challenge
   */
  public verifyWebhook(mode: string, token: string, challenge: string): string | null {
    if (mode === "subscribe" && token === this.config.verifyToken) {
      return challenge;
    }
    return null;
  }

  /**
   * Convert Facebook Messenger webhook event/entry to UnifiedMessage
   */
  public normalizeEvent(body: any): UnifiedMessage[] {
    const messages: UnifiedMessage[] = [];
    if (body?.object !== "page" || !Array.isArray(body?.entry)) {
      return messages;
    }

    for (const entry of body.entry) {
      if (!Array.isArray(entry.messaging)) continue;
      for (const event of entry.messaging) {
        if (!event.message) continue;

        const senderId = event.sender?.id || "";
        const text = event.message.text || "";
        const attachments = (event.message.attachments || []).map((att: any) => ({
          type: att.type || "file",
          url: att.payload?.url || "",
        }));

        messages.push({
          id: event.message.mid || `fb_${Date.now()}`,
          channel: this.name,
          sender: {
            id: senderId,
            name: undefined,
          },
          chat: {
            id: senderId,
            type: "dm",
          },
          content: {
            text,
            attachments,
            replyToId: event.message.reply_to?.mid,
          },
          raw: event,
          timestamp: event.timestamp || Date.now(),
        });
      }
    }
    return messages;
  }

  async sendText(chatId: string, text: string, options?: SendOptions): Promise<SentMessageResult> {
    const payload: any = {
      recipient: { id: chatId },
      message: { text },
    };

    if (options?.replyToId) {
      payload.message.reply_to = { mid: options.replyToId };
    }

    const res = await this.callApi("POST", "/me/messages", payload);
    return {
      messageId: res.message_id || res.recipient_id || `msg_${Date.now()}`,
      chatId,
      timestamp: Date.now(),
    };
  }

  async sendMedia(chatId: string, media: MediaPayload, options?: SendOptions): Promise<SentMessageResult> {
    if (typeof media.source === "string" && (media.source.startsWith("http://") || media.source.startsWith("https://"))) {
      const payload: any = {
        recipient: { id: chatId },
        message: {
          attachment: {
            type: media.type,
            payload: {
              url: media.source,
              is_reusable: true,
            },
          },
        },
      };

      if (options?.replyToId) {
        payload.message.reply_to = { mid: options.replyToId };
      }

      const res = await this.callApi("POST", "/me/messages", payload);
      return {
        messageId: res.message_id || res.recipient_id || `msg_${Date.now()}`,
        chatId,
        timestamp: Date.now(),
      };
    }

    // Local buffer or file path requires multipart/form-data upload
    const formData = new FormData();
    formData.append("recipient", JSON.stringify({ id: chatId }));

    let blob: Blob;
    if (typeof media.source === "string") {
      const fs = await import("node:fs");
      const path = await import("node:path");
      const resolvedPath = path.resolve(media.source);
      if (!fs.existsSync(resolvedPath) || !fs.statSync(resolvedPath).isFile()) {
        throw new Error(`Media file not found or is invalid: ${media.source}`);
      }
      const buffer = fs.readFileSync(resolvedPath);
      blob = new Blob([new Uint8Array(buffer)], { type: media.mimeType || "application/octet-stream" });
    } else {
      blob = new Blob([new Uint8Array(media.source)], { type: media.mimeType || "application/octet-stream" });
    }

    formData.append(
      "message",
      JSON.stringify({
        attachment: {
          type: media.type,
          payload: {},
        },
      })
    );
    formData.append("filedata", blob, media.filename || "file");

    const url = `${this.apiBase}/me/messages?access_token=${encodeURIComponent(this.config.pageAccessToken)}`;
    const response = await fetch(url, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Messenger API Error (${response.status}): ${err}`);
    }

    const res = await response.json() as any;
    return {
      messageId: res.message_id || res.recipient_id || `msg_${Date.now()}`,
      chatId,
      timestamp: Date.now(),
    };
  }

  async sendTyping(chatId: string): Promise<void> {
    await this.callApi("POST", "/me/messages", {
      recipient: { id: chatId },
      sender_action: "typing_on",
    });
  }

  private async callApi(method: string, path: string, body?: any): Promise<any> {
    const url = `${this.apiBase}${path}?access_token=${encodeURIComponent(this.config.pageAccessToken)}`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    const res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Messenger API Error (${res.status}): ${err}`);
    }

    return await res.json();
  }
}
