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
  TikTokBusinessConfig,
  TikTokRawMessage,
  TikTokSendPayload,
  TikTokSendResponse,
  TikTokWebhookBody,
} from "./types";

/**
 * TikTok Business Messaging channel adapter.
 *
 * Security:
 * - Inbound webhooks must carry a valid `tiktok-signature` header (HMAC-SHA256).
 *   Verified using timingSafeEqual to avoid timing side-channels.
 * - Replay window enforced: messages older than maxWebhookAgeSeconds (default 300s)
 *   are rejected before signature check.
 * - Outbound calls pass `Access-Token` exclusively in HTTP headers, never in the URL.
 * - Sensitive values (clientSecret, accessToken) are never printed in logs or errors.
 *
 * Concurrency:
 * - Thread-safe / stateless handler: `handleWebhook` can be called concurrently
 *   from any number of HTTP server worker threads.
 * - Messages are pushed to ChannelHub's bounded queue without blocking the webhook response.
 */
export class TikTokBusinessAdapter extends BaseChannel {
  readonly name: ChannelType = "tiktok";

  readonly capabilities = {
    inbound: true,
    outbound: true,
    media: ["image"] as const,
    reactions: false,
    editing: false,
    typing: false,
    mode: "webhook" as const,
  };

  private readonly config: TikTokBusinessConfig;
  private readonly apiRoot: string;
  private readonly maxAgeSec: number;

