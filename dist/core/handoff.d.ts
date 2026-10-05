export interface HandoffState {
    chatId: string;
    channel: string;
    pausedUntil: number;
    reason?: string;
}
/**
 * Human Takeover / Handoff Manager.
 * Pauses AI processing for specific chats, allowing human agents to intervene without bot interruptions.
 */
export declare class HumanHandoffManager {
    private _states;
    private _getKey;
    /**
     * Pause AI from responding to this chat.
     * @param durationMs Duration in ms (defaults to 1 hour; pass Infinity for indefinite)
     */
    pause(channel: string, chatId: string, durationMs?: number, reason?: string): void;
    /**
     * Resume AI operation for this chat immediately.
     */
    resume(channel: string, chatId: string): boolean;
    /**
     * Check if a chat is currently handed off to a human.
     */
    isPaused(channel: string, chatId: string): boolean;
    getState(channel: string, chatId: string): HandoffState | undefined;
}
