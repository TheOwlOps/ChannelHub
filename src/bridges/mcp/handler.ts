import type { ChannelHub } from "../../core/engine/hub";
import type { MediaType } from "../../core/contracts/types";
import { WebResearch } from "../../core/insights/research";
import { VideoEngine } from "../../core/media/video";
import { GroupManager } from "../../core/identity/group-manager";

const _groupManager = new GroupManager();

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

      case "channelhub_broadcast": {
        const report = await hub.broadcast(args.targets || [], { text: args.text });
        return {
          content: [{ type: "text", text: JSON.stringify(report, null, 2) }],
        };
      }

      case "channelhub_schedule_message": {
        const job = hub.schedule({
          channel: args.channel,
          chatId: args.chatId,
          text: args.text,
          delayMs: args.delayMs,
          at: args.at,
          everyMs: args.everyMs,
        });
        return {
          content: [{ type: "text", text: JSON.stringify(job, null, 2) }],
        };
      }

      case "channelhub_list_scheduled": {
        return {
          content: [{ type: "text", text: JSON.stringify(hub.listScheduled(), null, 2) }],
        };
      }

      case "channelhub_cancel_scheduled": {
        const cancelled = hub.cancelScheduled(args.id);
        return {
          content: [{ type: "text", text: JSON.stringify({ cancelled }, null, 2) }],
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
