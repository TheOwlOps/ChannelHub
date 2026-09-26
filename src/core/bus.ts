import { EventEmitter } from "node:events";
import type { ChannelStatus, UnifiedMessage } from "./types";

export interface ChannelEvents {
  message: [msg: UnifiedMessage];
  error: [err: Error];
  status: [status: ChannelStatus];
}

export class ChannelEventBus extends EventEmitter {
  emitMessage(msg: UnifiedMessage): boolean {
    return this.emit("message", msg);
  }

  emitError(err: Error): boolean {
    return this.emit("error", err);
  }

  emitStatus(status: ChannelStatus): boolean {
    return this.emit("status", status);
  }
}
