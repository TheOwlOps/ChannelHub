export interface TelegramAdapterConfig {
  botToken: string;
  accountId?: string;
  apiRoot?: string;
  autoStart?: boolean;
  pollIntervalMs?: number;
}