  constructor(config: TikTokBusinessConfig) {
    super();
    if (!config.appId) throw new Error("TikTokBusinessAdapter: appId is required");
    if (!config.clientSecret) throw new Error("TikTokBusinessAdapter: clientSecret is required");
    if (!config.accessToken) throw new Error("TikTokBusinessAdapter: accessToken is required");

    this.config = config;
    this.apiRoot = (config.apiRoot || "https://business-api.tiktok.com").replace(/\/$/, "");
    this.maxAgeSec = config.maxWebhookAgeSeconds ?? 300;
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  async connect(signal?: AbortSignal): Promise<void> {
    this.assertNotAborted(signal);
    // TikTok has no persistent connection (pure webhook). Mark connected once validated.
    this.setConnected(true);
  }

  async disconnect(signal?: AbortSignal): Promise<void> {
    this.assertNotAborted(signal);
    this.setConnected(false);
  }

  // ---------------------------------------------------------------------------
  // Webhook Signature Verification (Security Critical)
  // ---------------------------------------------------------------------------

  /**
   * Verifies the incoming `tiktok-signature` header against rawBody and clientSecret.
   * Format: `t=<timestamp>,s=<hmac_hex>`
   * Signature payload: `${timestamp}.${rawBody}`
   *
   * @param rawBody - Exact unparsed Buffer or UTF-8 string from the HTTP request.
   * @param signatureHeader - Value of the `tiktok-signature` HTTP header.
   */
  public verifySignature(rawBody: Buffer | string, signatureHeader?: string): boolean {
    if (!signatureHeader) return false;

    // Parse params: "t=12345,s=abcde"
    const params = new Map<string, string>();
    for (const part of signatureHeader.split(",")) {
      const idx = part.indexOf("=");
      if (idx !== -1) {
        params.set(part.slice(0, idx).trim(), part.slice(idx + 1).trim());
      }
    }

    const timestampStr = params.get("t");
    const receivedSig = params.get("s");
    if (!timestampStr || !receivedSig) return false;

    // Anti-replay: verify timestamp is within window
    const timestampSec = Number(timestampStr);
    if (isNaN(timestampSec)) return false;

    const nowSec = Math.floor(Date.now() / 1000);
    if (Math.abs(nowSec - timestampSec) > this.maxAgeSec) {
      return false; // Stale delivery or clock skew beyond threshold
    }

    // Compute expected HMAC-SHA256: secret + (timestamp + "." + rawBody)
    const bodyStr = typeof rawBody === "string" ? rawBody : rawBody.toString("utf8");
    const message = `${timestampStr}.${bodyStr}`;

    const expectedHex = createHmac("sha256", this.config.clientSecret)
      .update(message, "utf8")
      .digest("hex");

    const expectedBuf = Buffer.from(expectedHex, "utf8");
    const receivedBuf = Buffer.from(receivedSig, "utf8");

    if (expectedBuf.length !== receivedBuf.length) return false;
    return timingSafeEqual(expectedBuf, receivedBuf);
  }

  // ---------------------------------------------------------------------------
  // Ingress: Webhook Handler
  // ---------------------------------------------------------------------------

  /**
   * Entrypoint for HTTP webhook endpoints.
   * Validates signature, parses body, converts to UnifiedMessage, dispatches to core.
   *
   * @returns `true` if accepted & signature valid, `false` if unauthorized or unhandled.
   */
  public async handleWebhook(
    rawBody: Buffer | string,
    signatureHeader?: string,
  ): Promise<boolean> {
    if (!this.verifySignature(rawBody, signatureHeader)) {
      return false;
    }

    try {
      const bodyStr = typeof rawBody === "string" ? rawBody : rawBody.toString("utf8");
      const envelope: TikTokWebhookBody = JSON.parse(bodyStr);

      if (envelope.event !== "message.receive") {
        // Acknowledge other event types without error
        return true;
      }

      // TikTok nests message payload as a JSON string inside `content`
      const rawMsg: TikTokRawMessage = JSON.parse(envelope.content);
      const unified = this.normalizeMessage(rawMsg);
      if (unified) {
        await this.dispatchMessage(unified);
      }
      return true;
    } catch (err: any) {
      this.emit("error", new Error(`TikTokBusinessAdapter webhook parse error: ${err.message}`));
      return false;
    }
  }

  /**
   * Converts a raw TikTok message object into ChannelHub's UnifiedMessage format.
   */
  public normalizeMessage(msg: TikTokRawMessage): UnifiedMessage | null {
    if (!msg || !msg.message_id || !msg.conversation_id) return null;

    const unified: UnifiedMessage = {
      id: String(msg.message_id),
      channel: "tiktok",
      sender: {
        id: String(msg.sender_open_id),
        name: msg.sender_display_name || undefined,
        isBot: false,
      },
      chat: {
        id: String(msg.conversation_id),
        type: "dm",
      },
      content: {
        text: msg.text || "",
        attachments: msg.image_url
          ? [
              {
                type: "image",
                url: msg.image_url,
              },
            ]
          : undefined,
      },
      raw: msg,
      timestamp: (msg.create_time || Math.floor(Date.now() / 1000)) * 1000,
    };

    return unified;
  }

  // ---------------------------------------------------------------------------
  // Egress: Outbound Messaging
  // ---------------------------------------------------------------------------

  async sendText(
    conversationId: string,
    text: string,
    options?: SendOptions,
  ): Promise<SentMessageResult> {
    this.assertNotAborted(options?.signal);

    const payload: TikTokSendPayload = {
      conversation_id: conversationId,
      message_type: "TEXT",
      content: { text },
    };

    return this.postMessage(conversationId, payload, options?.signal);
  }

  async sendMedia(
    conversationId: string,
    media: MediaPayload,
    options?: SendOptions,
  ): Promise<SentMessageResult> {
    this.assertNotAborted(options?.signal);

    if (media.type !== "image") {
      throw new Error(
        `TikTokBusinessAdapter: media type "${media.type}" is not supported. Only "image" is supported by TikTok Business API.`,
      );
    }

    // media.source should be the media_id previously uploaded to TikTok
    const mediaId = typeof media.source === "string" ? media.source : media.source.toString();

    const payload: TikTokSendPayload = {
      conversation_id: conversationId,
      message_type: "IMAGE",
      content: { media_id: mediaId },
    };

    return this.postMessage(conversationId, payload, options?.signal);
  }

  // ---------------------------------------------------------------------------
  // HTTP Client (Secure, Headers-only token)
  // ---------------------------------------------------------------------------

  private async postMessage(
    conversationId: string,
    payload: TikTokSendPayload,
    signal?: AbortSignal,
  ): Promise<SentMessageResult> {
    const url = `${this.apiRoot}/open_api/v1.3/business/message/send/`;

    // Security: Token passed ONLY via header, NEVER via query string.
    const res = await fetch(url, {
      method: "POST",
      signal,
      headers: {
        "Content-Type": "application/json",
        "Access-Token": this.config.accessToken,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      // Don't leak auth tokens or internal error headers into logs
      const errText = await res.text();
      throw new Error(`TikTok API error: HTTP ${res.status} [REDACTED]`);
    }

    const data = (await res.json()) as TikTokSendResponse;
    if (data.code !== 0) {
      throw new Error(`TikTok API error code ${data.code}: ${data.message || "Unknown error"}`);
    }

    return {
      messageId: String(data.data?.message_id || Date.now()),
      chatId: conversationId,
      timestamp: Date.now(),
    };
  }
}
