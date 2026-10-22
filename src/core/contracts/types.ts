export type ChannelType = "zalo" | "telegram" | "discord" | "slack" | "messenger" | string;
export type ChatType = "dm" | "group" | "channel";
export type MediaType = "image" | "video" | "audio" | "file" | "sticker" | "animation";

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
  /** Abstract UI components (buttons, links) to attach to the message */
  actions?: ActionNode[];
  signal?: AbortSignal;
}

/** Abstract representation of interactive UI elements. */
export type ActionNode = ActionButton | ActionLink;

export interface ActionButton {
  type: "button";
  /** Unique payload to return via webhook when clicked */
  payload: string;
  /** Visible label on the button */
  label: string;
}

export interface ActionLink {
  type: "link";
  /** URL to open when clicked */
  url: string;
  /** Visible label on the button */
  label: string;
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

export interface ChannelCapabilities {
  readonly inbound: boolean;
  readonly outbound: boolean;
  readonly media: readonly MediaType[];
  readonly reactions: boolean;
  readonly editing: boolean;
  readonly typing: boolean;
  readonly mode: "polling" | "webhook" | "gateway" | "outbound-only";
}

export interface IChannelAdapter {
  readonly name: ChannelType;
  readonly provider?: ChannelType;
  readonly accountId?: string;
  readonly capabilities?: ChannelCapabilities;

  connect(signal?: AbortSignal): Promise<void>;
  disconnect(signal?: AbortSignal): Promise<void>;
  isConnected(): boolean;

  sendText(chatId: string, text: string, options?: SendOptions): Promise<SentMessageResult>;
  sendMedia(chatId: string, media: MediaPayload, options?: SendOptions): Promise<SentMessageResult>;
  sendGif?(chatId: string, urlOrPath: string, caption?: string, options?: SendOptions): Promise<SentMessageResult>;
  sendSticker?(chatId: string, stickerIdOrUrl: string, options?: SendOptions): Promise<SentMessageResult>;
  addReaction?(chatId: string, messageId: string, emoji: string, options?: { signal?: AbortSignal }): Promise<void>;
  sendTyping?(chatId: string, options?: { signal?: AbortSignal }): Promise<void>;
  editText?(chatId: string, messageId: string, text: string, options?: { signal?: AbortSignal }): Promise<SentMessageResult>;

  on(event: "message", handler: (msg: UnifiedMessage) => Promise<void> | void): this;
  on(event: "error", handler: (err: Error) => void): this;
  on(event: "status", handler: (status: ChannelStatus) => void): this;
}
