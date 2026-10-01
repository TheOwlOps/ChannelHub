#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type Tool,
} from "@modelcontextprotocol/sdk/types.js";

import { ChannelHub } from "../src/core/hub.js";
import { getChannelHubMcpTools, handleChannelHubMcpCall } from "../src/bridges/mcp/index.js";

// Import available adapters
import { ZaloChannelAdapter } from "../src/channels/zalo/index.js";
import { TelegramChannelAdapter } from "../src/channels/telegram/index.js";
import { DiscordChannelAdapter } from "../src/channels/discord/index.js";
import { SlackChannelAdapter } from "../src/channels/slack/index.js";
import { MessengerChannelAdapter } from "../src/channels/messenger/index.js";
import { CONFIG } from "../src/config/env.js";
import fs from "node:fs";

async function main() {
  const hub = new ChannelHub();

  // Auto-register channels based on available environment variables or config
  // 1. Zalo
  if (fs.existsSync(CONFIG.PERSONAL.CRED_PATH)) {
    hub.register(new ZaloChannelAdapter({ credentialsPath: CONFIG.PERSONAL.CRED_PATH }));
  }

  // 2. Telegram
  if (process.env.TELEGRAM_BOT_TOKEN) {
    hub.register(new TelegramChannelAdapter({ botToken: process.env.TELEGRAM_BOT_TOKEN }));
  }

  // 3. Discord
  if (process.env.DISCORD_BOT_TOKEN) {
    hub.register(new DiscordChannelAdapter({ botToken: process.env.DISCORD_BOT_TOKEN }));
  }

  // 4. Slack
  if (process.env.SLACK_BOT_TOKEN) {
    hub.register(new SlackChannelAdapter({ botToken: process.env.SLACK_BOT_TOKEN }));
  }

  // 5. Messenger
  if (process.env.MESSENGER_PAGE_TOKEN) {
    hub.register(
      new MessengerChannelAdapter({
        pageAccessToken: process.env.MESSENGER_PAGE_TOKEN,
        verifyToken: process.env.MESSENGER_VERIFY_TOKEN || "channelhub_mcp",
      })
    );
  }

  await hub.start();

  // Initialize MCP Server
  const server = new Server(
    {
      name: "channelhub-mcp",
      version: "1.4.1",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Map our internal tool definitions to standard MCP Tool format
  const internalTools = getChannelHubMcpTools();
  const mcpTools: Tool[] = internalTools.map((t) => ({
    name: t.name,
    description: t.description,
    inputSchema: t.parameters as any,
  }));

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools: mcpTools };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    
    // Fallback if arguments is undefined
    const safeArgs = args || {};

    const result = await handleChannelHubMcpCall(hub, name, safeArgs);
    return {
      content: result.content,
      isError: result.isError,
    };
  });

  // Start stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  // Log to stderr so it doesn't corrupt stdout MCP protocol
  console.error("🚀 ChannelHub MCP Server is running on stdio!");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
