import http from "node:http";
import { createHmac, timingSafeEqual } from "node:crypto";
import { BaseChannel } from "../../core/adapter";
import type {
  ChannelType,
  MediaPayload,
  SendOptions,
  SentMessageResult,
  UnifiedMessage,
} from "../../core/types";
import type {
  MessengerAdapterConfig,
  MessengerPermission,
  MessengerSendOptions,
} from "./types";

export class MessengerChannelAdapter extends BaseChannel {
  readonly name: ChannelType = "messenger";
  readonly capabilities = {
    inbound: true,
    outbound: true,
    media: ["image", "video", "file", "audio", "animation", "sticker"] as const,
    reactions: true,
    editing: false,
    typing: true,
    mode: "webhook" as const,
  };
  private config: MessengerAdapterConfig;
  private apiBase: string;
  private server?: http.Server;

  constructor(config: MessengerAdapterConfig) {
    super();
    this.config = config;
    const version = config.apiVersion || "v19.0";
    this.apiBase = `https://graph.facebook.com/${version}`;
  }

  async connect(signal?: AbortSignal): Promise<void> {
    this.assertNotAborted(signal);
    if (!this.config.pageAccessToken) {
      throw new Error("Messenger pageAccessToken is required.");
    }
    // Verify Page Access Token
    const res = await fetch(`${this.apiBase}/me`, {
      signal,
      headers: { Authorization: `Bearer ${this.config.pageAccessToken}` }
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Failed to authenticate with Messenger Graph API: ${err}`);
    }

    // Auto check permissions
    if (this.config.checkPermissionsOnConnect !== false) {
      try {
        const perms = await this.getPermissions(signal);
        const hasMessaging = perms.some(
          (p) => (p.permission === "pages_messaging" || p.permission === "messages") && p.status === "granted"
        );
        if (!hasMessaging) {
          console.warn("[MessengerChannelAdapter] ⚠️ Warning: Token is missing 'pages_messaging' permission. Messages may fail to send/receive.");
        }
      } catch (err: any) {
        // Non-fatal warning if permissions endpoint is unreachable
        console.warn(`[MessengerChannelAdapter] Unable to inspect token permissions: ${err.message}`);
      }
    }

    // Auto subscribe page to webhooks
    if (this.config.autoSubscribePage) {
      await this.subscribePage(this.config.subscribedFields, signal);
    }

    if (this.config.port) {
      const path = this.config.webhookPath || "/webhook";
      this.server = http.createServer(async (req, res) => {
        const url = new URL(req.url || "/", `http://${req.headers.host}`);
        if (url.pathname !== path) {
          res.writeHead(404).end("Not Found");
          return;
        }

        if (req.method === "GET") {
          const mode = url.searchParams.get("hub.mode") || "";
          const token = url.searchParams.get("hub.verify_token") || "";
          const challenge = url.searchParams.get("hub.challenge") || "";
          const verified = this.verifyWebhook(mode, token, challenge);
          if (verified) {
            res.writeHead(200, { "Content-Type": "text/plain" }).end(verified);
          } else {
            res.writeHead(403).end("Forbidden");
          }
          return;
        }

        if (req.method === "POST") {
          let body = "";
          req.on("data", (chunk) => {
            body += chunk;
            if (body.length > 1024 * 1024) req.destroy();
          });
          req.on("end", async () => {
            if (this.config.appSecret) {
              const signature = req.headers["x-hub-signature-256"] as string;
              if (!this.verifySignature(body, signature)) {
                res.writeHead(401).end("Invalid Signature");
                return;
              }
            }
            try {
              const data = JSON.parse(body);
              const msgs = this.normalizeEvent(data);
              for (const m of msgs) {
                await this.dispatchMessage(m);
              }
              res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify({ status: "ok" }));
            } catch (err) {
              res.writeHead(400).end("Bad Request");
            }
          });
          return;
        }

        res.writeHead(405).end("Method Not Allowed");
      });

