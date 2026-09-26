import { describe, expect, test } from "bun:test";
import { DiscordChannelAdapter } from "../src/channels/discord/adapter";

describe("DiscordChannelAdapter", () => {
  test("normalizes Discord message payload to UnifiedMessage", () => {
    const adapter = new DiscordChannelAdapter({ botToken: "mock-token" });

    const rawEvent = {
      id: "disc-999",
      channel_id: "chan-12345",
      guild_id: "guild-67890",
      content: "Hello Discord!",
      timestamp: "2026-09-26T00:00:00.000Z",
      author: {
        id: "usr-111",
        username: "owl_user",
        global_name: "Owl Developer",
        bot: false,
      },
    };

    const unified = adapter.normalizeEvent(rawEvent);
    expect(unified).not.toBeNull();
    expect(unified?.id).toBe("disc-999");
    expect(unified?.channel).toBe("discord");
    expect(unified?.sender.id).toBe("usr-111");
    expect(unified?.sender.name).toBe("Owl Developer");
    expect(unified?.chat.id).toBe("chan-12345");
    expect(unified?.chat.type).toBe("channel");
    expect(unified?.content.text).toBe("Hello Discord!");
  });

  test("normalizes DM message correctly", () => {
    const adapter = new DiscordChannelAdapter({ botToken: "mock-token" });

    const dmEvent = {
      id: "disc-dm-1",
      channel_id: "dm-channel-88",
      content: "Secret message",
      author: {
        id: "usr-222",
        username: "friend",
        bot: false,
      },
    };

    const unified = adapter.normalizeEvent(dmEvent);
    expect(unified?.chat.type).toBe("dm");
  });
});
