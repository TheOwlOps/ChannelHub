import type { MessageContext } from "./context";
import type { UnifiedMessage } from "./types";

export interface DeadLetterItem {
  message: UnifiedMessage;
  error: Error;
  timestamp: number;
  retryCount: number;
  channel: string;
}

export type DeadLetterHandler = (item: DeadLetterItem) => Promise<void> | void;