      await new Promise<void>((resolve) => {
        this.server?.listen(this.config.port, "0.0.0.0", () => {
          resolve();
        });
      });
    }

    this.setConnected(true);
  }

  async disconnect(signal?: AbortSignal): Promise<void> {
    this.assertNotAborted(signal);
    if (this.server) {
      await new Promise<void>((resolve) => this.server?.close(() => resolve()));
      this.server = undefined;
    }
    this.setConnected(false);
  }

  /**
   * Verify Facebook webhook subscription challenge with timing-safe comparison
   */
  public verifyWebhook(mode: string, token: string, challenge: string): string | null {
    if (mode !== "subscribe" || !this.config.verifyToken) return null;
    const a = Buffer.from(token);
    const b = Buffer.from(this.config.verifyToken);
    if (a.length !== b.length) return null;
    return timingSafeEqual(a, b) ? challenge : null;
  }

  /**
   * Verifies X-Hub-Signature-256 header (HMAC-SHA256)
   */
  public verifySignature(rawBody: string | Buffer, signatureHeader?: string): boolean {
    if (!signatureHeader || !this.config.appSecret) return false;
    const parts = signatureHeader.split("=");
    if (parts.length !== 2 || parts[0] !== "sha256") return false;

    const expected = createHmac("sha256", this.config.appSecret)
      .update(typeof rawBody === "string" ? Buffer.from(rawBody) : rawBody)
      .digest("hex");

    const a = Buffer.from(expected);
    const b = Buffer.from(parts[1]);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
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
        // Handle normal messages and postbacks
        if (!event.message && !event.postback) continue;

        // CRITICAL ANTI-LOOP FIX: Ignore echo events (messages sent by the bot itself)
        // Meta sends is_echo: true whenever the page sends a message.
        // Treating echo as inbound triggers an infinite message spam loop.
        if (event.message?.is_echo) continue;

        const senderId = event.sender?.id || "";
        let text = event.message?.text || event.postback?.title || event.postback?.payload || "";
        const attachments: any[] = [];
        
        // Handle stickers
        if (event.message?.sticker_id) {
          attachments.push({
            type: "image",
            url: event.message?.attachments?.[0]?.payload?.url || `https://facebook.com/sticker/${event.message.sticker_id}`,
            filename: `sticker_${event.message.sticker_id}.png`,
          });
        }

        // Process attachments robustly
        if (Array.isArray(event.message?.attachments)) {
          for (const att of event.message.attachments) {
            let type: "image" | "video" | "audio" | "file" = "file";
            let url = att.payload?.url || att.url || "";
            let filename = att.payload?.name || att.title || undefined;

            if (att.type === "image") type = "image";
            else if (att.type === "video") type = "video";
            else if (att.type === "audio") type = "audio";
            else if (att.type === "location") {
              type = "file";
              const lat = att.payload?.coordinates?.lat;
              const long = att.payload?.coordinates?.long;
              if (lat != null && long != null) {
                url = `https://www.google.com/maps?q=${lat},${long}`;
                filename = "location.json";
                if (!text) text = `📍 [Shared Location: ${lat}, ${long}]`;
              }
            } else if (att.type === "fallback") {
              type = "file";
              if (!text) text = `🔗 [Shared Link: ${att.title || "URL"}]`;
            } else {
              type = "file";
            }

            // Sanitize filename if present
            if (filename) {
              filename = filename.replace(/[\/\\]/g, "_").replace(/\0/g, "");
            }
            
            // Avoid duplicate sticker
            if (att.type === "image" && att.payload?.sticker_id) continue;
            
            attachments.push({ type, url, filename });
          }
        }

        messages.push({
          id: event.message?.mid || event.postback?.mid || `fb_${Date.now()}`,
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
            replyToId: event.message?.reply_to?.mid,
          },
          raw: event,
          timestamp: event.timestamp || Date.now(),
        });
      }
    }
    return messages;
  }

  async sendText(chatId: string, text: string, options?: SendOptions & MessengerSendOptions): Promise<SentMessageResult> {
    const payload: any = {
      recipient: { id: chatId },
      message: { text },
    };

    if (options?.replyToId) {
      payload.message.reply_to = { mid: options.replyToId };
    }
    if (options?.messagingType) {
      payload.messaging_type = options.messagingType;
    }
    if (options?.tag) {
      payload.messaging_type = "MESSAGE_TAG"; // Meta requires messaging_type=MESSAGE_TAG when tag is used
      payload.tag = options.tag;
    }

    const res = await this.callApi("POST", "/me/messages", payload, options?.signal);
    return {
      messageId: res.message_id || res.recipient_id || `msg_${Date.now()}`,
      chatId,
      timestamp: Date.now(),
    };
  }

  async sendMedia(chatId: string, media: MediaPayload, options?: SendOptions & MessengerSendOptions): Promise<SentMessageResult> {
    // 1. Handle native sticker_id for Messenger
    if (media.type === "sticker" && typeof media.source === "string" && /^\d+$/.test(media.source)) {
      const payload: any = {
        recipient: { id: chatId },
        message: {
          attachment: {
            type: "image",
            payload: { sticker_id: Number(media.source) },
          },
        },
      };
      if (options?.replyToId) payload.message.reply_to = { mid: options.replyToId };
      if (options?.messagingType) payload.messaging_type = options.messagingType;
      if (options?.tag) {
        payload.messaging_type = "MESSAGE_TAG";
        payload.tag = options.tag;
      }
      
      const res = await this.callApi("POST", "/me/messages", payload, options?.signal);
      return {
        messageId: res.message_id || res.recipient_id || `msg_${Date.now()}`,
        chatId,
        timestamp: Date.now(),
      };
    }

    // Map "sticker" or "animation" to Meta's "image" attachment type
    const attachmentType = (media.type === "sticker" || media.type === "animation") ? "image" : media.type;

    if (typeof media.source === "string" && (media.source.startsWith("http://") || media.source.startsWith("https://"))) {
      const payload: any = {
        recipient: { id: chatId },
        message: {
          attachment: {
            type: attachmentType,
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

      const res = await this.callApi("POST", "/me/messages", payload, options?.signal);
      return {
        messageId: res.message_id || res.recipient_id || `msg_${Date.now()}`,
        chatId,
        timestamp: Date.now(),
      };
    }

    let buffer: Uint8Array;
    let mimeType = media.mimeType;
    let filename = media.filename || "file";

    if (typeof media.source === "string") {
      const fs = await import("node:fs");
      const path = await import("node:path");
      const resolvedPath = path.resolve(media.source);
      if (!fs.existsSync(resolvedPath) || !fs.statSync(resolvedPath).isFile()) {
        throw new Error(`Media file not found or is invalid: ${media.source}`);
      }
      buffer = new Uint8Array(fs.readFileSync(resolvedPath));
      if (!media.filename) {
        filename = path.basename(resolvedPath);
      }
    } else {
      buffer = new Uint8Array(media.source);
    }

    const fileSize = buffer.byteLength;

    // Hard ceiling check for Meta Messenger (100MB)
    if (fileSize > 100 * 1024 * 1024) {
      throw new Error(
        `Messenger attachment limit exceeded: File size is ${(fileSize / (1024 * 1024)).toFixed(1)}MB. Meta Messenger caps file/video uploads at 100MB. Please compress the file or provide a streaming URL.`
      );
    }

    // Auto-detect MIME type from extension if missing
    if (!mimeType) {
      const ext = filename.split(".").pop()?.toLowerCase();
      if (ext === "mp4") mimeType = "video/mp4";
      else if (ext === "mov") mimeType = "video/quicktime";
      else if (ext === "webm") mimeType = "video/webm";
      else if (ext === "avi") mimeType = "video/x-msvideo";
      else if (ext === "mkv") mimeType = "video/x-matroska";
      else if (ext === "jpg" || ext === "jpeg") mimeType = "image/jpeg";
      else if (ext === "png") mimeType = "image/png";
      else if (ext === "gif") mimeType = "image/gif";
      else if (ext === "webp") mimeType = "image/webp";
      else if (ext === "mp3") mimeType = "audio/mpeg";
      else if (ext === "wav") mimeType = "audio/wav";
      else if (ext === "ogg") mimeType = "audio/ogg";
      else if (ext === "m4a") mimeType = "audio/mp4";
      else if (ext === "pdf") mimeType = "application/pdf";
      else mimeType = "application/octet-stream";
    }

    const blob = new Blob([buffer as any], { type: mimeType });

    // Edge case: For large files (25MB - 100MB), use Meta's Attachment Upload API first
    if (fileSize > 25 * 1024 * 1024) {
      const uploadFormData = new FormData();
      uploadFormData.append(
        "message",
        JSON.stringify({
          attachment: {
            type: attachmentType,
            payload: { is_reusable: true },
          },
        })
      );
      uploadFormData.append("filedata", blob, filename);

      const uploadUrl = `${this.apiBase}/me/message_attachments`;
      const uploadRes = await fetch(uploadUrl, {
        method: "POST",
        signal: options?.signal,
        headers: {
          Authorization: `Bearer ${this.config.pageAccessToken}`,
        },
        body: uploadFormData,
      });

      if (uploadRes.ok) {
        const uploadData = (await uploadRes.json()) as any;
        if (uploadData.attachment_id) {
          // Send message using cached attachment_id
          const payload: any = {
            recipient: { id: chatId },
            message: {
              attachment: {
                type: attachmentType,
                payload: { attachment_id: uploadData.attachment_id },
              },
            },
          };
          if (options?.replyToId) payload.message.reply_to = { mid: options.replyToId };
          const res = await this.callApi("POST", "/me/messages", payload, options?.signal);
          return {
            messageId: res.message_id || res.recipient_id || `msg_${Date.now()}`,
            chatId,
            timestamp: Date.now(),
          };
        }
      }
    }

    // Direct multipart/form-data upload for files <= 25MB
    const formData = new FormData();
    formData.append("recipient", JSON.stringify({ id: chatId }));
    formData.append(
      "message",
      JSON.stringify({
        attachment: {
          type: attachmentType,
          payload: {},
        },
      })
    );
    formData.append("filedata", blob, filename);

    const url = `${this.apiBase}/me/messages`;
    const response = await fetch(url, {
      method: "POST",
      signal: options?.signal,
      headers: {
        Authorization: `Bearer ${this.config.pageAccessToken}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Messenger API Error (${response.status}): ${err}`);
    }

    const res = (await response.json()) as any;
    return {
      messageId: res.message_id || res.recipient_id || `msg_${Date.now()}`,
      chatId,
      timestamp: Date.now(),
    };
  }

  async sendTyping(chatId: string, options?: { signal?: AbortSignal }): Promise<void> {
    await this.callApi("POST", "/me/messages", { recipient: { id: chatId }, 
      sender_action: "typing_on",
     }, options?.signal);
  }

  // --- Graph API Permission & Setup Helpers ---

  /**
   * Fetch granted scopes for the current Page Access Token
   */
  async getPermissions(signal?: AbortSignal): Promise<MessengerPermission[]> {
    const res = await this.callApi("GET", "/me/permissions", undefined, signal);
    return res.data || [];
  }

  /**
   * Subscribe the Page to the app's Webhook
   */
  async subscribePage(fields: string[] = ["messages", "messaging_postbacks"], signal?: AbortSignal): Promise<boolean> {
    try {
      const res = await this.callApi("POST", "/me/subscribed_apps", { subscribed_fields: fields }, signal);
      return Boolean(res.success);
    } catch (err: any) {
      console.error("[MessengerChannelAdapter] Failed to subscribe page:", err.message);
      return false;
    }
  }

  /**
   * Sets Messenger Profile (Get Started button, greeting text)
   */
  async setMessengerProfile(payload: Record<string, unknown>, signal?: AbortSignal): Promise<boolean> {
    try {
      const res = await this.callApi("POST", "/me/messenger_profile", payload, signal);
      return res.result === "success";
    } catch (err: any) {
      console.error("[MessengerChannelAdapter] Failed to set messenger profile:", err.message);
      return false;
    }
  }

  private async callApi(method: string, path: string, body?: any, signal?: AbortSignal): Promise<any> {
    const url = `${this.apiBase}${path}`;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.config.pageAccessToken}`,
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
