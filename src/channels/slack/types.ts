/** Configuration for the slack channel adapter. */
export interface SlackAdapterConfig {
  botToken: string;
  accountId?: string;
  appToken?: string;
  signingSecret?: string;
}
