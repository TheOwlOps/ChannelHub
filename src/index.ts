// Root SDK Entrypoint — @theowlops/channelhub v2
//
// Layout (see docs/STRUCTURE.md):
//   core/      contracts, engine, reliability, identity, media, insights
//   channels/  one uniform folder per channel: adapter.ts + types.ts + index.ts
//   bridges/   mcp, webhook, dashboard
//   legacy/    frozen ZaloHub v1 compatibility surface
//   config/    environment configuration

// 1. Core abstractions & engine
export * from "./core/index";

// 2. Channel adapters
export { ZaloChannelAdapter, type ZaloAdapterConfig } from "./channels/zalo/index";
export { TelegramChannelAdapter } from "./channels/telegram/index";
export type { TelegramAdapterConfig } from "./channels/telegram/types";
export { DiscordChannelAdapter, type DiscordAdapterConfig } from "./channels/discord/index";
export { SlackChannelAdapter, type SlackAdapterConfig } from "./channels/slack/index";
export { MessengerChannelAdapter, type MessengerAdapterConfig } from "./channels/messenger/index";
export {
  MessengerPersonalAdapter,
  type MessengerPersonalConfig,
} from "./channels/messenger-personal/index";
export { TikTokBusinessAdapter, type TikTokBusinessConfig } from "./channels/tiktok/index";
export { TwilioChannelAdapter, type TwilioAdapterConfig } from "./channels/twilio/index";
export { EmailChannelAdapter, type EmailAdapterConfig, type EmailSendOptions } from "./channels/email/index";
export { GitHubChannelAdapter, type GitHubAdapterConfig } from "./channels/github/index";
export { CalendarChannelAdapter, type CalendarAdapterConfig, type CalendarEventPayload } from "./channels/calendar/index";
export { WebhookGenericAdapter, type WebhookGenericAdapterConfig } from "./channels/webhook-generic/index";

// 3. AI & protocol bridges
export {
  getChannelHubMcpTools,
  handleChannelHubMcpCall,
  type McpToolDefinition,
} from "./bridges/mcp/index";
export { WebhookBridge, type WebhookBridgeConfig } from "./bridges/webhook/index";
export { DashboardBridge, type DashboardBridgeConfig } from "./bridges/dashboard/index";

// 4. Legacy ZaloHub v1 compatibility (frozen — see src/legacy/)
export { ZaloPersonalBot } from "./legacy/zalo/personal/client";
export { ZaloOABot } from "./legacy/zalo/oa/client";
export { initPersonalBot } from "./legacy/zalo/personal/index";
export { initOABot } from "./legacy/zalo/oa/index";
export { CommandRouter } from "./legacy/commands/router";
export type { Command, CommandContext } from "./legacy/commands/types";

// 5. Config & Zalo constants
export { CONFIG } from "./config/env";
export { ZaloReactions, ZaloThreadType } from "./channels/zalo/index";
