import { describe, expect, test } from "bun:test";
import { createHmac } from "node:crypto";
import { TikTokBusinessAdapter } from "../src/channels/tiktok/adapter";
import type { UnifiedMessage } from "../src/core/types";

describe("TikTokBusinessAdapter", () => {
  const mockConfig = {
    appId: "mock_app_123",
    clientSecret: "super_secret_key_456",
    accessToken: "mock_access_token_789",
  };

  test("validates configuration requirements", () => {
    expect(() => new TikTokBusinessAdapter({ ...mockConfig, appId: "" })).toThrow();
    expect(() => new TikTokBusinessAdapter({ ...mockConfig, clientSecret: "" })).toThrow();
    expect(() => new TikTokBusinessAdapter({ ...mockConfig, accessToken: "" })).toThrow();
  });

  describe("Security: Signature Verification & Anti-Replay", () => {
    test("accepts valid HMAC-SHA256 signature within time window", () => {
      const adapter = new TikTokBusinessAdapter(mockConfig);
      const rawBody = JSON.stringify({ event: "message.receive", content: "{}" });
      const nowSec = Math.floor(Date.now() / 1000);

      const hmac = createHmac("sha256", mockConfig.clientSecret)
        .update(`${nowSec}.${rawBody}`, "utf8")
        .digest("hex");

      const header = `t=${nowSec},s=${hmac}`;
      expect(adapter.verifySignature(rawBody, header)).toBe(true);
    });

    test("rejects invalid signature string", () => {
      const adapter = new TikTokBusinessAdapter(mockConfig);
      const rawBody = '{"event":"test"}';
      const nowSec = Math.floor(Date.now() / 1000);
      const invalidHeader = `t=${nowSec},s=invalid_signature_hex`;

      expect(adapter.verifySignature(rawBody, invalidHeader)).toBe(false);
    });

    test("rejects stale webhook beyond maxWebhookAgeSeconds (replay protection)", () => {
      const adapter = new TikTokBusinessAdapter({
        ...mockConfig,
        maxWebhookAgeSeconds: 300,
      });

      const rawBody = '{"event":"test"}';
      // 10 minutes ago
      const staleSec = Math.floor(Date.now() / 1000) - 600;

      const hmac = createHmac("sha256", mockConfig.clientSecret)
        .update(`${staleSec}.${rawBody}`, "utf8")
        .digest("hex");

      const header = `t=${staleSec},s=${hmac}`;
      expect(adapter.verifySignature(rawBody, header)).toBe(false);
    });

    test("rejects missing signature header", () => {
      const adapter = new TikTokBusinessAdapter(mockConfig);
      expect(adapter.verifySignature("{}", undefined)).toBe(false);
    });
  });

  describe("Message Normalization", () => {
    test("normalizes raw text message into UnifiedMessage", () => {
      const adapter = new TikTokBusinessAdapter(mockConfig);
      const raw = {
        message_id: "msg_999",
        conversation_id: "conv_111",
        sender_open_id: "user_abc",
        sender_display_name: "TikTok User",
        message_type: "TEXT",
        text: "Hello OwlOps!",
        create_time: 1727337600,
      };

      const unified = adapter.normalizeMessage(raw);
      expect(unified).not.toBeNull();
      expect(unified?.id).toBe("msg_999");
      expect(unified?.channel).toBe("tiktok");
      expect(unified?.sender.id).toBe("user_abc");
      expect(unified?.sender.name).toBe("TikTok User");
      expect(unified?.chat.id).toBe("conv_111");
      expect(unified?.chat.type).toBe("dm");
      expect(unified?.content.text).toBe("Hello OwlOps!");
      expect(unified?.timestamp).toBe(1727337600000);
    });

    test("normalizes raw image message into UnifiedMessage with attachment", () => {
      const adapter = new TikTokBusinessAdapter(mockConfig);
      const raw = {
        message_id: "msg_img_123",
        conversation_id: "conv_222",
        sender_open_id: "user_xyz",
        message_type: "IMAGE",
        image_url: "https://example.com/image.png",
        create_time: 1727337600,
      };

      const unified = adapter.normalizeMessage(raw);
      expect(unified).not.toBeNull();
      expect(unified?.content.attachments?.length).toBe(1);
      expect(unified?.content.attachments?.[0].type).toBe("image");
      expect(unified?.content.attachments?.[0].url).toBe("https://example.com/image.png");
    });
  });

  describe("Ingress Handling", () => {
    test("dispatches received message to listeners", async () => {
      const adapter = new TikTokBusinessAdapter(mockConfig);

      const rawMsg = {
        message_id: "msg_dispatch_1",
        conversation_id: "conv_dispatch_1",
        sender_open_id: "sender_1",
        message_type: "TEXT",
        text: "Testing dispatch",
        create_time: Math.floor(Date.now() / 1000),
      };

      const rawBody = JSON.stringify({
        event: "message.receive",
        content: JSON.stringify(rawMsg),
      });

      const nowSec = Math.floor(Date.now() / 1000);
      const hmac = createHmac("sha256", mockConfig.clientSecret)
        .update(`${nowSec}.${rawBody}`, "utf8")
        .digest("hex");
      const header = `t=${nowSec},s=${hmac}`;

      let received: UnifiedMessage | null = null;
      adapter.on("message", (msg) => {
        received = msg;
      });

      const accepted = await adapter.handleWebhook(rawBody, header);
      expect(accepted).toBe(true);
      expect(received).not.toBeNull();
      expect(received?.id).toBe("msg_dispatch_1");
      expect(received?.content.text).toBe("Testing dispatch");
    });
  });
});
