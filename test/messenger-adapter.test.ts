import { describe, expect, test } from "bun:test";
import { MessengerChannelAdapter } from "../src/channels/messenger/adapter";

describe("MessengerChannelAdapter", () => {
  const adapter = new MessengerChannelAdapter({
    pageAccessToken: "test-page-access-token",
    verifyToken: "my-secret-verify-token",
  });

  test("verifies webhook challenge successfully", () => {
    const challenge = adapter.verifyWebhook("subscribe", "my-secret-verify-token", "challenge_12345");
    expect(challenge).toBe("challenge_12345");
  });

  test("rejects invalid webhook challenge token", () => {
    const challenge = adapter.verifyWebhook("subscribe", "wrong-token", "challenge_12345");
    expect(challenge).toBeNull();
  });

  test("normalizes Messenger webhook payload to UnifiedMessage", () => {
    const rawPayload = {
      object: "page",
      entry: [
        {
          id: "page-123456",
          time: 1727700000000,
          messaging: [
            {
              sender: { id: "user-psid-789" },
              recipient: { id: "page-123456" },
              timestamp: 1727700000000,
              message: {
                mid: "m_mid_abcdef123",
                text: "Hello via Messenger!",
              },
            },
          ],
        },
      ],
    };

    const messages = adapter.normalizeEvent(rawPayload);
    expect(messages.length).toBe(1);
    const msg = messages[0];
    expect(msg.id).toBe("m_mid_abcdef123");
    expect(msg.channel).toBe("messenger");
    expect(msg.sender.id).toBe("user-psid-789");
    expect(msg.chat.id).toBe("user-psid-789");
    expect(msg.chat.type).toBe("dm");
    expect(msg.content.text).toBe("Hello via Messenger!");
  });

  test("normalizes Messenger payload with attachments", () => {
    const rawPayload = {
      object: "page",
      entry: [
        {
          id: "page-123",
          messaging: [
            {
              sender: { id: "user-1" },
              message: {
                mid: "m_1",
                text: "Here is an image",
                attachments: [
                  {
                    type: "image",
                    payload: { url: "https://example.com/photo.jpg" },
                  },
                ],
              },
            },
          ],
        },
      ],
    };

    const messages = adapter.normalizeEvent(rawPayload);
    expect(messages.length).toBe(1);
    expect(messages[0].content.attachments?.length).toBe(1);
    expect(messages[0].content.attachments?.[0].url).toBe("https://example.com/photo.jpg");
    expect(messages[0].content.attachments?.[0].type).toBe("image");
  });

  test("handles exotic attachments (location, fallback, stickers)", () => {
    const rawPayload = {
      object: "page",
      entry: [
        {
          messaging: [
            {
              sender: { id: "u2" },
              message: {
                mid: "m_loc",
                attachments: [
                  {
                    type: "location",
                    payload: { coordinates: { lat: 21.0, long: 105.8 } },
                  },
                  {
                    type: "fallback",
                    title: "Instagram Reel",
                    url: "https://instagram.com/reel/123",
                  },
                ],
                sticker_id: 369239263222822,
              },
            },
          ],
        },
      ],
    };

    const msgs = adapter.normalizeEvent(rawPayload);
    expect(msgs.length).toBe(1);
    
    // Check synthesized text from location + fallback
    expect(msgs[0].content.text).toContain("Vị trí");
    
    // Check attachments
    const atts = msgs[0].content.attachments!;
    expect(atts.length).toBe(3); // sticker + location + fallback
    
    expect(atts[0].type).toBe("image");
    expect(atts[0].url).toContain("369239263222822");

    expect(atts[1].type).toBe("file");
    expect(atts[1].filename).toBe("location.json");
    expect(atts[1].url).toContain("21,105.8");

    expect(atts[2].type).toBe("file");
    expect(atts[2].filename).toBe("Instagram Reel");
    expect(atts[2].url).toBe("https://instagram.com/reel/123");
  });

  test("rejects files > 100MB", async () => {
    const largeBuffer = new Uint8Array(101 * 1024 * 1024); // 101 MB
    await expect(adapter.sendMedia("test", { type: "video", source: largeBuffer }))
      .rejects.toThrow(/100MB/);
  });
});
