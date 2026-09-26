import type { ChannelHub } from "../../core/hub";

export interface McpToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export function getChannelHubMcpTools(): McpToolDefinition[] {
  return [
    {
      name: "channelhub_list_channels",
      description: "List all active channels registered in ChannelHub (e.g. zalo, telegram, discord, slack).",
      parameters: {
        type: "object",
        properties: {},
      },
    },
    {
      name: "channelhub_send_message",
      description: "Send a text message or reply to a specific chat on a registered channel.",
      parameters: {
        type: "object",
        required: ["channel", "chatId", "text"],
        properties: {
          channel: {
            type: "string",
            description: "Channel name (e.g. 'zalo', 'telegram', 'discord', 'slack')",
          },
          chatId: {
            type: "string",
            description: "Target chat/thread/channel ID",
          },
          text: {
            type: "string",
            description: "Message body text",
          },
          replyToId: {
            type: "string",
            description: "Optional message ID to reply to",
          },
        },
      },
    },
    {
      name: "channelhub_add_reaction",
      description: "React to a message with an emoji.",
      parameters: {
        type: "object",
        required: ["channel", "chatId", "messageId", "emoji"],
        properties: {
          channel: { type: "string" },
          chatId: { type: "string" },
          messageId: { type: "string" },
          emoji: { type: "string" },
        },
      },
    },
  ];
}

export async function handleChannelHubMcpCall(
  hub: ChannelHub,
  toolName: string,
  args: Record<string, any>,
): Promise<{ content: Array<{ type: "text"; text: string }>; isError?: boolean }> {
  try {
    switch (toolName) {
      case "channelhub_list_channels": {
        const channels = hub.listChannels();
        return {
          content: [{ type: "text", text: JSON.stringify({ channels }, null, 2) }],
        };
      }
      case "channelhub_send_message": {
        const ch = hub.getChannel(args.channel);
        if (!ch) throw new Error(`Channel '${args.channel}' not found or not active.`);
        const res = await ch.sendText(args.chatId, args.text, { replyToId: args.replyToId });
        return {
          content: [{ type: "text", text: JSON.stringify(res, null, 2) }],
        };
      }
      case "channelhub_add_reaction": {
        const ch = hub.getChannel(args.channel);
        if (!ch) throw new Error(`Channel '${args.channel}' not found.`);
        if (!ch.addReaction) throw new Error(`Channel '${args.channel}' does not support reactions.`);
        await ch.addReaction(args.chatId, args.messageId, args.emoji);
        return {
          content: [{ type: "text", text: JSON.stringify({ success: true }) }],
        };
      }
      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  } catch (err: any) {
    return {
      isError: true,
      content: [{ type: "text", text: err.message || String(err) }],
    };
  }
}
