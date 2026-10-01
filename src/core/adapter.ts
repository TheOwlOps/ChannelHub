import { EventEmitter } from "node:events";
import type {
  ChannelStatus,
  ChannelType,
  IChannelAdapter,
  MediaPayload,
  SendOptions,
  SentMessageResult,
  UnifiedMessage,
} from "./types";

export abstract class BaseChannel extends EventEmitter implements IChannelAdapter {
  abstract readonly name: ChannelType;
  private _connected = false;

  isConnected(): boolean {
    return this._connected;
  }

  protected setConnected(value: boolean): void {
    const changed = this._connected !== value;
    this._connected = value;
    if (changed) {
      this.emit("status", value ? "connected" : "disconnected");
    }
  }

  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract sendText(chatId: string, text: string, options?: SendOptions): Promise<SentMessageResult>;
  abstract sendMedia(chatId: string, media: MediaPayload, options?: SendOptions): Promise<SentMessageResult>;

  async sendGif(chatId: string, urlOrPath: string, caption?: string, options?: SendOptions): Promise<SentMessageResult> {
    return this.sendMedia(
      chatId,
      {
        type: "animation",
        source: urlOrPath,
        caption,
      },
      options
    );
  }

  async sendSticker(chatId: string, stickerIdOrUrl: string, options?: SendOptions): Promise<SentMessageResult> {
    return this.sendMedia(
      chatId,
      {
        type: "sticker",
        source: stickerIdOrUrl,
      },
      options
    );
  }
}
