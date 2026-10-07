import { describe, test, expect, beforeEach } from "bun:test";
import { GroupManager } from "../src/core/group-manager";

describe("GroupManager Suite", () => {
  let gm: GroupManager;

  beforeEach(() => {
    gm = new GroupManager();
  });

  // 1. Recap
  test("generates structured recap with topics, decisions, and action items", () => {
    const messages = [
      { sender: "Alice", text: "Chào mọi người, dự án tuần này thế nào?" },
      { sender: "Bob", text: "Thống nhất triển khai bản v1.7.0 vào thứ 6." },
      { sender: "Charlie", text: "Task: Cần làm tài liệu hướng dẫn cho bot." },
      { sender: "Alice", text: "Chốt: Sử dụng ChannelHub làm core." },
    ];

    const recap = gm.generateRecap(messages);
    expect(recap.totalMessages).toBe(4);
    expect(recap.participants).toContain("Alice");
    expect(recap.participants).toContain("Bob");
    expect(recap.decisions.length).toBeGreaterThan(0);
    expect(recap.actionItems.length).toBeGreaterThan(0);
    expect(recap.summaryText).toContain("Tóm tắt cuộc thảo luận");
  });

  // 2. Anti-Spam
  test("flags blacklisted links and flood as spam", () => {
    // Normal message
    const res1 = gm.checkSpam("user_1", "Hello world");
    expect(res1.isSpam).toBe(false);

    // Blacklisted link
    const res2 = gm.checkSpam("user_2", "Kiếm tiền nhanh tại https://t.me/scamlink");
    expect(res2.isSpam).toBe(true);
    expect(res2.reason).toBe("blacklisted_link");
    expect(res2.recommendedAction).toBe("kick");

    // Flood (send > 5 messages rapidly)
    for (let i = 0; i < 4; i++) {
      gm.checkSpam("user_flooder", `Msg ${i}`);
    }
    const resFlood = gm.checkSpam("user_flooder", "Msg flood 5");
    expect(resFlood.isSpam).toBe(true);
    expect(resFlood.reason).toBe("flood");

    // Repetitive text
    gm.checkSpam("user_repeat", "Same text");
    gm.checkSpam("user_repeat", "Same text");
    const resRepeat = gm.checkSpam("user_repeat", "Same text");
    expect(resRepeat.isSpam).toBe(true);
    expect(resRepeat.reason).toBe("repetitive_text");
  });

  // 3. Gatekeeper
  test("creates captcha challenge and verifies correct answer", () => {
    const challenge = gm.registerNewMember("chat_1", { id: "u_new", name: "Minh" }, "Nội quy cấm spam", 60);
    expect(challenge.memberName).toBe("Minh");
    expect(challenge.question).toContain("+");

    // Wrong answer
    const wrong = gm.verifyMember("chat_1", "u_new", "9999");
    expect(wrong).toBe(false);

    // Correct answer
    const correct = gm.verifyMember("chat_1", "u_new", challenge.expectedAnswer);
    expect(correct).toBe(true);
  });

  // 4. Reminders
  test("schedules and polls due reminders", () => {
    const past = Date.now() - 1000;
    const future = Date.now() + 50000;

    gm.scheduleReminder("chat_1", "Họp nhóm ngay", past);
    gm.scheduleReminder("chat_1", "Họp tuần sau", future);

    const due = gm.pollDueReminders();
    expect(due).toHaveLength(1);
    expect(due[0].text).toBe("Họp nhóm ngay");
  });

  // 5. Activity Analytics
  test("tracks user messages and produces leaderboard and inactive list", () => {
    gm.recordActivity("chat_1", "user_a", "Alice");
    gm.recordActivity("chat_1", "user_a", "Alice");
    gm.recordActivity("chat_1", "user_a", "Alice");
    gm.recordActivity("chat_1", "user_b", "Bob");

    const leaderboard = gm.getLeaderboard("chat_1");
    expect(leaderboard[0].name).toBe("Alice");
    expect(leaderboard[0].messageCount).toBe(3);
    expect(leaderboard[1].name).toBe("Bob");
    expect(leaderboard[1].messageCount).toBe(1);

    // Inactive check
    const inactives = gm.getInactiveMembers("chat_1", 1);
    expect(inactives).toHaveLength(0); // All active today
  });

  // 6. Profanity
  test("detects toxic words and allows clean text", () => {
    const clean = gm.checkProfanity("Xin chào các bạn nhé");
    expect(clean.isClean).toBe(true);

    const dirty = gm.checkProfanity("thằng này vcl thật");
    expect(dirty.isClean).toBe(false);
    expect(dirty.flaggedWords).toContain("vcl");
  });

  // 7. Strikes
  test("issues strikes and triggers kick recommendation on 3rd strike", () => {
    const s1 = gm.issueWarning("chat_1", "user_bad", "Spam sticker", 3);
    expect(s1.strikes).toBe(1);
    expect(s1.action).toBe("warn");

    const s2 = gm.issueWarning("chat_1", "user_bad", "Chửi tục", 3);
    expect(s2.strikes).toBe(2);
    expect(s2.action).toBe("warn");

    const s3 = gm.issueWarning("chat_1", "user_bad", "Gửi link scam", 3);
    expect(s3.strikes).toBe(3);
    expect(s3.action).toBe("kick");

    expect(gm.getWarnings("chat_1", "user_bad")).toHaveLength(3);
    gm.clearWarnings("chat_1", "user_bad");
    expect(gm.getWarnings("chat_1", "user_bad")).toHaveLength(0);
  });

  // 8. Polls
  test("creates poll, records votes, calculates percentages, and closes poll", () => {
    const poll = gm.createPoll("chat_1", "admin_1", "Ăn trưa gì?", ["Cơm", "Phở", "Bún"]);
    expect(poll.options).toHaveLength(3);

    expect(gm.castVote(poll.id, "u1", 0)).toBe(true);
    expect(gm.castVote(poll.id, "u2", 0)).toBe(true);
    expect(gm.castVote(poll.id, "u3", 1)).toBe(true);

    const res = gm.getPollResults(poll.id);
    expect(res).not.toBeNull();
    expect(res!.totalVotes).toBe(3);
    expect(res!.results[0].votes).toBe(2);
    expect(res!.results[0].percentage).toBe(67);
    expect(res!.results[1].votes).toBe(1);
    expect(res!.results[1].percentage).toBe(33);

    expect(gm.closePoll(poll.id, "admin_1")).toBe(true);
    expect(gm.castVote(poll.id, "u4", 2)).toBe(false); // Closed
  });
});
