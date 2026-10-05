import { BaseChannel } from "../../core/adapter";
import type { ChannelType, MediaPayload, SendOptions, SentMessageResult } from "../../core/types";
import type { MessengerPersonalConfig } from "./types";
/**
 * MessengerPersonalAdapter
 * Automates personal Facebook/Messenger accounts via Playwright Persistent Browser Context.
 * Avoids Meta security checkpoints by running a real Chromium profile with human-like typing emulation.
 */
export declare class MessengerPersonalAdapter extends BaseChannel {
    readonly name: ChannelType;
    private _config;
    private _browserContext;
    private _activePage;
    private _recentSentTimestamps;
    constructor(config?: MessengerPersonalConfig);
    connect(signal?: AbortSignal): Promise<void>;
    private setupInboundListener;
    private checkRateLimit;
    sendText(chatId: string, text: string, options?: SendOptions): Promise<SentMessageResult>;
    sendMedia(chatId: string, media: MediaPayload, options?: SendOptions): Promise<SentMessageResult>;
    disconnect(): Promise<void>;
}
