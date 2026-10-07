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

  /**
   * Scrapes recent conversations and groups from the Messenger sidebar.
   * Extracts the thread ID (chatId/userId), conversation name, and avatar image URL.
   */
  async getThreads(
    limit: number = 30
  ): Promise<Array<{ id: string; name: string; avatarUrl?: string }>> {
    if (!this.isConnected() || !this._activePage) {
      throw new Error("MessengerPersonalAdapter is not connected");
    }

    return await this._activePage.evaluate((max: number) => {
      const links = Array.from(document.querySelectorAll("a[href*='/t/']"));
      const seen = new Set<string>();
      const list: Array<{ id: string; name: string; avatarUrl?: string }> = [];

      for (const a of links) {
        const href = a.getAttribute("href") || "";
        const match = href.match(/\/t\/([a-zA-Z0-9._]+)/);
        if (match && match[1]) {
          const id = match[1];
          if (!seen.has(id)) {
            seen.add(id);
            const titleEl = a.querySelector("span[dir='auto'], div[dir='auto']");
            const name = titleEl?.textContent?.trim() || a.getAttribute("aria-label") || id;
            const imgEl = a.querySelector("img");
            const avatarUrl = imgEl?.getAttribute("src") || undefined;
            list.push({ id, name, avatarUrl });
            if (list.length >= max) break;
          }
        }
      }
      return list;
    }, limit);
  }

  /**
   * Scrapes recent chat messages from a specific Messenger thread, including image attachments.
   */
  async getThreadHistory(
    threadId: string,
    limit: number = 20
  ): Promise<Array<{ text: string; sender?: string; images?: string[] }>> {
    if (!this.isConnected() || !this._activePage) {
      throw new Error("MessengerPersonalAdapter is not connected");
    }

    const targetUrl = `https://www.messenger.com/t/${threadId}`;
    if (this._activePage.url() !== targetUrl) {
      await this._activePage.goto(targetUrl, { waitUntil: "domcontentloaded" });
    }

    return await this._activePage.evaluate((max: number) => {
      const rows = Array.from(
        document.querySelectorAll("div[role='row'], div[role='main'] div[dir='auto']")
      );
      const messages: Array<{ text: string; sender?: string; images?: string[] }> = [];

      for (const row of rows) {
        const text = row.textContent?.trim() || "";
        const imgEls = Array.from(
          row.querySelectorAll("img[src*='fbcdn'], img[src*='scontent'], img[role='presentation']")
        );
        const images = imgEls
          .map((img) => img.getAttribute("src"))
          .filter(Boolean) as string[];

        if ((text.length > 0 || images.length > 0) && !messages.some((m) => m.text === text && text.length > 0)) {
          const sender = row.getAttribute("aria-label") || undefined;
          messages.push({
            text,
            sender,
            images: images.length > 0 ? images : undefined,
          });
          if (messages.length >= max) break;
        }
      }
      return messages;
    }, limit);
  }

  /**
   * Attempts to extract visible group member names, IDs, and avatar images for a thread.
   */
  async getGroupMembers(
    threadId: string
  ): Promise<Array<{ name: string; id?: string; avatarUrl?: string }>> {
    if (!this.isConnected() || !this._activePage) {
      throw new Error("MessengerPersonalAdapter is not connected");
    }

    const targetUrl = `https://www.messenger.com/t/${threadId}`;
    if (this._activePage.url() !== targetUrl) {
      await this._activePage.goto(targetUrl, { waitUntil: "domcontentloaded" });
    }

    return await this._activePage.evaluate(() => {
      const memberLinks = Array.from(
        document.querySelectorAll(
          "div[role='complementary'] a[href*='facebook.com'], div[role='main'] a[role='link']"
        )
      );
      const seen = new Set<string>();
      const members: Array<{ name: string; id?: string; avatarUrl?: string }> = [];

      for (const link of memberLinks) {
        const href = link.getAttribute("href") || "";
        const name = link.textContent?.trim();
        if (name && !seen.has(name) && !href.includes("/t/")) {
          seen.add(name);
          const idMatch = href.match(/facebook\.com\/([a-zA-Z0-9.]+)/);
          const imgEl = link.querySelector("img") || link.closest("div")?.querySelector("img");
          const avatarUrl = imgEl?.getAttribute("src") || undefined;
          members.push({
            name,
            id: idMatch ? idMatch[1] : undefined,
            avatarUrl,
          });
        }
      }
      return members;
    });
  }

  /**
   * Retrieves profile details (name, avatar, ID) for a user or thread.
   */
  async getUserProfile(
    userId: string
  ): Promise<{ id: string; name: string; avatarUrl?: string }> {
    if (!this.isConnected() || !this._activePage) {
      throw new Error("MessengerPersonalAdapter is not connected");
    }

    const targetUrl = `https://www.messenger.com/t/${userId}`;
    if (this._activePage.url() !== targetUrl) {
      await this._activePage.goto(targetUrl, { waitUntil: "domcontentloaded" });
    }

    return await this._activePage.evaluate((uid: string) => {
      const headerEl = document.querySelector(
        "div[role='main'] header h1, div[role='main'] header span, div[role='complementary'] h2"
      );
      const name = headerEl?.textContent?.trim() || uid;
      const imgEl = document.querySelector(
        "div[role='main'] header img, div[role='complementary'] img"
      );
      const avatarUrl = imgEl?.getAttribute("src") || undefined;
      return { id: uid, name, avatarUrl };
    }, userId);
  }

  /**
   * Unsends / recalls the most recent message sent by the bot in the current chat.
   */
  async recallMessage(chatId?: string): Promise<boolean> {
    if (!this.isConnected() || !this._activePage) {
      throw new Error("MessengerPersonalAdapter is not connected");
    }

    if (chatId) {
      const targetUrl = `https://www.messenger.com/t/${chatId}`;
      if (this._activePage.url() !== targetUrl) {
        await this._activePage.goto(targetUrl, { waitUntil: "domcontentloaded" });
      }
    }

    return await this._activePage.evaluate(async () => {
      const rows = Array.from(document.querySelectorAll("div[role='row']"));
      const lastRow = rows[rows.length - 1];
      if (!lastRow) return false;

      // Hover over row to display floating actions
      lastRow.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));

      const moreBtn = lastRow.querySelector(
        "div[aria-label*='More'], div[aria-label*='Xem thêm'], div[aria-label*='Khác'], div[aria-label*='Hành động khác']"
      ) as HTMLElement;

      if (moreBtn) {
        moreBtn.click();
        await new Promise((r) => setTimeout(r, 400));

        const menuItems = Array.from(document.querySelectorAll("div[role='menuitem']"));
        const removeOption = menuItems.find((el) =>
          /remove|gỡ|thu hồi|unsend/i.test(el.textContent || "")
        ) as HTMLElement;

        if (removeOption) {
          removeOption.click();
          await new Promise((r) => setTimeout(r, 400));

          const dialogBtns = Array.from(
            document.querySelectorAll("div[role='dialog'] div[role='button']")
          );
          const confirmBtn = dialogBtns.find((el) =>
            /unsend|thu hồi|remove for everyone/i.test(el.textContent || "")
          ) as HTMLElement;

          if (confirmBtn) {
            confirmBtn.click();
            return true;
          }
        }
      }
      return false;
    });
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
