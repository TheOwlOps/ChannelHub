import { test, expect, describe, mock, afterEach } from "bun:test";
import { GitHubChannelAdapter } from "../src/channels/github/adapter";
import { CalendarChannelAdapter } from "../src/channels/calendar/adapter";
import { WebhookGenericAdapter } from "../src/channels/webhook-generic/adapter";
import { ChannelHub } from "../src/core/hub";
import { handleChannelHubMcpCall, getChannelHubMcpTools } from "../src/bridges/mcp/index";

// --- GitHub Adapter ---
describe("GitHubChannelAdapter", () => {
  const originalFetch = globalThis.fetch;
  afterEach(() => { globalThis.fetch = originalFetch; });

  test("validates config requirements", () => {
    expect(() => new GitHubChannelAdapter({ token: "" })).toThrow("token is required");
  });

  test("verifies valid webhook signature with timingSafeEqual", () => {
    const gh = new GitHubChannelAdapter({ token: "ghp_test", webhookSecret: "secret123" });
    const payload = '{"action":"opened"}';
    const { createHmac } = require("node:crypto");
    const sig = "sha256=" + createHmac("sha256", "secret123").update(payload).digest("hex");
    expect(gh.verifyWebhookSignature(payload, sig)).toBe(true);
    expect(gh.verifyWebhookSignature(payload, "sha256=bad")).toBe(false);
  });

  test("fail-closed: returns false with no secret configured", () => {
    const gh = new GitHubChannelAdapter({ token: "ghp_test" });
    expect(gh.verifyWebhookSignature("payload", "sha256=any")).toBe(false);
  });

  test("normalizes issue event", () => {
    const gh = new GitHubChannelAdapter({ token: "ghp_test" });
    const msg = gh.normalizeWebhookEvent("issues", {
      action: "opened",
      issue: { id: 1, number: 42, title: "Bug report", body: "Details here" },
      sender: { id: 100, login: "ryanowlops" },
      repository: { full_name: "theowlops/channelhub" },
    });
    expect(msg).not.toBeNull();
    expect(msg!.id).toBe("issue-1-opened");
    expect(msg!.content.text).toContain("#42 Bug report");
    expect(msg!.sender.name).toBe("ryanowlops");
    expect(msg!.chat.id).toBe("theowlops/channelhub");
  });

  test("normalizes PR event", () => {
    const gh = new GitHubChannelAdapter({ token: "ghp_test" });
    const msg = gh.normalizeWebhookEvent("pull_request", {
      action: "closed",
      pull_request: { id: 5, number: 10, title: "Fix typo", body: "" },
      sender: { id: 200, login: "contributor" },
      repository: { full_name: "theowlops/channelhub" },
    });
    expect(msg!.id).toBe("pr-5-closed");
    expect(msg!.content.text).toContain("[PR closed] #10 Fix typo");
  });

  test("normalizes push event", () => {
    const gh = new GitHubChannelAdapter({ token: "ghp_test" });
    const msg = gh.normalizeWebhookEvent("push", {
      ref: "refs/heads/main",
      after: "abc1234",
      commits: [{ message: "feat: add email" }, { message: "fix: typo" }],
      sender: { id: 100, login: "ryanowlops" },
      repository: { full_name: "theowlops/channelhub" },
    });
    expect(msg!.id).toBe("push-abc1234");
    expect(msg!.content.text).toContain("2 commit(s)");
    expect(msg!.content.text).toContain("• feat: add email");
  });

  test("sends comment to issue via REST API", async () => {
    const gh = new GitHubChannelAdapter({ token: "ghp_test" });
    globalThis.fetch = mock(async (url: any, opts: any) => {
      expect(url).toContain("/repos/theowlops/channelhub/issues/42/comments");
      expect(opts.headers.Authorization).toBe("Bearer ghp_test");
      return new Response(JSON.stringify({ id: 999 }), { status: 201 });
    }) as any;
    const res = await gh.sendText("theowlops/channelhub#42", "LGTM!");
    expect(res.messageId).toBe("999");
  });

  test("rejects invalid chatId format", () => {
    const gh = new GitHubChannelAdapter({ token: "ghp_test" });
    expect(gh.sendText("invalid", "text")).rejects.toThrow("Invalid GitHub chatId format");
  });

  test("MCP tool channelhub_github_comment dispatches correctly", async () => {
    const gh = new GitHubChannelAdapter({ token: "ghp_test" });
    globalThis.fetch = mock(async () => new Response(JSON.stringify({ id: 111 }), { status: 201 })) as any;
    const hub = new ChannelHub();
    hub.register(gh);
    const result = await handleChannelHubMcpCall(hub, "channelhub_github_comment", {
      chatId: "theowlops/channelhub#1",
      text: "Automated review comment",
    });
    expect(result.isError).toBeUndefined();
    const data = JSON.parse(result.content[0].text);
    expect(data.messageId).toBe("111");
  });
});

