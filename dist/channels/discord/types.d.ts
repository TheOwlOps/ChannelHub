/** Configuration for the discord channel adapter. */
export interface DiscordAdapterConfig {
    botToken: string;
    accountId?: string;
    intents?: number;
    autoStart?: boolean;
}
