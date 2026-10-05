import { createHmac, timingSafeEqual } from "node:crypto";
import { BaseChannel } from "../../core/adapter";
import type {
  ChannelType,
  MediaPayload,
  SendOptions,
  SentMessageResult,
  UnifiedMessage,
} from "../../core/types";
import type { TwilioAdapterConfig, TwilioInboundPayload } from "./types";

/**
 * Twilio Omnichannel Adapter.
 * Connects 10+ channels (WhatsApp, SMS, MMS, RCS) via a single integration point.
 */
export class TwilioChannelAdapter extends BaseChannel {
  readonly name: ChannelType = "twilio";
  readonly capabilities = {
    inbound: true,
    outbound: true,
    media: ["image", "video", "audio", "file"] as const,
    reactions: false, // Twilio doesn't officially expose inbound native reactions yet
    editing: false, // Immutable messaging channels (SMS/WhatsApp)
    typing: false,
    mode: "webhook" as const,
  };

  private readonly config: TwilioAdapterConfig;
  private readonly apiRoot: string;

  constructor(config: TwilioAdapterConfig) {
    super();
    if (!config.accountSid) throw new Error("TwilioChannelAdapter: accountSid required");
    if (!config.authToken) throw new Error("TwilioChannelAdapter: authToken required");
    if (!config.fromNumber) throw new Error("TwilioChannelAdapter: fromNumber required");

    this.config = config;
    this.apiRoot = config.apiRoot || "https://api.twilio.com";
  }

  async connect(signal?: AbortSignal): Promise<void> {
    this.assertNotAborted(signal);
    this.setConnected(true);
  }

  async disconnect(signal?: AbortSignal): Promise<void> {
    this.assertNotAborted(signal);
    this.setConnected(false);
  }

  /**
   * Twilio HMAC-SHA1 webhook signature verification.
   * Requires exact webhook URL and x-www-form-urlencoded parsed object.
   */
  public verifySignature(
    signatureHeader: string | undefined,
    url: string,
    postData: Record<string, string>,
  ): boolean {
    if (!signatureHeader) return false;

    // Twilio appends all sorted POST params to the URL without delimiters
    const sortedKeys = Object.keys(postData).sort();
    let dataStr = url;
    for (const k of sortedKeys) {
      dataStr += k + postData[k];
    }

    const expectedB64 = createHmac("sha1", this.config.authToken)
      .update(dataStr, "utf8")
      .digest("base64");

    const expectedBuf = Buffer.from(expectedB64, "utf8");
    const receivedBuf = Buffer.from(signatureHeader, "utf8");

    if (expectedBuf.length !== receivedBuf.length) return false;
    return timingSafeEqual(expectedBuf, receivedBuf);
  }

  /**
   * Main webhook entrypoint.
   */
  public async handleWebhook(
    postData: TwilioInboundPayload,
    signatureHeader?: string,
    exactUrl?: string,
  ): Promise<boolean> {
    // Verify signature if URL provided
    if (exactUrl && signatureHeader) {
      const isValid = this.verifySignature(signatureHeader, exactUrl, postData);
      if (!isValid) return false;
    }

    const unified = this.normalizeMessage(postData);
    if (unified) {
      await this.dispatchMessage(unified);
    }
    return true;
  }

  public normalizeMessage(msg: TwilioInboundPayload): UnifiedMessage | null {
    if (!msg || !msg.MessageSid) return null;

    // Detect if this is WhatsApp, SMS, or other based on 'From' prefix
    let channelAlias = "sms";
    if (msg.From.startsWith("whatsapp:")) channelAlias = "whatsapp";

    const attachments: any[] = [];
    const numMedia = parseInt(msg.NumMedia || "0", 10);
    for (let i = 0; i < numMedia; i++) {
      const url = msg[`MediaUrl${i}`];
      const mime = msg[`MediaContentType${i}`];
      if (url) {
        let type = "file";
        if (mime?.startsWith("image/")) type = "image";
        else if (mime?.startsWith("video/")) type = "video";
        else if (mime?.startsWith("audio/")) type = "audio";
        
        attachments.push({ type, url, mimeType: mime });
      }
    }

    return {
      id: msg.MessageSid,
      channel: this.name, // "twilio"
      sender: {
        id: msg.From,
      },
      chat: {
        id: msg.From, // Direct reply target
        type: "dm",
      },
      content: {
        text: msg.Body || "",
        attachments: attachments.length > 0 ? attachments : undefined,
      },
      raw: msg,
      timestamp: Date.now(), // Twilio webhooks are real-time, no timestamp in payload
      metadata: { twilioChannel: channelAlias },
    } as unknown as UnifiedMessage;
  }

  async sendText(chatId: string, text: string, options?: SendOptions): Promise<SentMessageResult> {
    const params = new URLSearchParams();
    params.append("To", chatId);
    params.append("From", this.config.fromNumber);
    params.append("Body", text);

    return this.postTwilioMessage(params, options?.signal);
  }

  async sendMedia(
    chatId: string,
    media: MediaPayload,
    options?: SendOptions,
  ): Promise<SentMessageResult> {
    const params = new URLSearchParams();
    params.append("To", chatId);
    params.append("From", this.config.fromNumber);

    if (media.caption) {
      params.append("Body", media.caption);
    }

    // Twilio only supports public media URLs via MediaUrl parameter
    if (typeof media.source !== "string" || !media.source.startsWith("http")) {
      throw new Error("TwilioChannelAdapter: media.source must be a public HTTP URL.");
    }

    params.append("MediaUrl", media.source);

    return this.postTwilioMessage(params, options?.signal);
  }

  private async postTwilioMessage(params: URLSearchParams, signal?: AbortSignal): Promise<SentMessageResult> {
    const url = `${this.apiRoot}/2010-04-01/Accounts/${this.config.accountSid}/Messages.json`;

    // Basic Auth: AccountSid : AuthToken
    const authBuf = Buffer.from(`${this.config.accountSid}:${this.config.authToken}`).toString("base64");

    const res = await fetch(url, {
      method: "POST",
      signal,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${authBuf}`,
      },
      body: params,
    });

    if (!res.ok) {
      const errText = await res.text();
      // Mask basic auth token format from err
      throw new Error(`Twilio API failed: HTTP ${res.status} [REDACTED]`);
    }

    const data = await res.json() as any;
    return {
      messageId: data.sid,
      chatId: data.to,
      timestamp: Date.now(),
    };
  }
}
