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

// src/core/research.ts
class WebResearch {
  static async search(query, options = {}) {
    const { limit = 5, provider = "duckduckgo", apiKey, deepExtract = false, signal } = options;
    let results = [];
    if (provider === "tavily") {
      results = await this.searchTavily(query, apiKey, limit, signal);
    } else if (provider === "brave") {
      results = await this.searchBrave(query, apiKey, limit, signal);
    } else {
      results = await this.searchDuckDuckGo(query, limit, signal);
    }
    if (deepExtract && results.length > 0) {
      const topToExtract = results.slice(0, 3);
      await Promise.allSettled(topToExtract.map(async (r) => {
        try {
          const page = await this.extract(r.url, signal);
          r.content = page.content.slice(0, 5000);
        } catch {}
      }));
    }
    return results;
  }
  static async extract(url, signal) {
    try {
      const res = await fetch(`https://r.jina.ai/${encodeURI(url)}`, {
        headers: {
          Accept: "text/plain",
          "User-Agent": "ChannelHub-Agent/1.0"
        },
        signal
      });
      if (res.ok) {
        const text = await res.text();
        return {
          url,
          content: text.trim()
        };
      }
    } catch {}
    const rawRes = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
      },
      signal
    });
    const html = await rawRes.text();
    const clean = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "").replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    return {
      url,
      content: clean.slice(0, 1e4)
    };
  }
  static async searchDuckDuckGo(query, limit, signal) {
    const res = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)"
      },
      signal
    });
    if (!res.ok)
      throw new Error(`DuckDuckGo returned ${res.status}`);
    const html = await res.text();
    const results = [];
    const blockRegex = /<div class="result results_links results_links_deep web-result[\s\S]*?<a class="result__snippet[^>]*>([\s\S]*?)<\/a>/g;
    let match;
    while ((match = blockRegex.exec(html)) !== null && results.length < limit) {
      const block = match[0];
      const titleMatch = block.match(/<a rel="nofollow" class="result__a" href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/);
      const snippetMatch = block.match(/<a class="result__snippet[^>]*>([\s\S]*?)<\/a>/);
      if (titleMatch) {
        let rawUrl = titleMatch[1];
        if (rawUrl.includes("uddg=")) {
          const extracted = rawUrl.split("uddg=")[1]?.split("&")[0];
          if (extracted)
            rawUrl = decodeURIComponent(extracted);
        }
        const title = titleMatch[2].replace(/<[^>]+>/g, "").trim();
        const snippet = snippetMatch ? snippetMatch[1].replace(/<[^>]+>/g, "").trim() : "";
        if (rawUrl.startsWith("http")) {
          results.push({
            title,
            url: rawUrl,
            snippet
          });
        }
      }
    }
    return results;
  }
  static async searchTavily(query, apiKey, limit = 5, signal) {
    if (!apiKey)
      throw new Error("Tavily provider requires apiKey in options");
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        max_results: limit
      }),
      signal
    });
    if (!res.ok)
      throw new Error(`Tavily error: ${res.status}`);
    const data = await res.json();
    return (data.results || []).map((r) => ({
      title: r.title,
      url: r.url,
      snippet: r.content
    }));
  }
  static async searchBrave(query, apiKey, limit = 5, signal) {
    if (!apiKey)
      throw new Error("Brave provider requires apiKey in options");
    const res = await fetch(`https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${limit}`, {
      headers: {
        Accept: "application/json",
        "X-Subscription-Token": apiKey
      },
      signal
    });
    if (!res.ok)
      throw new Error(`Brave search error: ${res.status}`);
    const data = await res.json();
    return (data.web?.results || []).map((r) => ({
      title: r.title,
      url: r.url,
      snippet: r.description
    }));
  }
}

// src/core/video.ts
var import_node_child_process = require("node:child_process");
var import_node_fs = require("node:fs");
var import_node_path = require("node:path");
var import_node_os = require("node:os");

