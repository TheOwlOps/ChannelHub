/**
 * Group Management Suite — @theowlops/channelhub
 *
 * Professional group management primitives:
 * 1. AI Chat Recap (Summarization & Action items)
 * 2. Anti-Spam & Link Shield (Flood detection, blacklists, repetitive message guard)
 * 3. Gatekeeper & Captcha Verification (Welcome messages & anti-clone filters)
 * 4. Smart Reminders & Scheduling
 * 5. Group Activity Analytics (Leaderboard & inactive member discovery)
 */

export interface GroupMessage {
  sender?: string;
  senderId?: string;
  text: string;
  timestamp?: number;
}

export interface GroupRecap {
  totalMessages: number;
  participants: string[];
  keyTopics: string[];
  decisions: string[];
  actionItems: Array<{ task: string; assignee?: string }>;
  summaryText: string;
}

export interface SpamCheckOptions {
  maxMessagesPerWindow?: number; // e.g. 5 msgs
  windowMs?: number; // e.g. 10000 ms (10s)
  blacklistedDomains?: string[];
  disallowLinks?: boolean;
}

export interface SpamCheckResult {
  isSpam: boolean;
  reason?: "flood" | "blacklisted_link" | "repetitive_text" | "links_disabled";
  recommendedAction: "allow" | "warn" | "delete" | "kick";
  messageCountInWindow: number;
}

export interface GatekeeperChallenge {
  memberId: string;
  memberName: string;
  welcomeMessage: string;
  question: string;
  expectedAnswer: string;
  expiresAt: number;
}

export interface GroupReminder {
  id: string;
  chatId: string;
  text: string;
  triggerAt: number;
  recurringIntervalMs?: number;
  executed: boolean;
}

export interface MemberActivity {
  userId: string;
  name: string;
  messageCount: number;
  lastActiveAt: number;
}

export interface PollDefinition {
  id: string;
  chatId: string;
  creatorId: string;
  question: string;
  options: string[];
  votes: Map<string, number>; // voterId -> optionIndex
  active: boolean;
}

export class GroupManager {
  private userMessageHistory: Map<string, Array<{ text: string; timestamp: number }>> = new Map();
  private reminders: Map<string, GroupReminder> = new Map();
  private pendingChallenges: Map<string, GatekeeperChallenge> = new Map();
  private chatActivities: Map<string, Map<string, MemberActivity>> = new Map();
  private warnings: Map<string, Map<string, Array<{ reason: string; timestamp: number }>>> = new Map();
  private polls: Map<string, PollDefinition> = new Map();

  // ==========================================
  // 1. AI CHAT RECAP ENGINE
  // ==========================================
  generateRecap(messages: GroupMessage[]): GroupRecap {
    const participants = Array.from(
      new Set(messages.map((m) => m.sender || m.senderId || "Unknown"))
    );

    const keyTopics: string[] = [];
    const decisions: string[] = [];
    const actionItems: Array<{ task: string; assignee?: string }> = [];

    for (const msg of messages) {
      const text = msg.text.trim();
      const lower = text.toLowerCase();

      // Heuristic extraction for decisions
      if (
        lower.startsWith("chốt:") ||
        lower.startsWith("quyết định:") ||
        lower.includes("thống nhất") ||
        lower.startsWith("agree:") ||
        lower.startsWith("decided:")
      ) {
        decisions.push(text);
      }

      // Heuristic extraction for action items / tasks
      if (
        lower.includes("cần làm") ||
        lower.includes("todo:") ||
        lower.includes("giao cho") ||
        lower.includes("hạn chót") ||
        lower.startsWith("task:")
      ) {
        actionItems.push({
          task: text,
          assignee: msg.sender,
        });
      }

      // Extract general topics
      if (text.length > 15 && !keyTopics.includes(text) && keyTopics.length < 5) {
        if (!decisions.includes(text) && !actionItems.some((a) => a.task === text)) {
          keyTopics.push(text.length > 80 ? text.slice(0, 77) + "..." : text);
        }
      }
    }

    const summaryLines = [
      `📊 **Tóm tắt cuộc thảo luận (${messages.length} tin nhắn)**:`,
      `👥 **Thành viên tham gia:** ${participants.join(", ") || "Không có"}`,
      `📌 **Chủ đề chính:** ${keyTopics.length > 0 ? keyTopics.join(" | ") : "Thảo luận thông thường"}`,
      `✅ **Quyết định đã chốt:** ${decisions.length > 0 ? decisions.join("; ") : "Không có"}`,
      `📝 **Đầu việc (Action items):** ${actionItems.length > 0 ? actionItems.map((a) => a.task).join("; ") : "Không có"}`,
    ];

    return {
      totalMessages: messages.length,
      participants,
      keyTopics,
      decisions,
      actionItems,
      summaryText: summaryLines.join("\n"),
    };
  }

