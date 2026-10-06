export interface WebhookFieldMap {
  /** JSONPath-like dot-notation to extract messageId */
  messageId?: string;
  /** dot-notation to extract sender id */
  senderId?: string;
  /** dot-notation to extract sender name */
  senderName?: string;
  /** dot-notation to extract chat/room/channel id */
  chatId?: string;
  /** dot-notation to extract text body */
  text?: string;
}

export interface WebhookGenericAdapterConfig {
  /** Name of the service, e.g. "stripe", "shopify", "jira". Used as channel type. */
  serviceName: string;
  /** HMAC-SHA256 secret for signature verification (optional) */
  webhookSecret?: string;
  /** Header name where signature lives (default: "x-hub-signature-256") */
  signatureHeader?: string;
  /** Prefix for signature value, e.g. "sha256=" */
  signaturePrefix?: string;
  /** Field mapping to extract data from raw payload */
  fieldMap?: WebhookFieldMap;
  /**
   * Handler invoked when hub.send() is called. Use this to push back to the
   * external service (e.g. close a Stripe dispute, comment on a Jira ticket).
   */
  sendHandler?: (chatId: string, text: string) => Promise<SentResult>;
}

export interface SentResult {
  messageId: string;
  chatId: string;
  timestamp: number;
}
