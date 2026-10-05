import { test, expect, describe, mock, afterEach } from "bun:test";
import { EmailChannelAdapter } from "../src/channels/email/adapter";
import { ChannelHub } from "../src/core/hub";
import { handleChannelHubMcpCall, getChannelHubMcpTools } from "../src/bridges/mcp/index";

describe("EmailChannelAdapter", () => {
  afterEach(() => {
    mock.restore();
  });

  test("validates configuration requirements", () => {
    expect(() => new EmailChannelAdapter({ apiKey: "", fromAddress: "bot@domain.com" })).toThrow(/apiKey/);
    expect(() => new EmailChannelAdapter({ apiKey: "key", fromAddress: "" })).toThrow(/fromAddress/);
  });

  test("sends text email via Resend API", async () => {
    const adapter = new EmailChannelAdapter({
      apiKey: "re_test_key",
      fromAddress: "test@domain.com",
      provider: "resend",
    });

    let requestedUrl = "";
    let requestedBody: any;
    let authHeader = "";

    // Mock global fetch
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (url: string, opts: any) => {
      requestedUrl = url;
      authHeader = opts.headers.Authorization;
      requestedBody = JSON.parse(opts.body);
      return new Response(JSON.stringify({ id: "email_resend_123" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as any;

    try {
      const res = await adapter.sendText("boss@example.com", "Hello from ChannelHub AI", {
        subject: "Daily Report",
        html: "<p>Hello from ChannelHub AI</p>",
      });

      expect(res.messageId).toBe("email_resend_123");
      expect(res.chatId).toBe("boss@example.com");
      expect(requestedUrl).toBe("https://api.resend.com/emails");
      expect(authHeader).toBe("Bearer re_test_key");
      expect(requestedBody.from).toBe("test@domain.com");
      expect(requestedBody.to).toEqual(["boss@example.com"]);
      expect(requestedBody.subject).toBe("Daily Report");
      expect(requestedBody.text).toBe("Hello from ChannelHub AI");
      expect(requestedBody.html).toBe("<p>Hello from ChannelHub AI</p>");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("sends email with attachments via Resend", async () => {
    const adapter = new EmailChannelAdapter({
      apiKey: "re_test_key",
      fromAddress: "test@domain.com",
      provider: "resend",
    });

    let requestedBody: any;
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (url: string, opts: any) => {
      requestedBody = JSON.parse(opts.body);
      return new Response(JSON.stringify({ id: "email_attach_456" }), { status: 200 });
    }) as any;

    try {
      const res = await adapter.sendMedia("client@domain.com", {
        type: "file",
        source: Buffer.from("Invoice details PDF mock"),
        filename: "invoice.pdf",
        caption: "Please find your invoice attached.",
      });

      expect(res.messageId).toBe("email_attach_456");
      expect(requestedBody.attachments.length).toBe(1);
      expect(requestedBody.attachments[0].filename).toBe("invoice.pdf");
      expect(requestedBody.attachments[0].content).toBe(Buffer.from("Invoice details PDF mock").toString("base64"));
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("normalizes inbound webhook email into UnifiedMessage", () => {
    const adapter = new EmailChannelAdapter({
      apiKey: "test",
      fromAddress: "bot@domain.com",
    });

    let receivedMsg: any = null;
    adapter.on("message", (msg) => {
      receivedMsg = msg;
    });

    adapter.handleInboundWebhook({
      id: "inbound_email_999",
      from: "customer@gmail.com",
      sender_name: "Customer Support",
      subject: "Need help with refund",
      text: "Please help me cancel order #1234",
    });

    expect(receivedMsg).not.toBeNull();
    expect(receivedMsg.channel).toBe("email");
    expect(receivedMsg.chat.id).toBe("customer@gmail.com");
    expect(receivedMsg.sender.id).toBe("customer@gmail.com");
    expect(receivedMsg.content.text).toBe("Please help me cancel order #1234");
  });

  test("MCP Bridge exposes channelhub_send_email tool and handles it", async () => {
    const hub = new ChannelHub();
    const adapter = new EmailChannelAdapter({
      apiKey: "test_key",
      fromAddress: "agent@owlops.com",
    });
    hub.register(adapter);

    const tools = getChannelHubMcpTools();
    const emailTool = tools.find((t) => t.name === "channelhub_send_email");
    expect(emailTool).toBeDefined();

    // Mock sendText on adapter
    let calledWith: any;
    adapter.sendText = async (to: string, text: string, opts: any) => {
      calledWith = { to, text, opts };
      return { messageId: "email_mock_mcp", chatId: to, timestamp: Date.now() };
    };

    const callRes = await handleChannelHubMcpCall(hub, "channelhub_send_email", {
      to: "executive@corp.com",
      subject: "Q3 Forecast",
      text: "Q3 revenue is projected to exceed estimates.",
      cc: ["board@corp.com"],
    });

    expect(callRes.isError).toBeFalsy();
    expect(calledWith.to).toBe("executive@corp.com");
    expect(calledWith.opts.subject).toBe("Q3 Forecast");
    expect(calledWith.opts.cc).toEqual(["board@corp.com"]);
  });
});
