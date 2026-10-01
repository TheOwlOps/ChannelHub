export interface MessengerAdapterConfig {
  pageAccessToken: string;
  verifyToken?: string;
  apiVersion?: string; // e.g. "v19.0"
  port?: number; // Port to start inbound webhook server
  webhookPath?: string;
}
