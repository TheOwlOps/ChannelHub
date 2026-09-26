import type { IChannelAdapter, SendOptions, SentMessageResult } from "./types";

export interface StreamOptions {
  editDebounceMs?: number;
  typingIntervalMs?: number;
  chunkMode?: "sentence" | "accumulate";
  minSentenceLength?: number;
  initialPlaceholder?: string;
}

export class SmartStreamer {
  private adapter: IChannelAdapter;
  private options: Required<StreamOptions>;

  constructor(adapter: IChannelAdapter, options: StreamOptions = {}) {
    this.adapter = adapter;
    this.options = {
      editDebounceMs: 1000,
      typingIntervalMs: 4000,
      chunkMode: "sentence",
      minSentenceLength: 60,
      initialPlaceholder: "...",
      ...options,
    };
  }

  async stream(
    chatId: string,
    tokenStream: AsyncIterable<string>,
    sendOptions?: SendOptions,
  ): Promise<SentMessageResult[]> {
    // 1. Start periodic typing indicator
    let typingActive = true;
    const triggerTyping = async () => {
      if (this.adapter.sendTyping) {
        try {
          await this.adapter.sendTyping(chatId);
        } catch {
          // ignore typing pulse errors
        }
      }
    };

    await triggerTyping();
    const typingTimer = setInterval(() => {
      if (typingActive) triggerTyping();
    }, this.options.typingIntervalMs);

    try {
      if (typeof this.adapter.editText === "function") {
        return await this.streamWithEdit(chatId, tokenStream, sendOptions);
      } else {
        return await this.streamWithoutEdit(chatId, tokenStream, sendOptions);
      }
    } finally {
      typingActive = false;
      clearInterval(typingTimer);
    }
  }

  private async streamWithEdit(
    chatId: string,
    tokenStream: AsyncIterable<string>,
    sendOptions?: SendOptions,
  ): Promise<SentMessageResult[]> {
    let accumulated = "";
    let sentMsg: SentMessageResult | null = null;
    let lastEditTime = 0;
    let pendingEditTimeout: any = null;

    const performEdit = async (text: string) => {
      if (sentMsg && this.adapter.editText) {
        await this.adapter.editText(chatId, sentMsg.messageId, text);
        lastEditTime = Date.now();
      }
    };

    for await (const chunk of tokenStream) {
      accumulated += chunk;

      if (!sentMsg) {
        // Send initial message as soon as first content arrives
        sentMsg = await this.adapter.sendText(
          chatId,
          accumulated.trim() || this.options.initialPlaceholder,
          sendOptions,
        );
        lastEditTime = Date.now();
        continue;
      }

      const now = Date.now();
      const elapsed = now - lastEditTime;

      if (elapsed >= this.options.editDebounceMs) {
        if (pendingEditTimeout) {
          clearTimeout(pendingEditTimeout);
          pendingEditTimeout = null;
        }
        await performEdit(accumulated);
      } else if (!pendingEditTimeout) {
        pendingEditTimeout = setTimeout(async () => {
          pendingEditTimeout = null;
          await performEdit(accumulated);
        }, this.options.editDebounceMs - elapsed);
      }
    }

    if (pendingEditTimeout) {
      clearTimeout(pendingEditTimeout);
      pendingEditTimeout = null;
    }

    // Final guaranteed edit with complete text
    if (sentMsg && accumulated) {
      await performEdit(accumulated);
      return [sentMsg];
    } else if (!sentMsg && accumulated) {
      const res = await this.adapter.sendText(chatId, accumulated, sendOptions);
      return [res];
    }

    return sentMsg ? [sentMsg] : [];
  }

  private async streamWithoutEdit(
    chatId: string,
    tokenStream: AsyncIterable<string>,
    sendOptions?: SendOptions,
  ): Promise<SentMessageResult[]> {
    const results: SentMessageResult[] = [];

    if (this.options.chunkMode === "accumulate") {
      let accumulated = "";
      for await (const chunk of tokenStream) {
        accumulated += chunk;
      }
      if (accumulated.trim()) {
        const res = await this.adapter.sendText(chatId, accumulated, sendOptions);
        results.push(res);
      }
      return results;
    }

    // Sentence mode: Buffer and dispatch natural sentence chunks
    let buffer = "";
    const sentenceEndRegex = /[.?!;\n]\s*$/;

    for await (const chunk of tokenStream) {
      buffer += chunk;

      if (
        buffer.length >= this.options.minSentenceLength &&
        sentenceEndRegex.test(buffer.trimEnd())
      ) {
        const textToSend = buffer.trim();
        if (textToSend) {
          const res = await this.adapter.sendText(chatId, textToSend, sendOptions);
          results.push(res);
          buffer = "";
        }
      }
    }

    if (buffer.trim()) {
      const res = await this.adapter.sendText(chatId, buffer.trim(), sendOptions);
      results.push(res);
    }

    return results;
  }
}
