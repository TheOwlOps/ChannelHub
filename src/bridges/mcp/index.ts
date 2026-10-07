import type { ChannelHub } from "../../core/hub";
import type { MediaType } from "../../core/types";
import { WebResearch } from "../../core/research";
import { VideoEngine } from "../../core/video";
import { GroupManager } from "../../core/group-manager";

const _groupManager = new GroupManager();

export interface McpToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export function getChannelHubMcpTools(): McpToolDefinition[] {
  return [
    {
      name: "channelhub_list_channels",
      description: "List all active channels registered in ChannelHub (e.g. zalo, telegram, discord, slack, messenger) with their connection state.",
      parameters: {
        type: "object",
        properties: {},
      },
    },
    {
      name: "channelhub_get_status",
      description: "Get detailed connection status for each registered messaging channel.",
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
            description: "Channel name (e.g. 'zalo', 'telegram', 'discord', 'slack', 'messenger')",
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
      name: "channelhub_send_media",
      description: "Send an image, video, audio, or document file to a specific chat.",
      parameters: {
        type: "object",
        required: ["channel", "chatId", "url", "mediaType"],
        properties: {
          channel: {
            type: "string",
            description: "Channel name (e.g. 'zalo', 'telegram', 'discord', 'slack', 'messenger')",
          },
          chatId: {
            type: "string",
            description: "Target chat/thread/channel ID",
          },
          url: {
            type: "string",
            description: "Public URL or local file path to the media",
          },
          mediaType: {
            type: "string",
            enum: ["image", "video", "audio", "file"],
            description: "Media type",
          },
          caption: {
            type: "string",
            description: "Optional caption for the media",
          },
        },
      },
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
            description: "Channel name",
          },
          chatId: {
            type: "string",
            description: "Target chat/thread ID",
          },
        },
      },
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
            description: "Channel name",
          },
          chatId: {
            type: "string",
            description: "Target chat/thread ID",
          },
          messageId: {
            type: "string",
            description: "ID of the message to edit",
          },
          newText: {
            type: "string",
            description: "Updated message content",
          },
        },
      },
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
          emoji: { type: "string" },
        },
      },
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
                chatId: { type: "string" },
              },
            },
          },
          text: {
            type: "string",
            description: "Message body to broadcast",
          },
        },
      },
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
            description: "Recipient email address",
          },
          subject: {
            type: "string",
            description: "Email subject line",
          },
          text: {
            type: "string",
            description: "Plain text body of the email",
          },
          html: {
            type: "string",
            description: "Optional rich HTML body",
          },
          cc: {
            type: "array",
            items: { type: "string" },
            description: "Optional list of CC email addresses",
          },
          bcc: {
            type: "array",
            items: { type: "string" },
            description: "Optional list of BCC email addresses",
          },
          replyTo: {
            type: "string",
            description: "Optional reply-to email address",
          },
        },
      },
    },
    {
      name: "channelhub_github_comment",
      description: "Post a comment on a GitHub issue or PR. chatId format: owner/repo#number",
      parameters: {
        type: "object",
        required: ["chatId", "text"],
        properties: {
          chatId: {
            type: "string",
            description: 'Target in "owner/repo#number" format, e.g. "theowlops/channelhub#42"',
          },
          text: {
            type: "string",
            description: "Comment body (markdown supported)",
          },
        },
      },
    },
    {
      name: "channelhub_github_create_issue",
      description: "Create a new GitHub issue on a repository.",
      parameters: {
        type: "object",
        required: ["repo", "title"],
        properties: {
          repo: {
            type: "string",
            description: 'Repository in "owner/repo" format',
          },
          title: {
            type: "string",
            description: "Issue title",
          },
          body: {
            type: "string",
            description: "Issue body (markdown)",
          },
          labels: {
            type: "array",
            items: { type: "string" },
            description: "Labels to apply",
          },
        },
      },
    },
    {
      name: "channelhub_calendar_quick_add",
      description: "Create a Google Calendar event using natural language, e.g. 'Meeting with Ryan tomorrow at 2pm'.",
      parameters: {
        type: "object",
        required: ["text"],
        properties: {
          calendarId: {
            type: "string",
            description: 'Calendar ID (defaults to "primary")',
          },
          text: {
            type: "string",
            description: "Natural language event description",
          },
        },
      },
    },
    {
      name: "channelhub_web_search",
      description: "Search the web for real-time information (free, 0-config via DuckDuckGo HTML). Can optionally extract deep markdown content for the top results.",
      parameters: {
        type: "object",
        required: ["query"],
        properties: {
          query: { type: "string", description: "Search query" },
          limit: { type: "number", description: "Max results (default: 5)" },
          deepExtract: { type: "boolean", description: "If true, extracts full readable markdown for top 3 results using Jina Reader (takes longer but provides exact context)" },
          provider: { type: "string", description: "duckduckgo (default), tavily, or brave" },
          apiKey: { type: "string", description: "API key for tavily/brave if not using duckduckgo" },
        },
      },
    },
    {
      name: "channelhub_web_extract",
      description: "Extract full readable markdown content from any web URL (bypasses JS rendering and most paywalls via Jina Reader).",
      parameters: {
        type: "object",
        required: ["url"],
        properties: {
          url: { type: "string", description: "Target URL" },
        },
      },
    },
    {
      name: "channelhub_video_create_short",
      description: "Convert any video into TikTok/Shorts (9:16 vertical) format using professional blurred background backdrop, cropping, or padding via local FFmpeg.",
      parameters: {
        type: "object",
        required: ["input", "output"],
        properties: {
          input: { type: "string", description: "Path to input video" },
          output: { type: "string", description: "Path to save vertical video" },
          mode: { type: "string", description: "blur-backdrop (default), crop-center, or fit-pad" },
        },
      },
    },
    {
      name: "channelhub_video_burn_subtitles",
      description: "Burn subtitles (SRT/VTT string or file path) directly onto video frames using local FFmpeg.",
      parameters: {
        type: "object",
        required: ["input", "output", "subtitles"],
        properties: {
          input: { type: "string", description: "Path to input video" },
          output: { type: "string", description: "Path to save output video" },
          subtitles: { type: "string", description: "Subtitles text (SRT/VTT) or absolute path to a .srt file" },
        },
      },
    },
    {
      name: "channelhub_video_add_watermark",
      description: "Add a logo/image watermark to the video.",
      parameters: {
        type: "object",
        required: ["input", "watermark", "output"],
        properties: {
          input: { type: "string", description: "Path to input video" },
          watermark: { type: "string", description: "Path to image logo" },
          output: { type: "string", description: "Path to save output video" },
          position: { type: "string", description: "top-right, top-left, bottom-right, bottom-left, center" },
          opacity: { type: "number", description: "0.1 to 1.0 (default 0.9)" },
        },
      },
    },
    {
      name: "channelhub_messenger_get_threads",
      description: "Scrapes recent conversations and group chats from personal Messenger to retrieve thread IDs and names for the bot.",
      parameters: {
        type: "object",
        properties: {
          limit: { type: "number", description: "Maximum number of threads to fetch (default: 30)" },
        },
      },
    },
    {
      name: "channelhub_messenger_get_history",
      description: "Scrapes recent message history from a specific Messenger thread ID.",
      parameters: {
        type: "object",
        required: ["threadId"],
        properties: {
          threadId: { type: "string", description: "The thread or conversation ID" },
          limit: { type: "number", description: "Max messages to retrieve (default: 20)" },
        },
      },
    },
    {
      name: "channelhub_messenger_get_members",
      description: "Scrapes visible group members or participant information for a specific Messenger group thread.",
      parameters: {
        type: "object",
        required: ["threadId"],
        properties: {
          threadId: { type: "string", description: "The group thread ID" },
        },
      },
    },
    {
      name: "channelhub_messenger_get_user_profile",
      description: "Retrieves user or thread details including name, avatar URL, and ID from Messenger.",
      parameters: {
        type: "object",
        required: ["userId"],
        properties: {
          userId: { type: "string", description: "The Facebook user ID or thread ID" },
        },
      },
    },
    {
      name: "channelhub_group_recap",
      description: "Summarize recent group discussion into key topics, decisions, and action items.",
      parameters: {
        type: "object",
        required: ["messages"],
        properties: {
          messages: {
            type: "array",
            description: "Array of message objects: [{ sender?: string, text: string }]",
          },
        },
      },
    },
    {
      name: "channelhub_group_check_spam",
      description: "Inspect a message for spam, flood, blacklisted links, or repetitive text.",
      parameters: {
        type: "object",
        required: ["senderId", "text"],
        properties: {
          senderId: { type: "string", description: "Unique identifier of the message author" },
          text: { type: "string", description: "Message content" },
          disallowLinks: { type: "boolean", description: "Flag to completely forbid URLs" },
        },
      },
    },
    {
      name: "channelhub_group_welcome_challenge",
      description: "Generate a welcome message and captcha math challenge for a newly joined group member.",
      parameters: {
        type: "object",
        required: ["chatId", "memberId", "memberName"],
        properties: {
          chatId: { type: "string", description: "Group conversation ID" },
          memberId: { type: "string", description: "ID of the joining member" },
          memberName: { type: "string", description: "Display name of the member" },
          groupRules: { type: "string", description: "Optional group rules text" },
        },
      },
    },
    {
      name: "channelhub_group_verify_challenge",
      description: "Verify a member's answer to the gatekeeper captcha challenge.",
      parameters: {
        type: "object",
        required: ["chatId", "memberId", "answer"],
        properties: {
          chatId: { type: "string", description: "Group conversation ID" },
          memberId: { type: "string", description: "ID of the member" },
          answer: { type: "string", description: "Member's answer to the math captcha" },
        },
      },
    },
    {
      name: "channelhub_group_leaderboard",
      description: "Get the most active members leaderboard for a group chat.",
      parameters: {
        type: "object",
        required: ["chatId"],
        properties: {
          chatId: { type: "string", description: "Group conversation ID" },
          limit: { type: "number", description: "Max rankings to return (default: 10)" },
        },
      },
    },
    {
      name: "channelhub_messenger_recall_message",
      description: "Recall / unsend a message sent by the bot on Messenger.",
      parameters: {
        type: "object",
        properties: {
          chatId: { type: "string", description: "Conversation ID or thread ID" },
          messageId: { type: "string", description: "Message ID (for Page Graph API) or omitted (for Personal DOM)" },
        },
      },
    },
    {
      name: "channelhub_group_check_profanity",
      description: "Check if text contains toxic words or profanity.",
      parameters: {
        type: "object",
        required: ["text"],
        properties: {
          text: { type: "string", description: "Message content to inspect" },
          badWords: { type: "array", description: "Optional custom list of prohibited words" },
        },
      },
    },
    {
      name: "channelhub_group_issue_warning",
      description: "Issue a warning strike to a member. Recommends kick if reaching strike limit (default: 3).",
      parameters: {
        type: "object",
        required: ["chatId", "userId", "reason"],
        properties: {
          chatId: { type: "string", description: "Group conversation ID" },
          userId: { type: "string", description: "ID of the offending member" },
          reason: { type: "string", description: "Reason for the warning" },
          maxStrikes: { type: "number", description: "Maximum strikes before kick (default: 3)" },
        },
      },
    },
    {
      name: "channelhub_group_create_poll",
      description: "Create an interactive voting poll for the group.",
      parameters: {
        type: "object",
        required: ["chatId", "creatorId", "question", "options"],
        properties: {
          chatId: { type: "string", description: "Group conversation ID" },
          creatorId: { type: "string", description: "User ID creating the poll" },
          question: { type: "string", description: "Poll question" },
          options: { type: "array", description: "Array of choice options (string[])" },
        },
      },
    },
    {
      name: "channelhub_group_cast_vote",
      description: "Cast a vote in an active group poll.",
      parameters: {
        type: "object",
        required: ["pollId", "voterId", "optionIndex"],
        properties: {
          pollId: { type: "string", description: "Poll ID" },
          voterId: { type: "string", description: "ID of the voter" },
          optionIndex: { type: "number", description: "0-based index of chosen option" },
        },
      },
    },
    {
      name: "channelhub_group_get_poll_results",
      description: "Get real-time vote results and percentages for a group poll.",
      parameters: {
        type: "object",
        required: ["pollId"],
        properties: {
          pollId: { type: "string", description: "Poll ID" },
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

      case "channelhub_get_status": {
        const channels = hub.listChannels();
        const statusMap: Record<string, { connected: boolean }> = {};
        for (const name of channels) {
          const ch = hub.getChannel(name);
          statusMap[name] = { connected: ch ? ch.isConnected() : false };
        }
        return {
          content: [{ type: "text", text: JSON.stringify({ status: statusMap }, null, 2) }],
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

      case "channelhub_send_media": {
        const ch = hub.getChannel(args.channel);
        if (!ch) throw new Error(`Channel '${args.channel}' not found or not active.`);
        const res = await ch.sendMedia(args.chatId, {
          type: args.mediaType as MediaType,
          source: args.url,
          caption: args.caption,
        });
        return {
          content: [{ type: "text", text: JSON.stringify(res, null, 2) }],
        };
      }

      case "channelhub_send_sticker": {
        const ch = hub.getChannel(args.channel);
        if (!ch) throw new Error(`Channel '${args.channel}' not found or not active.`);
        const res = ch.sendSticker
          ? await ch.sendSticker(args.chatId, args.sticker, { replyToId: args.replyToId })
          : await ch.sendMedia(args.chatId, { type: "sticker", source: args.sticker }, { replyToId: args.replyToId });
        return {
          content: [{ type: "text", text: JSON.stringify(res, null, 2) }],
        };
      }

      case "channelhub_send_gif": {
        const ch = hub.getChannel(args.channel);
        if (!ch) throw new Error(`Channel '${args.channel}' not found or not active.`);
        const res = ch.sendGif
          ? await ch.sendGif(args.chatId, args.gifUrl, args.caption, { replyToId: args.replyToId })
          : await ch.sendMedia(args.chatId, { type: "animation", source: args.gifUrl, caption: args.caption }, { replyToId: args.replyToId });
        return {
          content: [{ type: "text", text: JSON.stringify(res, null, 2) }],
        };
      }

      case "channelhub_send_typing": {
        const ch = hub.getChannel(args.channel);
        if (!ch) throw new Error(`Channel '${args.channel}' not found.`);
        if (ch.sendTyping) {
          await ch.sendTyping(args.chatId);
          return { content: [{ type: "text", text: JSON.stringify({ success: true }) }] };
        }
        return { content: [{ type: "text", text: JSON.stringify({ supported: false }) }] };
      }

      case "channelhub_edit_message": {
        const ch = hub.getChannel(args.channel);
        if (!ch) throw new Error(`Channel '${args.channel}' not found.`);
        if (!ch.editText) throw new Error(`Channel '${args.channel}' does not support editing messages.`);
        const res = await ch.editText(args.chatId, args.messageId, args.newText);
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

      case "channelhub_broadcast": {
        const targets: Array<{ channel: string; chatId: string }> = args.targets || [];
        const text: string = args.text || "";
        const results = await Promise.allSettled(
          targets.map(async (t) => {
            const ch = hub.getChannel(t.channel);
            if (!ch) throw new Error(`Channel '${t.channel}' not found.`);
            return await ch.sendText(t.chatId, text);
          })
        );

        const summary = results.map((r, i) => ({
          target: targets[i],
          status: r.status,
          result: r.status === "fulfilled" ? r.value : undefined,
          error: r.status === "rejected" ? r.reason?.message || String(r.reason) : undefined,
        }));

        return {
          content: [{ type: "text", text: JSON.stringify({ broadcast: summary }, null, 2) }],
        };
      }

      case "channelhub_send_email": {
        const ch = hub.getChannel("email");
        if (!ch) throw new Error("Email channel adapter not registered in ChannelHub. Register EmailChannelAdapter first.");
        const res = await ch.sendText(args.to, args.text, {
          subject: args.subject,
          html: args.html,
          cc: args.cc,
          bcc: args.bcc,
          replyTo: args.replyTo,
        } as any);
        return {
          content: [{ type: "text", text: JSON.stringify(res, null, 2) }],
        };
      }

      case "channelhub_github_comment": {
        const ch = hub.getChannel("github");
        if (!ch) throw new Error("GitHub channel adapter not registered.");
        const res = await ch.sendText(args.chatId, args.text);
        return {
          content: [{ type: "text", text: JSON.stringify(res, null, 2) }],
        };
      }

      case "channelhub_github_create_issue": {
        const ch = hub.getChannel("github") as any; // Cast for custom method
        if (!ch || !ch.createIssue) throw new Error("GitHub channel adapter not registered.");
        const res = await ch.createIssue(args.repo, args.title, args.body, args.labels);
        return {
          content: [{ type: "text", text: JSON.stringify(res, null, 2) }],
        };
      }

      case "channelhub_calendar_quick_add": {
        const ch = hub.getChannel("calendar");
        if (!ch) throw new Error("Calendar channel adapter not registered.");
        const res = await ch.sendText(args.calendarId || "primary", args.text);
        return {
          content: [{ type: "text", text: JSON.stringify(res, null, 2) }],
        };
      }

      case "channelhub_web_search": {
        const res = await WebResearch.search(args.query, {
          limit: args.limit,
          deepExtract: args.deepExtract,
          provider: args.provider,
          apiKey: args.apiKey,
        });
        return {
          content: [{ type: "text", text: JSON.stringify(res, null, 2) }],
        };
      }

      case "channelhub_web_extract": {
        const res = await WebResearch.extract(args.url);
        return {
          content: [{ type: "text", text: res.content }],
        };
      }

      case "channelhub_video_create_short": {
        const res = await VideoEngine.createShort({
          input: args.input,
          output: args.output,
          mode: args.mode,
        });
        return {
          content: [{ type: "text", text: JSON.stringify(res, null, 2) }],
        };
      }

      case "channelhub_video_burn_subtitles": {
        const res = await VideoEngine.burnSubtitles({
          input: args.input,
          output: args.output,
          subtitles: args.subtitles,
        });
        return {
          content: [{ type: "text", text: JSON.stringify(res, null, 2) }],
        };
      }

      case "channelhub_video_add_watermark": {
        const res = await VideoEngine.addWatermark({
          input: args.input,
          watermark: args.watermark,
          output: args.output,
          position: args.position,
          opacity: args.opacity,
        });
        return {
          content: [{ type: "text", text: JSON.stringify(res, null, 2) }],
        };
      }

      case "channelhub_messenger_get_threads": {
        const adapter = hub.getChannel("messenger") as any;
        if (!adapter || typeof adapter.getThreads !== "function") {
          throw new Error("Messenger personal adapter is not registered or does not support getThreads");
        }
        const threads = await adapter.getThreads(args.limit || 30);
        return {
          content: [{ type: "text", text: JSON.stringify(threads, null, 2) }],
        };
      }

      case "channelhub_messenger_get_history": {
        const adapter = hub.getChannel("messenger") as any;
        if (!adapter || typeof adapter.getThreadHistory !== "function") {
          throw new Error("Messenger personal adapter is not registered or does not support getThreadHistory");
        }
        const history = await adapter.getThreadHistory(args.threadId, args.limit || 20);
        return {
          content: [{ type: "text", text: JSON.stringify(history, null, 2) }],
        };
      }

      case "channelhub_messenger_get_members": {
        const adapter = hub.getChannel("messenger") as any;
        if (!adapter || typeof adapter.getGroupMembers !== "function") {
          throw new Error("Messenger personal adapter is not registered or does not support getGroupMembers");
        }
        const members = await adapter.getGroupMembers(args.threadId);
        return {
          content: [{ type: "text", text: JSON.stringify(members, null, 2) }],
        };
      }

      case "channelhub_messenger_get_user_profile": {
        const adapter = hub.getChannel("messenger") as any;
        if (!adapter || typeof adapter.getUserProfile !== "function") {
          throw new Error("Messenger personal adapter is not registered or does not support getUserProfile");
        }
        const profile = await adapter.getUserProfile(args.userId);
        return {
          content: [{ type: "text", text: JSON.stringify(profile, null, 2) }],
        };
      }

      case "channelhub_group_recap": {
        const recap = _groupManager.generateRecap(args.messages || []);
        return {
          content: [{ type: "text", text: JSON.stringify(recap, null, 2) }],
        };
      }

      case "channelhub_group_check_spam": {
        const result = _groupManager.checkSpam(args.senderId, args.text, {
          disallowLinks: args.disallowLinks,
        });
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      case "channelhub_group_welcome_challenge": {
        const challenge = _groupManager.registerNewMember(
          args.chatId,
          { id: args.memberId, name: args.memberName },
          args.groupRules
        );
        return {
          content: [{ type: "text", text: JSON.stringify(challenge, null, 2) }],
        };
      }

      case "channelhub_group_verify_challenge": {
        const valid = _groupManager.verifyMember(args.chatId, args.memberId, args.answer);
        return {
          content: [{ type: "text", text: JSON.stringify({ success: valid }, null, 2) }],
        };
      }

      case "channelhub_group_leaderboard": {
        const leaderboard = _groupManager.getLeaderboard(args.chatId, args.limit || 10);
        return {
          content: [{ type: "text", text: JSON.stringify(leaderboard, null, 2) }],
        };
      }

      case "channelhub_messenger_recall_message": {
        const adapter = hub.getChannel("messenger") as any;
        if (!adapter || typeof adapter.recallMessage !== "function") {
          throw new Error("Messenger adapter is not registered or does not support recallMessage");
        }
        const success = await adapter.recallMessage(args.chatId, args.messageId);
        return {
          content: [{ type: "text", text: JSON.stringify({ success }, null, 2) }],
        };
      }

      case "channelhub_group_check_profanity": {
        const res = _groupManager.checkProfanity(args.text, args.badWords);
        return {
          content: [{ type: "text", text: JSON.stringify(res, null, 2) }],
        };
      }

      case "channelhub_group_issue_warning": {
        const res = _groupManager.issueWarning(args.chatId, args.userId, args.reason, args.maxStrikes);
        return {
          content: [{ type: "text", text: JSON.stringify(res, null, 2) }],
        };
      }

      case "channelhub_group_create_poll": {
        const poll = _groupManager.createPoll(args.chatId, args.creatorId, args.question, args.options);
        return {
          content: [{ type: "text", text: JSON.stringify(poll, null, 2) }],
        };
      }

      case "channelhub_group_cast_vote": {
        const success = _groupManager.castVote(args.pollId, args.voterId, args.optionIndex);
        return {
          content: [{ type: "text", text: JSON.stringify({ success }, null, 2) }],
        };
      }

      case "channelhub_group_get_poll_results": {
        const results = _groupManager.getPollResults(args.pollId);
        return {
          content: [{ type: "text", text: JSON.stringify(results, null, 2) }],
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