  // ==========================================
  // 2. ANTI-SPAM & LINK SHIELD
  // ==========================================
  checkSpam(
    senderId: string,
    text: string,
    options: SpamCheckOptions = {}
  ): SpamCheckResult {
    const now = Date.now();
    const windowMs = options.windowMs || 10000;
    const maxMessages = options.maxMessagesPerWindow || 5;
    const blacklisted = options.blacklistedDomains || ["t.me/", "bit.ly/", "cutt.ly/", "tini.vn/"];

    // 1. Check Links & Blacklist
    const urlMatches = text.match(/https?:\/\/[^\s]+/gi) || [];
    if (options.disallowLinks && urlMatches.length > 0) {
      return {
        isSpam: true,
        reason: "links_disabled",
        recommendedAction: "delete",
        messageCountInWindow: 1,
      };
    }

    for (const url of urlMatches) {
      if (blacklisted.some((bad) => url.toLowerCase().includes(bad.toLowerCase()))) {
        return {
          isSpam: true,
          reason: "blacklisted_link",
          recommendedAction: "kick",
          messageCountInWindow: 1,
        };
      }
    }

    // 2. History & Flood Guard
    const userHistory = this.userMessageHistory.get(senderId) || [];
    const validHistory = userHistory.filter((item) => now - item.timestamp < windowMs);

    // Repetitive text detection (sent same text >= 3 times in window)
    const identicalCount = validHistory.filter((item) => item.text === text).length;
    if (identicalCount >= 2) {
      return {
        isSpam: true,
        reason: "repetitive_text",
        recommendedAction: "warn",
        messageCountInWindow: validHistory.length + 1,
      };
    }

    validHistory.push({ text, timestamp: now });
    this.userMessageHistory.set(senderId, validHistory);

    if (validHistory.length >= maxMessages) {
      return {
        isSpam: true,
        reason: "flood",
        recommendedAction: "warn",
        messageCountInWindow: validHistory.length,
      };
    }

    return {
      isSpam: false,
      recommendedAction: "allow",
      messageCountInWindow: validHistory.length,
    };
  }

  // ==========================================
  // 3. GATEKEEPER & VERIFICATION CAPTCHA
  // ==========================================
  registerNewMember(
    chatId: string,
    member: { id: string; name: string },
    groupRules: string = "Vui lòng tôn trọng thành viên và không gửi link quảng cáo.",
    timeoutSeconds: number = 60
  ): GatekeeperChallenge {
    const a = Math.floor(Math.random() * 8) + 1;
    const b = Math.floor(Math.random() * 8) + 1;
    const answer = String(a + b);
    const expiresAt = Date.now() + timeoutSeconds * 1000;

    const challengeKey = `${chatId}:${member.id}`;
    const challenge: GatekeeperChallenge = {
      memberId: member.id,
      memberName: member.name,
      welcomeMessage: `🎉 Chào mừng **${member.name}** đã tham gia nhóm!\n📜 Nội quy: ${groupRules}\n🔒 Để tránh tài khoản clone, bạn hãy trả lời câu hỏi bảo mật trong vòng ${timeoutSeconds}s:`,
      question: `Bạn hãy tính: ${a} + ${b} = ?`,
      expectedAnswer: answer,
      expiresAt,
    };

    this.pendingChallenges.set(challengeKey, challenge);
    return challenge;
  }

  verifyMember(chatId: string, memberId: string, answer: string): boolean {
    const challengeKey = `${chatId}:${memberId}`;
    const challenge = this.pendingChallenges.get(challengeKey);
    if (!challenge) return true; // No pending challenge

    if (Date.now() > challenge.expiresAt) {
      this.pendingChallenges.delete(challengeKey);
      return false; // Expired
    }

    if (answer.trim() === challenge.expectedAnswer) {
      this.pendingChallenges.delete(challengeKey);
      return true;
    }

    return false;
  }

