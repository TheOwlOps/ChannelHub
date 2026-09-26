// Root SDK Entrypoint — @theowlops/channelhub

// 1. Core Abstractions & Engine
export * from "./core/index";

// 2. Channel Adapters
export { ZaloChannelAdapter, type ZaloAdapterConfig } from "./channels/zalo/index";
export { TelegramChannelAdapter } from "./channels/telegram/index";
export type { TelegramAdapterConfig } from "./channels/telegram/types";
export { DiscordChannelAdapter, type DiscordAdapterConfig } from "./channels/discord/index";
export { SlackChannelAdapter, type SlackAdapterConfig } from "./channels/slack/index";

// 3. Backward Compatibility with ZaloHub v1
export { ZaloPersonalBot } from "./personal/client";
export { ZaloOABot } from "./oa/client";
export { initPersonalBot } from "./personal/index";
export { initOABot } from "./oa/index";
export { CommandRouter } from "./commands/router";
export type { Command, CommandContext } from "./commands/types";
export { CONFIG } from "./config/env";
export { Zalo } from "zca-js";
