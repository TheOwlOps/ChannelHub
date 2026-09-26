import { describe, expect, test } from "bun:test";
import { SlackChannelAdapter } from "../src/channels/slack/adapter";

describe("SlackChannelAdapter", () => {
  test("normalizes Slack Event API message to UnifiedMessage", () => {
    const adapter = new SlackChannelAdapter({ botToken: "xoxb-mock" });

    const rawEvent = {
      event: {
        type: "message",
        user: "U12345",
        text: "Hello Slack!",
        ts: "1727337600.000100",
        channel: "C98765",
        channel_type: "channel",
        client_msg_id: "slack-msg-01",
      },
    };

    const unified = adapter.normalizeEvent(rawEvent);
    expect(unified).not.toBeNull();
    expect(unified?.id).toBe("slack-msg-01");
    expect(unified?.channel).toBe("slack");
    expect(unified?.sender.id).toBe("U12345");
    expect(unified?.chat.id).toBe("C98765");
    expect(unified?.chat.type).toBe("channel");
    expect(unified?.content.text).toBe("Hello Slack!");
  });

  test("detects DM channel_type", () => {
    const adapter = new SlackChannelAdapter({ botToken: "xoxb-mock" });
    const dmEvent = {
      event: {
        type: "message",
        user: "U999",
        text: "DM ping",
        ts: "1727337601.000200",
        channel: "D11111",
        channel_type: "im",
      },
    };
    const unified = adapter.normalizeEvent(dmEvent);
    expect(unified?.chat.type).toBe("dm");
  });
});
