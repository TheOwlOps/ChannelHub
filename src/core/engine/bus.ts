import { EventEmitter } from "node:events";
import type { ChannelStatus, UnifiedMessage } from "../contracts/types";

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
    // Node's EventEmitter throws when "error" is emitted with no listeners.
    // Error reporting must never crash the pipeline it is reporting on (it
    // previously prevented the hub's dead-letter handling from running).
    if (this.listenerCount("error") === 0) return false;
    return this.emit("error", err);
  }

  emitStatus(status: ChannelStatus): boolean {
    return this.emit("status", status);
  }
}
