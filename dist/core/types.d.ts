export type ChannelType = "zalo" | "telegram" | "discord" | "slack" | string;
export type ChatType = "dm" | "group" | "channel";
export type MediaType = "image" | "video" | "audio" | "file";
export interface MediaAttachment {
    type: MediaType;
    url: string;
    filename?: string;
    mimeType?: string;
    size?: number;
}
export interface UnifiedMessage {
    id: string;
    channel: ChannelType;
    sender: {
        id: string;
        name?: string;
        username?: string;
        avatarUrl?: string;
        isBot?: boolean;
    };
    chat: {
        id: string;
        type: ChatType;
        title?: string;
    };
    content: {
        text: string;
        attachments?: MediaAttachment[];
        replyToId?: string;
    };
    raw: unknown;
    timestamp: number;
}
export interface SendOptions {
    replyToId?: string;
    quote?: boolean;
    metadata?: Record<string, unknown>;
}
export interface MediaPayload {
    type: MediaType;
    source: string | Buffer | Uint8Array;
    filename?: string;
    caption?: string;
    mimeType?: string;
}
export interface SentMessageResult {
    messageId: string;
    chatId: string;
    timestamp: number;
}
export type ChannelStatus = "connected" | "disconnected" | "reconnecting";
export interface IChannelAdapter {
    readonly name: ChannelType;
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    isConnected(): boolean;
    sendText(chatId: string, text: string, options?: SendOptions): Promise<SentMessageResult>;
    sendMedia(chatId: string, media: MediaPayload, options?: SendOptions): Promise<SentMessageResult>;
    addReaction?(chatId: string, messageId: string, emoji: string): Promise<void>;
    on(event: "message", handler: (msg: UnifiedMessage) => Promise<void> | void): this;
    on(event: "error", handler: (err: Error) => void): this;
    on(event: "status", handler: (status: ChannelStatus) => void): this;
}
