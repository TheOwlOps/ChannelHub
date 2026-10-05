import fs from "node:fs";
import path from "node:path";
import { BaseChannel } from "../../core/adapter";
import type {
  ChannelType,
  MediaPayload,
  SendOptions,
  SentMessageResult,
  UnifiedMessage,
} from "../../core/types";
import type { MessengerPersonalConfig } from "./types";

/**
 * MessengerPersonalAdapter
 * Automates personal Facebook/Messenger accounts via Playwright Persistent Browser Context.
 * Avoids Meta security checkpoints by running a real Chromium profile with human-like typing emulation.
 */
export class MessengerPersonalAdapter extends BaseChannel {
  readonly name: ChannelType = "messenger";
  private _config: MessengerPersonalConfig;
  private _browserContext: any = null;
  private _activePage: any = null;
  private _recentSentTimestamps: number[] = [];

  constructor(config: MessengerPersonalConfig = {}) {
    super();
    this._config = {
      headless: config.headless ?? true,
      humanTypingDelayMs: config.humanTypingDelayMs ?? 30,
      maxMessagesPerMinute: config.maxMessagesPerMinute ?? 15,
      ...config,
    };
  }

  async connect(signal?: AbortSignal): Promise<void> {
    if (signal?.aborted) throw new Error("Connection aborted");

    let playwright: any;
    try {
      playwright = await import("playwright");
    } catch {
      throw new Error(
        "Playwright is required for MessengerPersonalAdapter. Install with: bun add -d playwright / npm install playwright"
      );
    }

    const { chromium } = playwright;
    const userDataDir =
      this._config.userDataDir ||
      path.resolve(process.cwd(), ".messenger-profile");

    this._browserContext = await chromium.launchPersistentContext(userDataDir, {
      headless: this._config.headless,
      args: [
        "--disable-blink-features=AutomationControlled",
        "--disable-notifications",
        "--no-sandbox",
      ],
      viewport: { width: 1280, height: 800 },
    });

    // Check credentials JSON fallback if cookies exist
    const credPath =
      this._config.credentialsPath ||
      path.resolve(process.cwd(), "messenger.credentials.json");

    if (fs.existsSync(credPath)) {
      try {
        const raw = fs.readFileSync(credPath, "utf-8");
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.cookies)) {
          await this._browserContext.addCookies(parsed.cookies);
        }
      } catch {
        // Continue with persistent session
      }
    }

    this._activePage = await this._browserContext.newPage();
    await this._activePage.goto("https://www.messenger.com/", {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });

    const currentUrl = this._activePage.url();
    if (currentUrl.includes("/login") || currentUrl.includes("/checkpoint")) {
      await this.disconnect();
      throw new Error(
        "Messenger personal session is not authenticated or hit checkpoint. Run 'channelhub login:messenger' first."
      );
    }

    this.setConnected(true);
    await this.setupInboundListener();
  }

  private async setupInboundListener(): Promise<void> {
    if (!this._activePage) return;

    // Expose binding to receive messages from browser DOM context
    await this._activePage.exposeFunction("__ch_on_message", (data: any) => {
      if (!data || !data.text) return;
      const unified: UnifiedMessage = {
        id: `msg_ps_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        channel: "messenger",
        chat: {
          id: data.chatId || "unknown",
          type: "dm",
        },
        sender: {
          id: data.senderId || "unknown",
          name: data.senderName || "Personal User",
        },
        content: {
          text: data.text,
        },
        timestamp: Date.now(),
        raw: data,
      };
      this.dispatchMessage(unified);
    });

    // Inject DOM MutationObserver to detect incoming messages on Messenger
    await this._activePage.evaluate(() => {
      const observer = new MutationObserver((mutations) => {
        for (const mut of mutations) {
          for (const node of Array.from(mut.addedNodes)) {
            if ((node as HTMLElement)?.querySelector) {
              const textEl = (node as HTMLElement).querySelector(
                'div[dir="auto"][role="none"]'
              );
              if (textEl && textEl.textContent) {
                // Extracted message bubble
                const urlParts = window.location.pathname.split("/");
                const chatId = urlParts[urlParts.length - 1] || "unknown";
                (window as any).__ch_on_message({
                  chatId,
                  text: textEl.textContent,
                  senderName: "Messenger Contact",
                });
              }
            }
          }
        }
      });

      const root = document.querySelector('[role="main"]') || document.body;
      observer.observe(root, { childList: true, subtree: true });
    });
  }

  private checkRateLimit(): void {
    const now = Date.now();
    const windowStart = now - 60000;
    this._recentSentTimestamps = this._recentSentTimestamps.filter(
      (ts) => ts > windowStart
    );
    if (
      this._recentSentTimestamps.length >=
      (this._config.maxMessagesPerMinute || 15)
    ) {
      throw new Error(
        `Rate limit exceeded: Personal Messenger allows max ${this._config.maxMessagesPerMinute} msgs/min to avoid checkpoint.`
      );
    }
    this._recentSentTimestamps.push(now);
  }

  async sendText(
    chatId: string,
    text: string,
    options?: SendOptions
  ): Promise<SentMessageResult> {
    if (!this.isConnected() || !this._activePage) {
      throw new Error("MessengerPersonalAdapter is not connected");
    }

    if (options?.signal?.aborted) {
      throw new Error("Send aborted");
    }

    this.checkRateLimit();

    const targetUrl = `https://www.messenger.com/t/${chatId}`;
    if (!this._activePage.url().includes(`/t/${chatId}`)) {
      await this._activePage.goto(targetUrl, {
        waitUntil: "domcontentloaded",
        timeout: 20000,
      });
    }

    // Locate contenteditable message input
    const inputSelector =
      'div[role="textbox"][contenteditable="true"], div[aria-label="Message"][contenteditable="true"]';
    await this._activePage.waitForSelector(inputSelector, { timeout: 10000 });
    await this._activePage.click(inputSelector);

    // Human-like typing emulation
    const delay = this._config.humanTypingDelayMs || 30;
    await this._activePage.type(inputSelector, text, { delay });

    // Press Enter to send
    await this._activePage.keyboard.press("Enter");

    const messageId = `mid_ps_${Date.now()}`;
    return {
      messageId,
      chatId,
      timestamp: Date.now(),
    };
  }

  async sendMedia(
    chatId: string,
    media: MediaPayload,
    options?: SendOptions
  ): Promise<SentMessageResult> {
    throw new Error(
      "Direct file upload on personal Messenger is disabled in safe mode to prevent account checkpoints. Use sendText or Page Graph API."
    );
  }

  async disconnect(): Promise<void> {
    this.setConnected(false);
    if (this._browserContext) {
      try {
        await this._browserContext.close();
      } catch {
        // Ignore close errors
      }
      this._browserContext = null;
      this._activePage = null;
    }
  }
}
