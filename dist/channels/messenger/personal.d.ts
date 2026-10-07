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
    /**
     * Scrapes recent conversations and groups from the Messenger sidebar.
     * Extracts the thread ID (chatId/userId), conversation name, and avatar image URL.
     */
    getThreads(limit?: number): Promise<Array<{
        id: string;
        name: string;
        avatarUrl?: string;
    }>>;
    /**
     * Scrapes recent chat messages from a specific Messenger thread, including image attachments.
     */
    getThreadHistory(threadId: string, limit?: number): Promise<Array<{
        text: string;
        sender?: string;
        images?: string[];
    }>>;
    /**
     * Attempts to extract visible group member names, IDs, and avatar images for a thread.
     */
    getGroupMembers(threadId: string): Promise<Array<{
        name: string;
        id?: string;
        avatarUrl?: string;
    }>>;
    /**
     * Retrieves profile details (name, avatar, ID) for a user or thread.
     */
    getUserProfile(userId: string): Promise<{
        id: string;
        name: string;
        avatarUrl?: string;
    }>;
    /**
     * Unsends / recalls the most recent message sent by the bot in the current chat.
     */
    recallMessage(chatId?: string): Promise<boolean>;
    disconnect(): Promise<void>;
}
