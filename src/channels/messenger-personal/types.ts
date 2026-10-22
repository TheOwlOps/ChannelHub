/** Configuration for the personal (Playwright-driven) Messenger adapter. */
export interface MessengerPersonalConfig {
  /** Directory containing Playwright persistent context profile, e.g. ./messenger-profile */
  userDataDir?: string;
  /** Path to exported messenger.credentials.json */
  credentialsPath?: string;
  /** Run browser in headless mode. Default: true */
  headless?: boolean;
  /** Human-like typing delay per character in ms. Default: 30 */
  humanTypingDelayMs?: number;
  /** Maximum messages allowed per minute to prevent rate limits. Default: 15 */
  maxMessagesPerMinute?: number;
}
