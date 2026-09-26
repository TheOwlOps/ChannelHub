export interface TelegramAdapterConfig {
    botToken: string;
    apiRoot?: string;
    autoStart?: boolean;
    pollIntervalMs?: number;
}
