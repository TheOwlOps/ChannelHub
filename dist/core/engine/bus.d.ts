import { EventEmitter } from "node:events";
import type { ChannelStatus, UnifiedMessage } from "../contracts/types";
export interface ChannelEvents {
    message: [msg: UnifiedMessage];
    error: [err: Error];
    status: [status: ChannelStatus];
}
export declare class ChannelEventBus extends EventEmitter {
    emitMessage(msg: UnifiedMessage): boolean;
    emitError(err: Error): boolean;
    emitStatus(status: ChannelStatus): boolean;
}
