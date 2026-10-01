import { describe, expect, test, mock } from "bun:test";
import { SmartStreamer } from "../src/core/stream";
import type { IChannelAdapter } from "../src/core/types";

async function* makeTokens(tokens: string[], delayMs = 10) {
  for (const t of tokens) {
    if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));
    yield t;
  }
}

describe("SmartStreamer", () => {
  test("edits message periodically for adapters supporting editText (e.g. Telegram/Discord)", async () => {
    let sentId: string | null = null;
    const sendText = mock(async (_chatId: string, text: string) => {
      sentId = "m-initial";
      return { messageId: "m-initial", chatId: "c-1", timestamp: Date.now() };
    });
    const editText = mock(async (_chatId: string, _msgId: string, _text: string) => {
      return { messageId: "m-initial", chatId: "c-1", timestamp: Date.now() };
    });
    const sendTyping = mock(async () => undefined);

    const adapter: Partial<IChannelAdapter> = {
      name: "telegram",
      isConnected: () => true,
      sendText: sendText as any,
      editText: editText as any,
      sendTyping: sendTyping as any,
    };

    const streamer = new SmartStreamer(adapter as IChannelAdapter, {
      editDebounceMs: 20,
    });

    const results = await streamer.stream("c-1", makeTokens(["Hello", " world", " from", " AI."]));

    expect(sendTyping).toHaveBeenCalled();
    expect(sendText).toHaveBeenCalled();
    expect(editText).toHaveBeenCalled();
    expect(results.length).toBe(1);
    expect(results[0].messageId).toBe("m-initial");
  });

  test("chunks by sentence with typing indicator for non-editable channels (Zalo)", async () => {
    const sentMessages: string[] = [];
    const sendText = mock(async (_chatId: string, text: string) => {
      sentMessages.push(text);
      return { messageId: `msg-${sentMessages.length}`, chatId: "z-1", timestamp: Date.now() };
    });
    const sendTyping = mock(async () => undefined);

    const adapter: Partial<IChannelAdapter> = {
      name: "zalo",
      isConnected: () => true,
      sendText: sendText as any,
      sendTyping: sendTyping as any,
      // NO editText
    };

    const streamer = new SmartStreamer(adapter as IChannelAdapter, {
      chunkMode: "sentence",
      minSentenceLength: 10,
    });

    const tokens = [
      "First sentence ends here! ",
      "This is the second sentence. ",
      "Final closing paragraph completed.",
    ];

    const results = await streamer.stream("z-1", makeTokens(tokens, 5));

    expect(sendTyping).toHaveBeenCalled();
    expect(results.length).toBeGreaterThanOrEqual(2);
    expect(sentMessages.join(" ")).toContain("First sentence");
    expect(sentMessages.join(" ")).toContain("Final closing");
  });
});
