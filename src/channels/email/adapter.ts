import { BaseChannel } from "../../core/adapter";
import type {
  ChannelType,
  MediaPayload,
  SendOptions,
  SentMessageResult,
  UnifiedMessage,
} from "../../core/types";
import type { EmailAdapterConfig, EmailSendOptions } from "./types";

export class EmailChannelAdapter extends BaseChannel {
  readonly name: ChannelType = "email";
  private config: EmailAdapterConfig;

  constructor(config: EmailAdapterConfig) {
    super();
    if (!config.apiKey) throw new Error("EmailAdapter requires apiKey");
    if (!config.fromAddress) throw new Error("EmailAdapter requires fromAddress");
    this.config = {
      provider: "resend",
      ...config,
    };
  }

  async connect(signal?: AbortSignal): Promise<void> {
    if (signal?.aborted) throw new Error("Connection aborted");

    // Quick verification call based on provider
    if (this.config.provider === "resend") {
      const base = this.config.apiBaseUrl || "https://api.resend.com";
      const res = await fetch(`${base}/api-keys`, {
        signal,
        headers: { Authorization: `Bearer ${this.config.apiKey}` },
      });
      // Resend might return 200 or 403 if restricted, but any valid response proves network reachability
      if (res.status === 401) {
        throw new Error("Invalid Resend API Key provided to EmailChannelAdapter");
      }
    }

    this.setConnected(true);
  }

  async disconnect(): Promise<void> {
    this.setConnected(false);
  }

  async sendText(
    chatId: string,
    text: string,
    options?: SendOptions & EmailSendOptions
  ): Promise<SentMessageResult> {
    if (options?.signal?.aborted) throw new Error("Send aborted");

    const subject = options?.subject || this.config.defaultSubject || "Message from AI Agent";
    const recipient = chatId; // in email adapter, chatId is the email address

    if (this.config.provider === "resend") {
      const base = this.config.apiBaseUrl || "https://api.resend.com";
      const body: any = {
        from: this.config.fromAddress,
        to: [recipient],
        subject,
        text,
      };
      if (options?.html) body.html = options.html;
      if (options?.cc) body.cc = options.cc;
      if (options?.bcc) body.bcc = options.bcc;
      if (options?.replyTo) body.reply_to = options.replyTo;

      const res = await fetch(`${base}/emails`, {
        method: "POST",
        signal: options?.signal,
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`Resend API failed (${res.status}): ${err}`);
      }

      const data = await res.json();
      return {
        messageId: data.id || `email_${Date.now()}`,
        chatId: recipient,
        timestamp: Date.now(),
      };
    } else {
      // SendGrid v3
      const base = this.config.apiBaseUrl || "https://api.sendgrid.com/v3";
      const body: any = {
        personalizations: [{ to: [{ email: recipient }] }],
        from: { email: this.config.fromAddress },
        subject,
        content: [{ type: "text/plain", value: text }],
      };
      if (options?.html) {
        body.content.push({ type: "text/html", value: options.html });
      }

      const res = await fetch(`${base}/mail/send`, {
        method: "POST",
        signal: options?.signal,
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`SendGrid API failed (${res.status}): ${err}`);
      }

      return {
        messageId: res.headers.get("x-message-id") || `sg_${Date.now()}`,
        chatId: recipient,
        timestamp: Date.now(),
      };
    }
  }

  async sendMedia(
    chatId: string,
    media: MediaPayload,
    options?: SendOptions & EmailSendOptions
  ): Promise<SentMessageResult> {
    if (options?.signal?.aborted) throw new Error("Send aborted");

    let base64Content = "";
    if (typeof media.source === "string") {
      base64Content = Buffer.from(media.source).toString("base64");
    } else if (media.source instanceof Uint8Array || Buffer.isBuffer(media.source)) {
      base64Content = Buffer.from(media.source).toString("base64");
    }

    const filename = media.filename || "attachment.dat";
    const subject = options?.subject || this.config.defaultSubject || `Attachment: ${filename}`;

    if (this.config.provider === "resend") {
      const base = this.config.apiBaseUrl || "https://api.resend.com";
      const body: any = {
        from: this.config.fromAddress,
        to: [chatId],
        subject,
        text: media.caption || `Attached file: ${filename}`,
        attachments: [
          {
            filename,
            content: base64Content,
          },
        ],
      };

      const res = await fetch(`${base}/emails`, {
        method: "POST",
        signal: options?.signal,
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`Resend sendMedia failed (${res.status}): ${err}`);
      }

      const data = await res.json();
      return {
        messageId: data.id || `email_${Date.now()}`,
        chatId,
        timestamp: Date.now(),
      };
    } else {
      // SendGrid
      const base = this.config.apiBaseUrl || "https://api.sendgrid.com/v3";
      const body: any = {
        personalizations: [{ to: [{ email: chatId }] }],
        from: { email: this.config.fromAddress },
        subject,
        content: [{ type: "text/plain", value: media.caption || `Attached file: ${filename}` }],
        attachments: [
          {
            content: base64Content,
            filename,
            type: media.mimeType || "application/octet-stream",
            disposition: "attachment",
          },
        ],
      };

      const res = await fetch(`${base}/mail/send`, {
        method: "POST",
        signal: options?.signal,
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`SendGrid sendMedia failed (${res.status}): ${err}`);
      }

      return {
        messageId: res.headers.get("x-message-id") || `sg_${Date.now()}`,
        chatId,
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Inbound webhook parser for received emails (Resend / SendGrid Inbound Parse)
   */
  handleInboundWebhook(rawPayload: any): UnifiedMessage {
    const from = rawPayload.from || rawPayload.envelope?.from || "unknown@domain.com";
    const text = rawPayload.text || rawPayload.body || rawPayload.subject || "";
    const id = rawPayload.id || `inbound_email_${Date.now()}`;

    const unified: UnifiedMessage = {
      id,
      channel: "email",
      chat: {
        id: from,
        type: "dm",
      },
      sender: {
        id: from,
        name: rawPayload.sender_name || from,
      },
      content: {
        text,
      },
      timestamp: Date.now(),
      raw: rawPayload,
    };

    this.dispatchMessage(unified);
    return unified;
  }
}
