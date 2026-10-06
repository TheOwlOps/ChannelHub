import { createHmac, timingSafeEqual } from "node:crypto";
import { BaseChannel } from "../../core/adapter";
import type {
  ChannelType,
  MediaPayload,
  SendOptions,
  SentMessageResult,
  UnifiedMessage,
} from "../../core/types";
import type { WebhookGenericAdapterConfig } from "./types";

/**
 * WebhookGenericAdapter — catch-all adapter for any external webhook (Stripe,
 * Shopify, Jira, PagerDuty, Linear, etc.). Normalizes arbitrary payloads into
 * UnifiedMessage via dot-notation field mapping.
 */
export class WebhookGenericAdapter extends BaseChannel {
  readonly name: ChannelType;
  private config: WebhookGenericAdapterConfig;

  constructor(config: WebhookGenericAdapterConfig) {
    super();
    if (!config.serviceName) throw new Error("WebhookGenericAdapterConfig.serviceName is required");
    this.name = config.serviceName as ChannelType;
    this.config = config;
  }

  async connect(_signal?: AbortSignal): Promise<void> {
    this.setConnected(true);
  }

  async disconnect(): Promise<void> {
    this.setConnected(false);
  }

  /**
   * Verify signature using HMAC-SHA256 with timing-safe comparison.
   * Fail-closed: returns false if secret configured but header missing/mismatched.
   */
  verifySignature(payload: string | Buffer, headerValue: string): boolean {
    if (!this.config.webhookSecret) return true; // no secret configured = bypass
    if (!headerValue) return false;

    const prefix = this.config.signaturePrefix || "";
    let cleanHeader = headerValue;
    if (prefix && cleanHeader.startsWith(prefix)) {
      cleanHeader = cleanHeader.slice(prefix.length);
    }

    const expected = createHmac("sha256", this.config.webhookSecret)
      .update(payload)
      .digest("hex");

    const a = Buffer.from(expected);
    const b = Buffer.from(cleanHeader);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  }

  /**
   * Extract value from nested object using dot-notation ("data.object.id").
   */
  private getByPath(obj: any, path?: string): any {
    if (!path) return undefined;
    return path.split(".").reduce((acc, part) => (acc && acc[part] !== undefined ? acc[part] : undefined), obj);
  }

  /**
   * Normalize an arbitrary payload into a UnifiedMessage using fieldMap.
   */
  normalizePayload(payload: Record<string, any>): UnifiedMessage {
    const fm = this.config.fieldMap || {};

    const messageId = String(this.getByPath(payload, fm.messageId) || payload.id || `wh-${Date.now()}`);
    const senderId = String(this.getByPath(payload, fm.senderId) || payload.sender || payload.user || "webhook");
    const senderName = String(this.getByPath(payload, fm.senderName) || senderId);
    const chatId = String(this.getByPath(payload, fm.chatId) || payload.channel || payload.room || "default");
    const text = String(this.getByPath(payload, fm.text) || payload.message || payload.text || JSON.stringify(payload));

    return {
      channel: this.name,
      id: messageId,
      sender: { id: senderId, name: senderName },
      chat: { id: chatId, type: "group" },
      content: { text },
      timestamp: Date.now(),
      raw: payload,
    } as UnifiedMessage;
  }

  /**
   * Handle outbound sends via sendHandler or fallback to mock result.
   */
  async sendText(chatId: string, text: string, _options?: SendOptions): Promise<SentMessageResult> {
    if (this.config.sendHandler) {
      return await this.config.sendHandler(chatId, text);
    }
    return {
      messageId: `sent-${Date.now()}`,
      chatId,
      timestamp: Date.now(),
    };
  }

  async sendMedia(chatId: string, _media: MediaPayload, _options?: SendOptions): Promise<SentMessageResult> {
    throw new Error(`sendMedia is not implemented for generic webhook service "${this.name}".`);
  }
}