  // ==========================================
  // 4. SMART REMINDERS & SCHEDULED ANNOUNCEMENTS
  // ==========================================
  scheduleReminder(
    chatId: string,
    text: string,
    triggerAt: number | Date,
    recurringIntervalMs?: number
  ): GroupReminder {
    const id = `remind_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const timestamp = typeof triggerAt === "number" ? triggerAt : triggerAt.getTime();

    const reminder: GroupReminder = {
      id,
      chatId,
      text,
      triggerAt: timestamp,
      recurringIntervalMs,
      executed: false,
    };

    this.reminders.set(id, reminder);
    return reminder;
  }

  pollDueReminders(): GroupReminder[] {
    const now = Date.now();
    const dueList: GroupReminder[] = [];

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

  // ==========================================
  // 5. ACTIVITY ANALYTICS & LEADERBOARD
  // ==========================================
  recordActivity(
    chatId: string,
    senderId: string,
    senderName: string = senderId,
    timestamp: number = Date.now()
  ): void {
    let groupMap = this.chatActivities.get(chatId);
    if (!groupMap) {
      groupMap = new Map();
      this.chatActivities.set(chatId, groupMap);
    }

    const current = groupMap.get(senderId) || {
      userId: senderId,
      name: senderName,
      messageCount: 0,
      lastActiveAt: timestamp,
    };

    current.messageCount += 1;
    current.name = senderName;
    current.lastActiveAt = timestamp;
    groupMap.set(senderId, current);
  }

  getLeaderboard(chatId: string, limit: number = 10): MemberActivity[] {
    const groupMap = this.chatActivities.get(chatId);
    if (!groupMap) return [];

    return Array.from(groupMap.values())
      .sort((a, b) => b.messageCount - a.messageCount)
      .slice(0, limit);
  }

  getInactiveMembers(chatId: string, cutoffDays: number = 7): MemberActivity[] {
    const groupMap = this.chatActivities.get(chatId);
    if (!groupMap) return [];

    const threshold = Date.now() - cutoffDays * 24 * 60 * 60 * 1000;
    return Array.from(groupMap.values()).filter((m) => m.lastActiveAt < threshold);
  }

  // ==========================================
  // 6. PROFANITY & TOXICITY FILTER
  // ==========================================
  checkProfanity(
    text: string,
    badWords: string[] = ["dm", "vcl", "fuck", "bitch", "scam", "lua dao"]
  ): { isClean: boolean; flaggedWords: string[] } {
    const lower = text.toLowerCase();
    const flagged: string[] = [];

    for (const w of badWords) {
      const regex = new RegExp(`(^|\\s|[^a-zA-Z0-9_])${w}([^a-zA-Z0-9_]|\\s|$)`, "i");
      if (regex.test(lower)) {
        flagged.push(w);
      }
    }

    return {
      isClean: flagged.length === 0,
      flaggedWords: flagged,
    };
  }

  // ==========================================
  // 7. STRIKE & WARNING SYSTEM
  // ==========================================
  issueWarning(
    chatId: string,
    userId: string,
    reason: string,
    maxStrikes: number = 3
  ): { strikes: number; action: "warn" | "kick" } {
    let chatMap = this.warnings.get(chatId);
    if (!chatMap) {
      chatMap = new Map();
      this.warnings.set(chatId, chatMap);
    }

    const userWarns = chatMap.get(userId) || [];
    userWarns.push({ reason, timestamp: Date.now() });
    chatMap.set(userId, userWarns);

    return {
      strikes: userWarns.length,
      action: userWarns.length >= maxStrikes ? "kick" : "warn",
    };
  }

  getWarnings(chatId: string, userId: string): Array<{ reason: string; timestamp: number }> {
    return this.warnings.get(chatId)?.get(userId) || [];
  }

  clearWarnings(chatId: string, userId: string): void {
    this.warnings.get(chatId)?.delete(userId);
  }

  // ==========================================
  // 8. GROUP POLL & VOTING SYSTEM
  // ==========================================
  createPoll(
    chatId: string,
    creatorId: string,
    question: string,
    options: string[]
  ): PollDefinition {
    const id = `poll_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const poll: PollDefinition = {
      id,
      chatId,
      creatorId,
      question,
      options,
      votes: new Map(),
      active: true,
    };
    this.polls.set(id, poll);
    return poll;
  }

  castVote(pollId: string, voterId: string, optionIndex: number): boolean {
    const poll = this.polls.get(pollId);
    if (!poll || !poll.active || optionIndex < 0 || optionIndex >= poll.options.length) {
      return false;
    }
    poll.votes.set(voterId, optionIndex);
    return true;
  }

  getPollResults(pollId: string): {
    question: string;
    totalVotes: number;
    active: boolean;
    results: Array<{ option: string; votes: number; percentage: number }>;
  } | null {
    const poll = this.polls.get(pollId);
    if (!poll) return null;

    const counts = new Array(poll.options.length).fill(0);
    for (const optIdx of poll.votes.values()) {
      counts[optIdx]++;
    }

    const total = poll.votes.size;
    const results = poll.options.map((option, idx) => ({
      option,
      votes: counts[idx],
      percentage: total > 0 ? Math.round((counts[idx] / total) * 100) : 0,
    }));

    return {
      question: poll.question,
      totalVotes: total,
      active: poll.active,
      results,
    };
  }

  closePoll(pollId: string, creatorId?: string): boolean {
    const poll = this.polls.get(pollId);
    if (!poll) return false;
    if (creatorId && poll.creatorId !== creatorId) return false;
    poll.active = false;
    return true;
  }
}
