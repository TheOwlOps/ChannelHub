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
    actionItems: Array<{
        task: string;
        assignee?: string;
    }>;
    summaryText: string;
}
export interface SpamCheckOptions {
    maxMessagesPerWindow?: number;
    windowMs?: number;
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
    votes: Map<string, number>;
    active: boolean;
}
export declare class GroupManager {
    private userMessageHistory;
    private reminders;
    private pendingChallenges;
    private chatActivities;
    private warnings;
    private polls;
    generateRecap(messages: GroupMessage[]): GroupRecap;
    checkSpam(senderId: string, text: string, options?: SpamCheckOptions): SpamCheckResult;
    registerNewMember(chatId: string, member: {
        id: string;
        name: string;
    }, groupRules?: string, timeoutSeconds?: number): GatekeeperChallenge;
    verifyMember(chatId: string, memberId: string, answer: string): boolean;
    scheduleReminder(chatId: string, text: string, triggerAt: number | Date, recurringIntervalMs?: number): GroupReminder;
    pollDueReminders(): GroupReminder[];
    recordActivity(chatId: string, senderId: string, senderName?: string, timestamp?: number): void;
    getLeaderboard(chatId: string, limit?: number): MemberActivity[];
    getInactiveMembers(chatId: string, cutoffDays?: number): MemberActivity[];
    checkProfanity(text: string, badWords?: string[]): {
        isClean: boolean;
        flaggedWords: string[];
    };
    issueWarning(chatId: string, userId: string, reason: string, maxStrikes?: number): {
        strikes: number;
        action: "warn" | "kick";
    };
    getWarnings(chatId: string, userId: string): Array<{
        reason: string;
        timestamp: number;
    }>;
    clearWarnings(chatId: string, userId: string): void;
    createPoll(chatId: string, creatorId: string, question: string, options: string[]): PollDefinition;
    castVote(pollId: string, voterId: string, optionIndex: number): boolean;
    getPollResults(pollId: string): {
        question: string;
        totalVotes: number;
        active: boolean;
        results: Array<{
            option: string;
            votes: number;
            percentage: number;
        }>;
    } | null;
    closePoll(pollId: string, creatorId?: string): boolean;
}
