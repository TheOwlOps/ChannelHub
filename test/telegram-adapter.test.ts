import { describe, expect, test } from "bun:test";
import { TelegramChannelAdapter } from "../src/channels/telegram/adapter";
import type { UnifiedMessage } from "../src/core/types";

describe("TelegramChannelAdapter", () => {
  test("normalizes raw Telegram update payload into UnifiedMessage", () => {
    const adapter = new TelegramChannelAdapter({
      botToken: "mock-token",
      autoStart: false,
    });

    const rawUpdate = {
      update_id: 10001,
      message: {
        message_id: 777,
        from: {
          id: 123456,
          is_bot: false,
          first_name: "Mark",
          username: "mark_owl",
        },
        chat: {
          id: -1001234567,
          title: "OwlOps Dev",
          type: "supergroup",
        },
        date: 1727337600,
        text: "Hello from Telegram!",
      },
    };

    const unified = adapter.normalizeUpdate(rawUpdate);
    expect(unified).not.toBeNull();
    expect(unified?.id).toBe("777");
    expect(unified?.channel).toBe("telegram");
    expect(unified?.sender.id).toBe("123456");
    expect(unified?.sender.name).toBe("Mark");
    expect(unified?.sender.username).toBe("mark_owl");
    expect(unified?.chat.id).toBe("-1001234567");
    expect(unified?.chat.type).toBe("group");
    expect(unified?.content.text).toBe("Hello from Telegram!");
  });

  test("handles DM chat type and reply formatting", () => {
    const adapter = new TelegramChannelAdapter({
      botToken: "mock-token",
      autoStart: false,
    });

    const dmUpdate = {
      update_id: 10002,
      message: {
        message_id: 888,
        from: { id: 999, first_name: "Ryan" },
        chat: { id: 999, type: "private" },
        date: 1727337601,
        text: "Direct message",
      },
    };

    const unified = adapter.normalizeUpdate(dmUpdate);
    expect(unified?.chat.type).toBe("dm");
    expect(unified?.sender.id).toBe("999");
  });
});