class VideoEngine {
  static async createShort(options) {
    const {
      input,
      output,
      mode = "blur-backdrop",
      targetWidth = 1080,
      targetHeight = 1920,
      ffmpegPath = "ffmpeg"
    } = options;
    let filterGraph = "";
    if (mode === "blur-backdrop") {
      filterGraph = [
        `[0:v]scale=${targetWidth}:${targetHeight}:force_original_aspect_ratio=increase,crop=${targetWidth}:${targetHeight},boxblur=20:5[bg]`,
        `[0:v]scale=${targetWidth}:${targetHeight}:force_original_aspect_ratio=decrease[fg]`,
        `[bg][fg]overlay=(W-w)/2:(H-h)/2[outv]`
      ].join(";");
    } else if (mode === "crop-center") {
      filterGraph = `[0:v]scale=${targetWidth}:${targetHeight}:force_original_aspect_ratio=increase,crop=${targetWidth}:${targetHeight}[outv]`;
    } else {
      filterGraph = `[0:v]scale=${targetWidth}:${targetHeight}:force_original_aspect_ratio=decrease,pad=${targetWidth}:${targetHeight}:(ow-iw)/2:(oh-ih)/2:black[outv]`;
    }
    const args = [
      "-y",
      "-i",
      input,
      "-filter_complex",
      filterGraph,
      "-map",
      "[outv]",
      "-map",
      "0:a?",
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-crf",
      "22",
      "-c:a",
      "aac",
      "-b:a",
      "128k",
      output
    ];
    await this.runProcess(ffmpegPath, args);
    return { output, command: [ffmpegPath, ...args] };
  }
  static async burnSubtitles(options) {
    const { input, output, subtitles, style = {}, ffmpegPath = "ffmpeg" } = options;
    let srtPath = subtitles;
    let tempCreated = false;
    if (!subtitles.endsWith(".srt") && !subtitles.endsWith(".vtt")) {
      srtPath = import_node_path.join(import_node_os.tmpdir(), `sub_${Date.now()}_${Math.random().toString(36).slice(2)}.srt`);
      await import_node_fs.promises.writeFile(srtPath, subtitles, "utf8");
      tempCreated = true;
    }
    try {
      const fontSize = style.fontSize || 24;
      const fontColor = style.fontColor || "&H00FFFFFF";
      const bold = style.bold ? 1 : 0;
      const safeSrtPath = srtPath.replace(/\\/g, "/").replace(/:/g, "\\:");
      const filter = `subtitles='${safeSrtPath}':force_style='FontSize=${fontSize},PrimaryColour=${fontColor},Bold=${bold}'`;
      const args = [
        "-y",
        "-i",
        input,
        "-vf",
        filter,
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-crf",
        "22",
        "-c:a",
        "copy",
        output
      ];
      await this.runProcess(ffmpegPath, args);
      return { output, command: [ffmpegPath, ...args] };
    } finally {
      if (tempCreated) {
        await import_node_fs.promises.unlink(srtPath).catch(() => {});
      }
    }
  }
  static async addWatermark(options) {
    const {
      input,
      watermark,
      output,
      position = "top-right",
      opacity = 0.9,
      scale = 0.15,
      ffmpegPath = "ffmpeg"
    } = options;
    let posExpr = "W-w-20:20";
    if (position === "top-left")
      posExpr = "20:20";
    else if (position === "bottom-left")
      posExpr = "20:H-h-20";
    else if (position === "bottom-right")
      posExpr = "W-w-20:H-h-20";
    else if (position === "center")
      posExpr = "(W-w)/2:(H-h)/2";
    const filterGraph = [
      `[1:v]scale=iw*${scale}:-1,format=rgba,colorchannelmixer=aa=${opacity}[wm]`,
      `[0:v][wm]overlay=${posExpr}[outv]`
    ].join(";");
    const args = [
      "-y",
      "-i",
      input,
      "-i",
      watermark,
      "-filter_complex",
      filterGraph,
      "-map",
      "[outv]",
      "-map",
      "0:a?",
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-c:a",
      "copy",
      output
    ];
    await this.runProcess(ffmpegPath, args);
    return { output, command: [ffmpegPath, ...args] };
  }
  static async extractThumbnail(options) {
    const { input, output, timestampSec = 1, width, ffmpegPath = "ffmpeg" } = options;
    const args = [
      "-y",
      "-ss",
      String(timestampSec),
      "-i",
      input,
      "-vframes",
      "1"
    ];
    if (width) {
      args.push("-vf", `scale=${width}:-1`);
    }
    args.push(output);
    await this.runProcess(ffmpegPath, args);
    return { output, command: [ffmpegPath, ...args] };
  }
  static async generateMemeGif(options) {
    const {
      input,
      output,
      startSec = 0,
      durationSec = 5,
      fps = 15,
      width = 480,
      topText,
      bottomText,
      ffmpegPath = "ffmpeg"
    } = options;
    const filterParts = [
      `fps=${fps}`,
      `scale=${width}:-1:flags=lanczos`
    ];
    if (topText) {
      filterParts.push(`drawtext=text='${topText.replace(/'/g, "")}':x=(w-text_w)/2:y=20:fontsize=24:fontcolor=white:borderw=2:bordercolor=black`);
    }
    if (bottomText) {
      filterParts.push(`drawtext=text='${bottomText.replace(/'/g, "")}':x=(w-text_w)/2:y=h-text_h-20:fontsize=24:fontcolor=white:borderw=2:bordercolor=black`);
    }
    const vf = `${filterParts.join(",")},split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse`;
    const args = [
      "-y",
      "-ss",
      String(startSec),
      "-t",
      String(durationSec),
      "-i",
      input,
      "-vf",
      vf,
      output
    ];
    await this.runProcess(ffmpegPath, args);
    return { output, command: [ffmpegPath, ...args] };
  }
  static async renderShotstack(options) {
    const {
      timeline,
      apiKey,
      env = "stage",
      outputFormat = "mp4",
      aspectRatio = "9:16",
      signal
    } = options;
    const baseUrl = env === "v1" ? "https://api.shotstack.io/edit/v1" : "https://api.shotstack.io/edit/stage";
    const payload = {
      timeline,
      output: {
        format: outputFormat,
        aspectRatio,
        fps: 30
      }
    };
    const res = await fetch(`${baseUrl}/render`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey
      },
      body: JSON.stringify(payload),
      signal
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Shotstack render error (${res.status}): ${errText}`);
    }
    const data = await res.json();
    return {
      renderId: data.response?.id,
      status: data.response?.status || "queued",
      url: data.response?.url
    };
  }
  static runProcess(cmd, args) {
    return new Promise((resolve, reject) => {
      const child = import_node_child_process.spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });
      let stderr = "";
      child.stderr?.on("data", (chunk) => {
        stderr += chunk.toString();
      });
      child.on("error", (err) => {
        reject(new Error(`Failed to execute ${cmd}: ${err.message}`));
      });
      child.on("close", (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`${cmd} exited with code ${code}. Details:
${stderr.slice(-500)}`));
        }
      });
    });
  }
}

// src/core/group-manager.ts
class GroupManager {
  userMessageHistory = new Map;
  reminders = new Map;
  pendingChallenges = new Map;
  chatActivities = new Map;
  warnings = new Map;
  polls = new Map;
  generateRecap(messages) {
    const participants = Array.from(new Set(messages.map((m) => m.sender || m.senderId || "Unknown")));
    const keyTopics = [];
    const decisions = [];
    const actionItems = [];
    for (const msg of messages) {
      const text = msg.text.trim();
      const lower = text.toLowerCase();
      if (lower.startsWith("chốt:") || lower.startsWith("quyết định:") || lower.includes("thống nhất") || lower.startsWith("agree:") || lower.startsWith("decided:")) {
        decisions.push(text);
      }
      if (lower.includes("cần làm") || lower.includes("todo:") || lower.includes("giao cho") || lower.includes("hạn chót") || lower.startsWith("task:")) {
        actionItems.push({
          task: text,
          assignee: msg.sender
        });
      }
      if (text.length > 15 && !keyTopics.includes(text) && keyTopics.length < 5) {
        if (!decisions.includes(text) && !actionItems.some((a) => a.task === text)) {
          keyTopics.push(text.length > 80 ? text.slice(0, 77) + "..." : text);
        }
      }
    }
    const summaryLines = [
      `\uD83D\uDCCA **Tóm tắt cuộc thảo luận (${messages.length} tin nhắn)**:`,
      `\uD83D\uDC65 **Thành viên tham gia:** ${participants.join(", ") || "Không có"}`,
      `\uD83D\uDCCC **Chủ đề chính:** ${keyTopics.length > 0 ? keyTopics.join(" | ") : "Thảo luận thông thường"}`,
      `✅ **Quyết định đã chốt:** ${decisions.length > 0 ? decisions.join("; ") : "Không có"}`,
      `\uD83D\uDCDD **Đầu việc (Action items):** ${actionItems.length > 0 ? actionItems.map((a) => a.task).join("; ") : "Không có"}`
    ];
    return {
      totalMessages: messages.length,
      participants,
      keyTopics,
      decisions,
      actionItems,
      summaryText: summaryLines.join(`
`)
    };
  }
  checkSpam(senderId, text, options = {}) {
    const now = Date.now();
    const windowMs = options.windowMs || 1e4;
    const maxMessages = options.maxMessagesPerWindow || 5;
    const blacklisted = options.blacklistedDomains || ["t.me/", "bit.ly/", "cutt.ly/", "tini.vn/"];
    const urlMatches = text.match(/https?:\/\/[^\s]+/gi) || [];
    if (options.disallowLinks && urlMatches.length > 0) {
      return {
        isSpam: true,
        reason: "links_disabled",
        recommendedAction: "delete",
        messageCountInWindow: 1
      };
    }
    for (const url of urlMatches) {
      if (blacklisted.some((bad) => url.toLowerCase().includes(bad.toLowerCase()))) {
        return {
          isSpam: true,
          reason: "blacklisted_link",
          recommendedAction: "kick",
          messageCountInWindow: 1
        };
      }
    }
    const userHistory = this.userMessageHistory.get(senderId) || [];
    const validHistory = userHistory.filter((item) => now - item.timestamp < windowMs);
    const identicalCount = validHistory.filter((item) => item.text === text).length;
    if (identicalCount >= 2) {
      return {
        isSpam: true,
        reason: "repetitive_text",
        recommendedAction: "warn",
        messageCountInWindow: validHistory.length + 1
      };
    }
    validHistory.push({ text, timestamp: now });
    this.userMessageHistory.set(senderId, validHistory);
    if (validHistory.length >= maxMessages) {
      return {
        isSpam: true,
        reason: "flood",
        recommendedAction: "warn",
        messageCountInWindow: validHistory.length
      };
    }
    return {
      isSpam: false,
      recommendedAction: "allow",
      messageCountInWindow: validHistory.length
    };
  }
  registerNewMember(chatId, member, groupRules = "Vui lòng tôn trọng thành viên và không gửi link quảng cáo.", timeoutSeconds = 60) {
    const a = Math.floor(Math.random() * 8) + 1;
    const b = Math.floor(Math.random() * 8) + 1;
    const answer = String(a + b);
    const expiresAt = Date.now() + timeoutSeconds * 1000;
    const challengeKey = `${chatId}:${member.id}`;
    const challenge = {
      memberId: member.id,
      memberName: member.name,
      welcomeMessage: `\uD83C\uDF89 Chào mừng **${member.name}** đã tham gia nhóm!
\uD83D\uDCDC Nội quy: ${groupRules}
\uD83D\uDD12 Để tránh tài khoản clone, bạn hãy trả lời câu hỏi bảo mật trong vòng ${timeoutSeconds}s:`,
      question: `Bạn hãy tính: ${a} + ${b} = ?`,
      expectedAnswer: answer,
      expiresAt
    };
    this.pendingChallenges.set(challengeKey, challenge);
    return challenge;
  }
  verifyMember(chatId, memberId, answer) {
    const challengeKey = `${chatId}:${memberId}`;
    const challenge = this.pendingChallenges.get(challengeKey);
    if (!challenge)
      return true;
    if (Date.now() > challenge.expiresAt) {
      this.pendingChallenges.delete(challengeKey);
      return false;
    }
    if (answer.trim() === challenge.expectedAnswer) {
      this.pendingChallenges.delete(challengeKey);
      return true;
    }
    return false;
  }
  scheduleReminder(chatId, text, triggerAt, recurringIntervalMs) {
    const id = `remind_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const timestamp = typeof triggerAt === "number" ? triggerAt : triggerAt.getTime();
    const reminder = {
      id,
      chatId,
      text,
      triggerAt: timestamp,
      recurringIntervalMs,
      executed: false
    };
    this.reminders.set(id, reminder);
    return reminder;
  }
  pollDueReminders() {
    const now = Date.now();
    const dueList = [];
    for (const [id, r] of this.reminders.entries()) {
      if (!r.executed && r.triggerAt <= now) {
        dueList.push({ ...r });
        if (r.recurringIntervalMs && r.recurringIntervalMs > 0) {
          r.triggerAt = now + r.recurringIntervalMs;
        } else {
          r.executed = true;
          this.reminders.delete(id);
        }
      }
    }
    return dueList;
  }
  recordActivity(chatId, senderId, senderName = senderId, timestamp = Date.now()) {
    let groupMap = this.chatActivities.get(chatId);
    if (!groupMap) {
      groupMap = new Map;
      this.chatActivities.set(chatId, groupMap);
    }
    const current = groupMap.get(senderId) || {
      userId: senderId,
      name: senderName,
      messageCount: 0,
      lastActiveAt: timestamp
    };
    current.messageCount += 1;
    current.name = senderName;
    current.lastActiveAt = timestamp;
    groupMap.set(senderId, current);
  }
  getLeaderboard(chatId, limit = 10) {
    const groupMap = this.chatActivities.get(chatId);
    if (!groupMap)
      return [];
    return Array.from(groupMap.values()).sort((a, b) => b.messageCount - a.messageCount).slice(0, limit);
  }
  getInactiveMembers(chatId, cutoffDays = 7) {
    const groupMap = this.chatActivities.get(chatId);
    if (!groupMap)
      return [];
    const threshold = Date.now() - cutoffDays * 24 * 60 * 60 * 1000;
    return Array.from(groupMap.values()).filter((m) => m.lastActiveAt < threshold);
  }
  checkProfanity(text, badWords = ["dm", "vcl", "fuck", "bitch", "scam", "lua dao"]) {
    const lower = text.toLowerCase();
    const flagged = [];
    for (const w of badWords) {
      const regex = new RegExp(`(^|\\s|[^a-zA-Z0-9_])${w}([^a-zA-Z0-9_]|\\s|$)`, "i");
      if (regex.test(lower)) {
        flagged.push(w);
      }
    }
    return {
      isClean: flagged.length === 0,
      flaggedWords: flagged
    };
  }
  issueWarning(chatId, userId, reason, maxStrikes = 3) {
    let chatMap = this.warnings.get(chatId);
    if (!chatMap) {
      chatMap = new Map;
      this.warnings.set(chatId, chatMap);
    }
    const userWarns = chatMap.get(userId) || [];
    userWarns.push({ reason, timestamp: Date.now() });
    chatMap.set(userId, userWarns);
    return {
      strikes: userWarns.length,
      action: userWarns.length >= maxStrikes ? "kick" : "warn"
    };
  }
  getWarnings(chatId, userId) {
    return this.warnings.get(chatId)?.get(userId) || [];
  }
  clearWarnings(chatId, userId) {
    this.warnings.get(chatId)?.delete(userId);
  }
  createPoll(chatId, creatorId, question, options) {
    const id = `poll_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const poll = {
      id,
      chatId,
      creatorId,
      question,
      options,
      votes: new Map,
      active: true
    };
    this.polls.set(id, poll);
    return poll;
  }
  castVote(pollId, voterId, optionIndex) {
    const poll = this.polls.get(pollId);
    if (!poll || !poll.active || optionIndex < 0 || optionIndex >= poll.options.length) {
      return false;
    }
    poll.votes.set(voterId, optionIndex);
    return true;
  }
  getPollResults(pollId) {
    const poll = this.polls.get(pollId);
    if (!poll)
      return null;
    const counts = new Array(poll.options.length).fill(0);
    for (const optIdx of poll.votes.values()) {
      counts[optIdx]++;
    }
    const total = poll.votes.size;
    const results = poll.options.map((option, idx) => ({
      option,
      votes: counts[idx],
      percentage: total > 0 ? Math.round(counts[idx] / total * 100) : 0
    }));
    return {
      question: poll.question,
      totalVotes: total,
      active: poll.active,
      results
    };
  }
  closePoll(pollId, creatorId) {
    const poll = this.polls.get(pollId);
    if (!poll)
      return false;
    if (creatorId && poll.creatorId !== creatorId)
      return false;
    poll.active = false;
    return true;
  }
}

// src/bridges/mcp/index.ts
var _groupManager = new GroupManager;
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
            description: 'Target in "owner/repo#number" format, e.g. "theowlops/channelhub#42"'
          },
          text: {
            type: "string",
            description: "Comment body (markdown supported)"
          }
        }
      }
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
            description: 'Repository in "owner/repo" format'
          },
          title: {
            type: "string",
            description: "Issue title"
          },
          body: {
            type: "string",
            description: "Issue body (markdown)"
          },
          labels: {
            type: "array",
            items: { type: "string" },
            description: "Labels to apply"
          }
        }
      }
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
            description: 'Calendar ID (defaults to "primary")'
          },
          text: {
            type: "string",
            description: "Natural language event description"
          }
        }
      }
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
          apiKey: { type: "string", description: "API key for tavily/brave if not using duckduckgo" }
        }
      }
    },
    {
      name: "channelhub_web_extract",
      description: "Extract full readable markdown content from any web URL (bypasses JS rendering and most paywalls via Jina Reader).",
      parameters: {
        type: "object",
        required: ["url"],
        properties: {
          url: { type: "string", description: "Target URL" }
        }
      }
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
          mode: { type: "string", description: "blur-backdrop (default), crop-center, or fit-pad" }
        }
      }
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
          subtitles: { type: "string", description: "Subtitles text (SRT/VTT) or absolute path to a .srt file" }
        }
      }
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
          opacity: { type: "number", description: "0.1 to 1.0 (default 0.9)" }
        }
      }
    },
    {
      name: "channelhub_messenger_get_threads",
      description: "Scrapes recent conversations and group chats from personal Messenger to retrieve thread IDs and names for the bot.",
      parameters: {
        type: "object",
        properties: {
          limit: { type: "number", description: "Maximum number of threads to fetch (default: 30)" }
        }
      }
    },
    {
      name: "channelhub_messenger_get_history",
      description: "Scrapes recent message history from a specific Messenger thread ID.",
      parameters: {
        type: "object",
        required: ["threadId"],
        properties: {
          threadId: { type: "string", description: "The thread or conversation ID" },
          limit: { type: "number", description: "Max messages to retrieve (default: 20)" }
        }
      }
    },
    {
      name: "channelhub_messenger_get_members",
      description: "Scrapes visible group members or participant information for a specific Messenger group thread.",
      parameters: {
        type: "object",
        required: ["threadId"],
        properties: {
          threadId: { type: "string", description: "The group thread ID" }
        }
      }
    },
    {
      name: "channelhub_messenger_get_user_profile",
      description: "Retrieves user or thread details including name, avatar URL, and ID from Messenger.",
      parameters: {
        type: "object",
        required: ["userId"],
        properties: {
          userId: { type: "string", description: "The Facebook user ID or thread ID" }
        }
      }
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
            description: "Array of message objects: [{ sender?: string, text: string }]"
          }
        }
      }
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
          disallowLinks: { type: "boolean", description: "Flag to completely forbid URLs" }
        }
      }
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
          groupRules: { type: "string", description: "Optional group rules text" }
        }
      }
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
          answer: { type: "string", description: "Member's answer to the math captcha" }
        }
      }
    },
    {
      name: "channelhub_group_leaderboard",
      description: "Get the most active members leaderboard for a group chat.",
      parameters: {
        type: "object",
        required: ["chatId"],
        properties: {
          chatId: { type: "string", description: "Group conversation ID" },
          limit: { type: "number", description: "Max rankings to return (default: 10)" }
        }
      }
    },
    {
      name: "channelhub_messenger_recall_message",
      description: "Recall / unsend a message sent by the bot on Messenger.",
      parameters: {
        type: "object",
        properties: {
          chatId: { type: "string", description: "Conversation ID or thread ID" },
          messageId: { type: "string", description: "Message ID (for Page Graph API) or omitted (for Personal DOM)" }
        }
      }
    },
    {
      name: "channelhub_group_check_profanity",
      description: "Check if text contains toxic words or profanity.",
      parameters: {
        type: "object",
        required: ["text"],
        properties: {
          text: { type: "string", description: "Message content to inspect" },
          badWords: { type: "array", description: "Optional custom list of prohibited words" }
        }
      }
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
          maxStrikes: { type: "number", description: "Maximum strikes before kick (default: 3)" }
        }
      }
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
          options: { type: "array", description: "Array of choice options (string[])" }
        }
      }
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
          optionIndex: { type: "number", description: "0-based index of chosen option" }
        }
      }
    },
    {
      name: "channelhub_group_get_poll_results",
      description: "Get real-time vote results and percentages for a group poll.",
      parameters: {
        type: "object",
        required: ["pollId"],
        properties: {
          pollId: { type: "string", description: "Poll ID" }
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
      case "channelhub_github_comment": {
        const ch = hub.getChannel("github");
        if (!ch)
          throw new Error("GitHub channel adapter not registered.");
        const res = await ch.sendText(args.chatId, args.text);
        return {
          content: [{ type: "text", text: JSON.stringify(res, null, 2) }]
        };
      }
      case "channelhub_github_create_issue": {
        const ch = hub.getChannel("github");
        if (!ch || !ch.createIssue)
          throw new Error("GitHub channel adapter not registered.");
        const res = await ch.createIssue(args.repo, args.title, args.body, args.labels);
        return {
          content: [{ type: "text", text: JSON.stringify(res, null, 2) }]
        };
      }
      case "channelhub_calendar_quick_add": {
        const ch = hub.getChannel("calendar");
        if (!ch)
          throw new Error("Calendar channel adapter not registered.");
        const res = await ch.sendText(args.calendarId || "primary", args.text);
        return {
          content: [{ type: "text", text: JSON.stringify(res, null, 2) }]
        };
      }
      case "channelhub_web_search": {
        const res = await WebResearch.search(args.query, {
          limit: args.limit,
          deepExtract: args.deepExtract,
          provider: args.provider,
          apiKey: args.apiKey
        });
        return {
          content: [{ type: "text", text: JSON.stringify(res, null, 2) }]
        };
      }
      case "channelhub_web_extract": {
        const res = await WebResearch.extract(args.url);
        return {
          content: [{ type: "text", text: res.content }]
        };
      }
      case "channelhub_video_create_short": {
        const res = await VideoEngine.createShort({
          input: args.input,
          output: args.output,
          mode: args.mode
        });
        return {
          content: [{ type: "text", text: JSON.stringify(res, null, 2) }]
        };
      }
      case "channelhub_video_burn_subtitles": {
        const res = await VideoEngine.burnSubtitles({
          input: args.input,
          output: args.output,
          subtitles: args.subtitles
        });
        return {
          content: [{ type: "text", text: JSON.stringify(res, null, 2) }]
        };
      }
      case "channelhub_video_add_watermark": {
        const res = await VideoEngine.addWatermark({
          input: args.input,
          watermark: args.watermark,
          output: args.output,
          position: args.position,
          opacity: args.opacity
        });
        return {
          content: [{ type: "text", text: JSON.stringify(res, null, 2) }]
        };
      }
      case "channelhub_messenger_get_threads": {
        const adapter = hub.getChannel("messenger");
        if (!adapter || typeof adapter.getThreads !== "function") {
          throw new Error("Messenger personal adapter is not registered or does not support getThreads");
        }
        const threads = await adapter.getThreads(args.limit || 30);
        return {
          content: [{ type: "text", text: JSON.stringify(threads, null, 2) }]
        };
      }
      case "channelhub_messenger_get_history": {
        const adapter = hub.getChannel("messenger");
        if (!adapter || typeof adapter.getThreadHistory !== "function") {
          throw new Error("Messenger personal adapter is not registered or does not support getThreadHistory");
        }
        const history = await adapter.getThreadHistory(args.threadId, args.limit || 20);
        return {
          content: [{ type: "text", text: JSON.stringify(history, null, 2) }]
        };
      }
      case "channelhub_messenger_get_members": {
        const adapter = hub.getChannel("messenger");
        if (!adapter || typeof adapter.getGroupMembers !== "function") {
          throw new Error("Messenger personal adapter is not registered or does not support getGroupMembers");
        }
        const members = await adapter.getGroupMembers(args.threadId);
        return {
          content: [{ type: "text", text: JSON.stringify(members, null, 2) }]
        };
      }
      case "channelhub_messenger_get_user_profile": {
        const adapter = hub.getChannel("messenger");
        if (!adapter || typeof adapter.getUserProfile !== "function") {
          throw new Error("Messenger personal adapter is not registered or does not support getUserProfile");
        }
        const profile = await adapter.getUserProfile(args.userId);
        return {
          content: [{ type: "text", text: JSON.stringify(profile, null, 2) }]
        };
      }
      case "channelhub_group_recap": {
        const recap = _groupManager.generateRecap(args.messages || []);
        return {
          content: [{ type: "text", text: JSON.stringify(recap, null, 2) }]
        };
      }
      case "channelhub_group_check_spam": {
        const result = _groupManager.checkSpam(args.senderId, args.text, {
          disallowLinks: args.disallowLinks
        });
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
        };
      }
      case "channelhub_group_welcome_challenge": {
        const challenge = _groupManager.registerNewMember(args.chatId, { id: args.memberId, name: args.memberName }, args.groupRules);
        return {
          content: [{ type: "text", text: JSON.stringify(challenge, null, 2) }]
        };
      }
      case "channelhub_group_verify_challenge": {
        const valid = _groupManager.verifyMember(args.chatId, args.memberId, args.answer);
        return {
          content: [{ type: "text", text: JSON.stringify({ success: valid }, null, 2) }]
        };
      }
      case "channelhub_group_leaderboard": {
        const leaderboard = _groupManager.getLeaderboard(args.chatId, args.limit || 10);
        return {
          content: [{ type: "text", text: JSON.stringify(leaderboard, null, 2) }]
        };
      }
      case "channelhub_messenger_recall_message": {
        const adapter = hub.getChannel("messenger");
        if (!adapter || typeof adapter.recallMessage !== "function") {
          throw new Error("Messenger adapter is not registered or does not support recallMessage");
        }
        const success = await adapter.recallMessage(args.chatId, args.messageId);
        return {
          content: [{ type: "text", text: JSON.stringify({ success }, null, 2) }]
        };
      }
      case "channelhub_group_check_profanity": {
        const res = _groupManager.checkProfanity(args.text, args.badWords);
        return {
          content: [{ type: "text", text: JSON.stringify(res, null, 2) }]
        };
      }
      case "channelhub_group_issue_warning": {
        const res = _groupManager.issueWarning(args.chatId, args.userId, args.reason, args.maxStrikes);
        return {
          content: [{ type: "text", text: JSON.stringify(res, null, 2) }]
        };
      }
      case "channelhub_group_create_poll": {
        const poll = _groupManager.createPoll(args.chatId, args.creatorId, args.question, args.options);
        return {
          content: [{ type: "text", text: JSON.stringify(poll, null, 2) }]
        };
      }
      case "channelhub_group_cast_vote": {
        const success = _groupManager.castVote(args.pollId, args.voterId, args.optionIndex);
        return {
          content: [{ type: "text", text: JSON.stringify({ success }, null, 2) }]
        };
      }
      case "channelhub_group_get_poll_results": {
        const results = _groupManager.getPollResults(args.pollId);
        return {
          content: [{ type: "text", text: JSON.stringify(results, null, 2) }]
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
