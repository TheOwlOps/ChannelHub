export interface MessengerAdapterConfig {
  pageAccessToken: string;
  accountId?: string;
  verifyToken?: string;
  /** App Secret from Meta Developer Dashboard to verify X-Hub-Signature-256 */
  appSecret?: string;
  port?: number;
  webhookPath?: string;
  apiVersion?: string;
}
