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
});
