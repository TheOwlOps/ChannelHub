export type EmailProviderType = "resend" | "sendgrid";

export interface EmailAdapterConfig {
  /** Email Service Provider (defaults to "resend") */
  provider?: EmailProviderType;
  /** API Key for Resend (re_...) or SendGrid (SG...) */
  apiKey: string;
  /** Sender address, e.g. "AI Assistant <bot@yourdomain.com>" */
  fromAddress: string;
  /** Default Subject line if not provided in options */
  defaultSubject?: string;
  /** Webhook signing secret for inbound email events */
  webhookSecret?: string;
  /** Custom base URL for enterprise or self-hosted API gateways */
  apiBaseUrl?: string;
}

export interface EmailSendOptions {
  subject?: string;
  html?: string;
  cc?: string[];
  bcc?: string[];
  replyTo?: string;
}
