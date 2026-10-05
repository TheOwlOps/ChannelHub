export interface HandoffState {
  chatId: string;
  channel: string;
  pausedUntil: number; // Unix timestamp ms
  reason?: string;
}

/**
 * Human Takeover / Handoff Manager.
 * Pauses AI processing for specific chats, allowing human agents to intervene without bot interruptions.
 */
export class HumanHandoffManager {
  private _states = new Map<string, HandoffState>();

  private _getKey(channel: string, chatId: string): string {
    return `${channel}:${chatId}`;
  }

  /**
   * Pause AI from responding to this chat.
   * @param durationMs Duration in ms (defaults to 1 hour; pass Infinity for indefinite)
   */
  public pause(channel: string, chatId: string, durationMs = 3600_000, reason?: string): void {
    const key = this._getKey(channel, chatId);
    const pausedUntil = durationMs === Infinity ? Infinity : Date.now() + durationMs;
    this._states.set(key, { chatId, channel, pausedUntil, reason });
  }

  /**
   * Resume AI operation for this chat immediately.
   */
  public resume(channel: string, chatId: string): boolean {
    const key = this._getKey(channel, chatId);
    return this._states.delete(key);
  }

  /**
   * Check if a chat is currently handed off to a human.
   */
  public isPaused(channel: string, chatId: string): boolean {
    const key = this._getKey(channel, chatId);
    const state = this._states.get(key);
    if (!state) return false;

    if (state.pausedUntil !== Infinity && Date.now() > state.pausedUntil) {
      this._states.delete(key);
      return false; // Expired
    }
    return true;
  }

  public getState(channel: string, chatId: string): HandoffState | undefined {
    if (!this.isPaused(channel, chatId)) return undefined;
    return this._states.get(this._getKey(channel, chatId));
  }
}
