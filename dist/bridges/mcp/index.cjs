var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __hasOwnProp = Object.prototype.hasOwnProperty;
function __accessProp(key) {
  return this[key];
}
var __toCommonJS = (from) => {
  var entry = (__moduleCache ??= new WeakMap).get(from), desc;
  if (entry)
    return entry;
  entry = __defProp({}, "__esModule", { value: true });
  if (from && typeof from === "object" || typeof from === "function") {
    for (var key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(entry, key))
        __defProp(entry, key, {
          get: __accessProp.bind(from, key),
          enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
        });
  }
  __moduleCache.set(from, entry);
  return entry;
};
var __moduleCache;
var __returnValue = (v) => v;
function __exportSetter(name, newValue) {
  this[name] = __returnValue.bind(null, newValue);
}
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, {
      get: all[name],
      enumerable: true,
      configurable: true,
      set: __exportSetter.bind(all, name)
    });
};

// src/bridges/mcp/index.ts
var exports_mcp = {};
__export(exports_mcp, {
  getChannelHubMcpTools: () => getChannelHubMcpTools,
  handleChannelHubMcpCall: () => handleChannelHubMcpCall
});
module.exports = __toCommonJS(exports_mcp);
function getChannelHubMcpTools() {
  return [
    {
      name: "channelhub_list_channels",
      description: "List all active channels registered in ChannelHub (e.g. zalo, telegram, discord, slack, messenger) with their connection state.",
      parameters: {
        type: "object",
        properties: {}
      }
    },
    {
      name: "channelhub_get_status",
      description: "Get detailed connection status for each registered messaging channel.",
      parameters: {
        type: "object",
        properties: {}
      }
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
            description: "Channel name (e.g. 'zalo', 'telegram', 'discord', 'slack', 'messenger')"
          },
          chatId: {
            type: "string",
            description: "Target chat/thread/channel ID"
          },
          text: {
            type: "string",
            description: "Message body text"
          },
          replyToId: {
            type: "string",
            description: "Optional message ID to reply to"
          }
        }
      }
    },
    {
      name: "channelhub_send_media",
      description: "Send an image, video, audio, or document file to a specific chat.",
      parameters: {
        type: "object",
        required: ["channel", "chatId", "url", "mediaType"],
        properties: {
          channel: {
            type: "string",
            description: "Channel name (e.g. 'zalo', 'telegram', 'discord', 'slack', 'messenger')"
          },
          chatId: {
            type: "string",
            description: "Target chat/thread/channel ID"
          },
          url: {
            type: "string",
            description: "Public URL or local file path to the media"
          },
          mediaType: {
            type: "string",
            enum: ["image", "video", "audio", "file"],
            description: "Media type"
          },
          caption: {
            type: "string",
            description: "Optional caption for the media"
          }
        }
      }
    },
    {
      name: "channelhub_send_typing",
      description: "Trigger a typing indicator on the target channel to let users know the bot is thinking.",
      parameters: {
        type: "object",
        required: ["channel", "chatId"],
        properties: {
          channel: {
            type: "string",
            description: "Channel name"
          },
          chatId: {
            type: "string",
            description: "Target chat/thread ID"
          }
        }
      }
    },
    {
      name: "channelhub_edit_message",
      description: "Edit a previously sent message text (supported on Telegram, Discord, Slack).",
      parameters: {
        type: "object",
        required: ["channel", "chatId", "messageId", "newText"],
        properties: {
          channel: {
            type: "string",
            description: "Channel name"
          },
          chatId: {
            type: "string",
            description: "Target chat/thread ID"
          },
          messageId: {
            type: "string",
            description: "ID of the message to edit"
          },
          newText: {
            type: "string",
            description: "Updated message content"
          }
        }
      }
    },
    {
      name: "channelhub_send_sticker",
      description: "Send a sticker to a chat (supports Telegram sticker file_id/url, Zalo sticker ID, Messenger sticker_id/URL).",
      parameters: {
        type: "object",
        required: ["channel", "chatId", "sticker"],
        properties: {
          channel: { type: "string" },
          chatId: { type: "string" },
          sticker: { type: "string", description: "Sticker ID or public sticker URL/path" },
          replyToId: { type: "string", description: "Optional message ID to reply to" }
        }
      }
    },
    {
      name: "channelhub_send_gif",
      description: "Send an animated GIF to a chat (supports GIF URL or local file path).",
      parameters: {
        type: "object",
        required: ["channel", "chatId", "gifUrl"],
        properties: {
          channel: { type: "string" },
          chatId: { type: "string" },
          gifUrl: { type: "string", description: "Public GIF URL or local .gif file path" },
          caption: { type: "string", description: "Optional caption" },
          replyToId: { type: "string", description: "Optional message ID to reply to" }
        }
      }
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
          emoji: { type: "string" }
        }
      }
    },
    {
      name: "channelhub_broadcast",
      description: "Broadcast a text message to multiple destinations (chat IDs) across channels simultaneously.",
      parameters: {
        type: "object",
        required: ["targets", "text"],
        properties: {
          targets: {
            type: "array",
            description: "List of targets to broadcast to",
            items: {
              type: "object",
              required: ["channel", "chatId"],
              properties: {
                channel: { type: "string" },
                chatId: { type: "string" }
              }
            }
          },
          text: {
            type: "string",
            description: "Message body to broadcast"
          }
        }
      }
    },
    {
      name: "channelhub_send_email",
      description: "Send an email (via Resend, SendGrid, or registered Email channel) with full support for HTML, Subject, CC, and BCC.",
      parameters: {
        type: "object",
        required: ["to", "subject", "text"],
        properties: {
          to: {
            type: "string",
            description: "Recipient email address"
          },
          subject: {
            type: "string",
            description: "Email subject line"
          },
          text: {
            type: "string",
            description: "Plain text body of the email"
          },
          html: {
            type: "string",
            description: "Optional rich HTML body"
          },
          cc: {
            type: "array",
            items: { type: "string" },
            description: "Optional list of CC email addresses"
          },
          bcc: {
            type: "array",
            items: { type: "string" },
            description: "Optional list of BCC email addresses"
          },
          replyTo: {
            type: "string",
            description: "Optional reply-to email address"
          }
        }
      }
    }
  ];
}
async function handleChannelHubMcpCall(hub, toolName, args) {
  try {
    switch (toolName) {
      case "channelhub_list_channels": {
        const channels = hub.listChannels();
        return {
          content: [{ type: "text", text: JSON.stringify({ channels }, null, 2) }]
        };
      }
      case "channelhub_get_status": {
        const channels = hub.listChannels();
        const statusMap = {};
        for (const name of channels) {
          const ch = hub.getChannel(name);
          statusMap[name] = { connected: ch ? ch.isConnected() : false };
        }
        return {
          content: [{ type: "text", text: JSON.stringify({ status: statusMap }, null, 2) }]
        };
      }
      case "channelhub_send_message": {
        const ch = hub.getChannel(args.channel);
        if (!ch)
          throw new Error(`Channel '${args.channel}' not found or not active.`);
        const res = await ch.sendText(args.chatId, args.text, { replyToId: args.replyToId });
        return {
          content: [{ type: "text", text: JSON.stringify(res, null, 2) }]
        };
      }
      case "channelhub_send_media": {
        const ch = hub.getChannel(args.channel);
        if (!ch)
          throw new Error(`Channel '${args.channel}' not found or not active.`);
        const res = await ch.sendMedia(args.chatId, {
          type: args.mediaType,
          source: args.url,
          caption: args.caption
        });
        return {
          content: [{ type: "text", text: JSON.stringify(res, null, 2) }]
        };
      }
      case "channelhub_send_sticker": {
        const ch = hub.getChannel(args.channel);
        if (!ch)
          throw new Error(`Channel '${args.channel}' not found or not active.`);
        const res = ch.sendSticker ? await ch.sendSticker(args.chatId, args.sticker, { replyToId: args.replyToId }) : await ch.sendMedia(args.chatId, { type: "sticker", source: args.sticker }, { replyToId: args.replyToId });
        return {
          content: [{ type: "text", text: JSON.stringify(res, null, 2) }]
        };
      }
      case "channelhub_send_gif": {
        const ch = hub.getChannel(args.channel);
        if (!ch)
          throw new Error(`Channel '${args.channel}' not found or not active.`);
        const res = ch.sendGif ? await ch.sendGif(args.chatId, args.gifUrl, args.caption, { replyToId: args.replyToId }) : await ch.sendMedia(args.chatId, { type: "animation", source: args.gifUrl, caption: args.caption }, { replyToId: args.replyToId });
        return {
          content: [{ type: "text", text: JSON.stringify(res, null, 2) }]
        };
      }
      case "channelhub_send_typing": {
        const ch = hub.getChannel(args.channel);
        if (!ch)
          throw new Error(`Channel '${args.channel}' not found.`);
        if (ch.sendTyping) {
          await ch.sendTyping(args.chatId);
          return { content: [{ type: "text", text: JSON.stringify({ success: true }) }] };
        }
        return { content: [{ type: "text", text: JSON.stringify({ supported: false }) }] };
      }
      case "channelhub_edit_message": {
        const ch = hub.getChannel(args.channel);
        if (!ch)
          throw new Error(`Channel '${args.channel}' not found.`);
        if (!ch.editText)
          throw new Error(`Channel '${args.channel}' does not support editing messages.`);
        const res = await ch.editText(args.chatId, args.messageId, args.newText);
        return {
          content: [{ type: "text", text: JSON.stringify(res, null, 2) }]
        };
      }
      case "channelhub_add_reaction": {
        const ch = hub.getChannel(args.channel);
        if (!ch)
          throw new Error(`Channel '${args.channel}' not found.`);
        if (!ch.addReaction)
          throw new Error(`Channel '${args.channel}' does not support reactions.`);
        await ch.addReaction(args.chatId, args.messageId, args.emoji);
        return {
          content: [{ type: "text", text: JSON.stringify({ success: true }) }]
        };
      }
      case "channelhub_broadcast": {
        const targets = args.targets || [];
        const text = args.text || "";
        const results = await Promise.allSettled(targets.map(async (t) => {
          const ch = hub.getChannel(t.channel);
          if (!ch)
            throw new Error(`Channel '${t.channel}' not found.`);
          return await ch.sendText(t.chatId, text);
        }));
        const summary = results.map((r, i) => ({
          target: targets[i],
          status: r.status,
          result: r.status === "fulfilled" ? r.value : undefined,
          error: r.status === "rejected" ? r.reason?.message || String(r.reason) : undefined
        }));
        return {
          content: [{ type: "text", text: JSON.stringify({ broadcast: summary }, null, 2) }]
        };
      }
      case "channelhub_send_email": {
        const ch = hub.getChannel("email");
        if (!ch)
          throw new Error("Email channel adapter not registered in ChannelHub. Register EmailChannelAdapter first.");
        const res = await ch.sendText(args.to, args.text, {
          subject: args.subject,
          html: args.html,
          cc: args.cc,
          bcc: args.bcc,
          replyTo: args.replyTo
        });
        return {
          content: [{ type: "text", text: JSON.stringify(res, null, 2) }]
        };
      }
      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  } catch (err) {
    return {
      isError: true,
      content: [{ type: "text", text: err.message || String(err) }]
    };
  }
}
