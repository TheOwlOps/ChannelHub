import type { IChannelAdapter, SendOptions, SentMessageResult } from "./types";
export interface StreamOptions {
    editDebounceMs?: number;
    typingIntervalMs?: number;
    chunkMode?: "sentence" | "accumulate";
    minSentenceLength?: number;
    initialPlaceholder?: string;
}
export declare class SmartStreamer {
    private adapter;
    private options;
    constructor(adapter: IChannelAdapter, options?: StreamOptions);
    stream(chatId: string, tokenStream: AsyncIterable<string>, sendOptions?: SendOptions): Promise<SentMessageResult[]>;
    private streamWithEdit;
    private streamWithoutEdit;
}