// --- Calendar Adapter ---
describe("CalendarChannelAdapter", () => {
  const originalFetch = globalThis.fetch;
  afterEach(() => { globalThis.fetch = originalFetch; });

  test("validates config requirements", () => {
    expect(() => new CalendarChannelAdapter({ accessToken: "" })).toThrow("accessToken is required");
  });

  test("sendText calls Google Calendar QuickAdd", async () => {
    const cal = new CalendarChannelAdapter({ accessToken: "ya29.test" });
    globalThis.fetch = mock(async (url: any) => {
      expect(String(url)).toContain("/calendars/primary/events/quickAdd");
      expect(String(url)).toContain("text=Meeting");
      return new Response(JSON.stringify({ id: "evt_123" }), { status: 200 });
    }) as any;
    const res = await cal.sendText("primary", "Meeting with Ryan tomorrow at 2pm");
    expect(res.messageId).toBe("evt_123");
  });

  test("MCP tool channelhub_calendar_quick_add dispatches correctly", async () => {
    const cal = new CalendarChannelAdapter({ accessToken: "ya29.test" });
    globalThis.fetch = mock(async () => new Response(JSON.stringify({ id: "evt_456" }), { status: 200 })) as any;
    const hub = new ChannelHub();
    hub.register(cal);
    const result = await handleChannelHubMcpCall(hub, "channelhub_calendar_quick_add", {
      text: "Standup meeting 9am",
    });
    expect(result.isError).toBeUndefined();
    const data = JSON.parse(result.content[0].text);
    expect(data.messageId).toBe("evt_456");
  });
});

// --- WebhookGeneric Adapter ---
describe("WebhookGenericAdapter", () => {
  test("validates serviceName requirement", () => {
    expect(() => new WebhookGenericAdapter({ serviceName: "" })).toThrow("serviceName is required");
  });

  test("normalizes payload using fieldMap", () => {
    const wh = new WebhookGenericAdapter({
      serviceName: "stripe",
      fieldMap: {
        messageId: "id",
        senderId: "data.object.customer",
        text: "data.object.description",
        chatId: "data.object.id",
      },
    });
    const msg = wh.normalizePayload({
      id: "evt_123",
      data: {
        object: {
          id: "ch_abc",
          customer: "cus_xyz",
          description: "Payment $50",
        },
      },
    });
    expect(msg.id).toBe("evt_123");
    expect(msg.sender.id).toBe("cus_xyz");
    expect(msg.content.text).toBe("Payment $50");
    expect(msg.chat.id).toBe("ch_abc");
    expect(msg.channel).toBe("stripe");
  });

  test("verifies HMAC-SHA256 signature", () => {
    const { createHmac } = require("node:crypto");
    const wh = new WebhookGenericAdapter({
      serviceName: "shopify",
      webhookSecret: "secret",
      signaturePrefix: "",
    });
    const payload = '{"order":"123"}';
    const sig = createHmac("sha256", "secret").update(payload).digest("hex");
    expect(wh.verifySignature(payload, sig)).toBe(true);
    expect(wh.verifySignature(payload, "bad")).toBe(false);
  });

  test("fail-closed: rejects missing signature header", () => {
    const wh = new WebhookGenericAdapter({
      serviceName: "jira",
      webhookSecret: "secret",
    });
    expect(wh.verifySignature("payload", "")).toBe(false);
  });

  test("bypasses verification when no secret configured", () => {
    const wh = new WebhookGenericAdapter({ serviceName: "linear" });
    expect(wh.verifySignature("payload", "")).toBe(true);
  });

  test("sendText uses custom sendHandler when provided", async () => {
    const handler = mock(async (chatId: string, text: string) => ({
      messageId: "sent-1",
      chatId,
      timestamp: Date.now(),
    }));
    const wh = new WebhookGenericAdapter({
      serviceName: "custom",
      sendHandler: handler,
    });
    const res = await wh.sendText("room-1", "Hello");
    expect(handler).toHaveBeenCalledWith("room-1", "Hello");
    expect(res.messageId).toBe("sent-1");
  });
});

// --- MCP Tools count ---
describe("MCP Tools Registry", () => {
  test("exposes 14 total MCP tools", () => {
    const tools = getChannelHubMcpTools();
    expect(tools.length).toBe(14);
    const names = tools.map((t: any) => t.name);
    expect(names).toContain("channelhub_send_email");
    expect(names).toContain("channelhub_github_comment");
    expect(names).toContain("channelhub_github_create_issue");
    expect(names).toContain("channelhub_calendar_quick_add");
  });
});
