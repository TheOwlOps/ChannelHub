import { describe, expect, test } from "bun:test";
import { createHmac } from "node:crypto";
import { MessengerChannelAdapter } from "../src/channels/messenger/adapter";
import { SlackChannelAdapter } from "../src/channels/slack/adapter";
import { TelegramChannelAdapter } from "../src/channels/telegram/adapter";

describe("Security Hardening Across Adapters", () => {
  describe("Messenger Signature Verification", () => {
    const config = {
      pageAccessToken: "token_123",
      verifyToken: "secret_verify_token",
      appSecret: "fb_app_secret_456",
    };

    test("verifies valid X-Hub-Signature-256 header using timingSafeEqual", () => {
      const adapter = new MessengerChannelAdapter(config);
      const rawBody = JSON.stringify({ object: "page", entry: [] });

      const hmac = createHmac("sha256", config.appSecret)
        .update(rawBody)
        .digest("hex");
      const header = `sha256=${hmac}`;

      expect(adapter.verifySignature(rawBody, header)).toBe(true);
      expect(adapter.verifySignature(rawBody, "sha256=invalid_hash")).toBe(false);
      expect(adapter.verifySignature(rawBody, undefined)).toBe(false);
    });

    test("verifies challenge token using timing-safe comparison", () => {
      const adapter = new MessengerChannelAdapter(config);
      expect(adapter.verifyWebhook("subscribe", "secret_verify_token", "challenge_abc")).toBe("challenge_abc");
      expect(adapter.verifyWebhook("subscribe", "wrong_token", "challenge_abc")).toBeNull();
    });
  });

  describe("Slack Signature Verification & Anti-Replay", () => {
    const config = {
      botToken: "xoxb-1234",
      signingSecret: "slack_secret_789",
    };

    test("verifies valid v0 signature within 5 minute window", () => {
      const adapter = new SlackChannelAdapter(config);
      const rawBody = JSON.stringify({ type: "event_callback" });
      const nowSec = String(Math.floor(Date.now() / 1000));

      const sigBase = `v0:${nowSec}:${rawBody}`;
      const hmac = "v0=" + createHmac("sha256", config.signingSecret)
        .update(sigBase, "utf8")
        .digest("hex");

      expect(adapter.verifySignature(rawBody, hmac, nowSec)).toBe(true);
      expect(adapter.verifySignature(rawBody, "v0=invalid", nowSec)).toBe(false);
    });

    test("rejects replay attack with stale timestamp (> 300s)", () => {
      const adapter = new SlackChannelAdapter(config);
      const rawBody = "{}";
      const staleSec = String(Math.floor(Date.now() / 1000) - 600); // 10 minutes ago

      const sigBase = `v0:${staleSec}:${rawBody}`;
      const hmac = "v0=" + createHmac("sha256", config.signingSecret)
        .update(sigBase, "utf8")
        .digest("hex");

      expect(adapter.verifySignature(rawBody, hmac, staleSec)).toBe(false);
    });
  });

  describe("Telegram Token Leak Redaction", () => {
    test("redacts botToken from network and API error messages", async () => {
      const secretToken = "SECRET_BOT_TOKEN_XYZ";
      const adapter = new TelegramChannelAdapter({
        botToken: secretToken,
        autoStart: false,
      });

      // Mock fetch returning an error body containing the token
      (globalThis as any).fetch = async () => {
        return new Response(`Error: Unauthorized access for token ${secretToken}`, {
          status: 401,
          statusText: "Unauthorized",
        });
      };

      let errorMsg = "";
      try {
        await adapter.sendText("123", "hello");
      } catch (err: any) {
        errorMsg = err.message;
      }

      expect(errorMsg).not.toContain(secretToken);
      expect(errorMsg).toContain("[REDACTED]");
    });
  });
});
