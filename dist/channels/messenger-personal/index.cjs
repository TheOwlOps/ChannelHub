var __create = Object.create;
var __getProtoOf = Object.getPrototypeOf;
var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __hasOwnProp = Object.prototype.hasOwnProperty;
function __accessProp(key) {
  return this[key];
}
var __toESMCache_node;
var __toESMCache_esm;
var __toESM = (mod, isNodeMode, target) => {
  var canCache = mod != null && typeof mod === "object";
  if (canCache) {
    var cache = isNodeMode ? __toESMCache_node ??= new WeakMap : __toESMCache_esm ??= new WeakMap;
    var cached = cache.get(mod);
    if (cached)
      return cached;
  }
  target = mod != null ? __create(__getProtoOf(mod)) : {};
  const to = isNodeMode || !mod || !mod.__esModule || !__hasOwnProp.call(mod, "default") ? __defProp(target, "default", { value: mod, enumerable: true }) : target;
  if (mod && typeof mod === "object" || typeof mod === "function") {
    for (let key of __getOwnPropNames(mod))
      if (!__hasOwnProp.call(to, key))
        __defProp(to, key, {
          get: __accessProp.bind(mod, key),
          enumerable: true
        });
  }
  if (canCache)
    cache.set(mod, to);
  return to;
};
var __toCommonJS = (from) => {
  var entry = (__moduleCache ??= new WeakMap).get(from), desc;
  if (entry)
    return entry;
  entry = __defProp({}, "__esModule", { value: true });
  if (from && typeof from === "object" || typeof from === "function") {
    for (var key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(entry, key))
        __defProp(entry, key, {
          get: __accessProp.bind(from, key),
          enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
        });
  }
  __moduleCache.set(from, entry);
  return entry;
};
var __moduleCache;
var __returnValue = (v) => v;
function __exportSetter(name, newValue) {
  this[name] = __returnValue.bind(null, newValue);
}
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, {
      get: all[name],
      enumerable: true,
      configurable: true,
      set: __exportSetter.bind(all, name)
    });
};

// src/channels/messenger-personal/index.ts
var exports_messenger_personal = {};
__export(exports_messenger_personal, {
  MessengerPersonalAdapter: () => MessengerPersonalAdapter
});
module.exports = __toCommonJS(exports_messenger_personal);

// src/channels/messenger-personal/adapter.ts
var import_node_fs = __toESM(require("node:fs"), 1);
var import_node_path = __toESM(require("node:path"), 1);

// src/core/contracts/adapter.ts
var import_node_events = require("node:events");

class BaseChannel extends import_node_events.EventEmitter {
  get provider() {
    return this.name;
  }
  async dispatchMessage(msg) {
    const listeners = this.listeners("message");
    for (const listener of listeners) {
      try {
        await listener(msg);
      } catch (err) {
        this.emit("error", err);
      }
    }
  }
  get accountId() {
    return this.config?.accountId || "default";
  }
  _connected = false;
  isConnected() {
    return this._connected;
  }
  setConnected(value) {
    const changed = this._connected !== value;
    this._connected = value;
    if (changed) {
      this.emit("status", value ? "connected" : "disconnected");
    }
  }
  assertNotAborted(signal) {
    if (signal?.aborted) {
      throw signal.reason || new Error("Operation aborted");
    }
  }
  async sendGif(chatId, urlOrPath, caption, options) {
    return this.sendMedia(chatId, {
      type: "animation",
      source: urlOrPath,
      caption
    }, options);
  }
  async sendSticker(chatId, stickerIdOrUrl, options) {
    return this.sendMedia(chatId, {
      type: "sticker",
      source: stickerIdOrUrl
    }, options);
  }
}

// src/channels/messenger-personal/adapter.ts
class MessengerPersonalAdapter extends BaseChannel {
  name = "messenger";
  _config;
  _browserContext = null;
  _activePage = null;
  _recentSentTimestamps = [];
  constructor(config = {}) {
    super();
    this._config = {
      headless: config.headless ?? true,
      humanTypingDelayMs: config.humanTypingDelayMs ?? 30,
      maxMessagesPerMinute: config.maxMessagesPerMinute ?? 15,
      ...config
    };
  }
  async connect(signal) {
    if (signal?.aborted)
      throw new Error("Connection aborted");
    let playwright;
    try {
      playwright = await import("playwright");
    } catch {
      throw new Error("Playwright is required for MessengerPersonalAdapter. Install with: bun add -d playwright / npm install playwright");
    }
    const { chromium } = playwright;
    const userDataDir = this._config.userDataDir || import_node_path.default.resolve(process.cwd(), ".messenger-profile");
    this._browserContext = await chromium.launchPersistentContext(userDataDir, {
      headless: this._config.headless,
      args: [
        "--disable-blink-features=AutomationControlled",
        "--disable-notifications",
        "--no-sandbox"
      ],
      viewport: { width: 1280, height: 800 }
    });
    const credPath = this._config.credentialsPath || import_node_path.default.resolve(process.cwd(), "messenger.credentials.json");
    if (import_node_fs.default.existsSync(credPath)) {
      try {
        const raw = import_node_fs.default.readFileSync(credPath, "utf-8");
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.cookies)) {
          await this._browserContext.addCookies(parsed.cookies);
        }
      } catch {}
    }
    this._activePage = await this._browserContext.newPage();
    await this._activePage.goto("https://www.messenger.com/", {
      waitUntil: "domcontentloaded",
      timeout: 30000
    });
    const currentUrl = this._activePage.url();
    if (currentUrl.includes("/login") || currentUrl.includes("/checkpoint")) {
      await this.disconnect();
      throw new Error("Messenger personal session is not authenticated or hit checkpoint. Run 'channelhub login:messenger' first.");
    }
    this.setConnected(true);
    await this.setupInboundListener();
  }
  async setupInboundListener() {
    if (!this._activePage)
      return;
    await this._activePage.exposeFunction("__ch_on_message", (data) => {
      if (!data || !data.text)
        return;
      const unified = {
        id: `msg_ps_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        channel: "messenger",
        chat: {
          id: data.chatId || "unknown",
          type: "dm"
        },
        sender: {
          id: data.senderId || "unknown",
          name: data.senderName || "Personal User"
        },
        content: {
          text: data.text
        },
        timestamp: Date.now(),
        raw: data
      };
      this.dispatchMessage(unified);
    });
    await this._activePage.evaluate(() => {
      const observer = new MutationObserver((mutations) => {
        for (const mut of mutations) {
          for (const node of Array.from(mut.addedNodes)) {
            if (node?.querySelector) {
              const textEl = node.querySelector('div[dir="auto"][role="none"]');
              if (textEl && textEl.textContent) {
                const urlParts = window.location.pathname.split("/");
                const chatId = urlParts[urlParts.length - 1] || "unknown";
                window.__ch_on_message({
                  chatId,
                  text: textEl.textContent,
                  senderName: "Messenger Contact"
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
  checkRateLimit() {
    const now = Date.now();
    const windowStart = now - 60000;
    this._recentSentTimestamps = this._recentSentTimestamps.filter((ts) => ts > windowStart);
    if (this._recentSentTimestamps.length >= (this._config.maxMessagesPerMinute || 15)) {
      throw new Error(`Rate limit exceeded: Personal Messenger allows max ${this._config.maxMessagesPerMinute} msgs/min to avoid checkpoint.`);
    }
    this._recentSentTimestamps.push(now);
  }
  async sendText(chatId, text, options) {
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
        timeout: 20000
      });
    }
    const inputSelector = 'div[role="textbox"][contenteditable="true"], div[aria-label="Message"][contenteditable="true"]';
    await this._activePage.waitForSelector(inputSelector, { timeout: 1e4 });
    await this._activePage.click(inputSelector);
    const delay = this._config.humanTypingDelayMs || 30;
    await this._activePage.type(inputSelector, text, { delay });
    await this._activePage.keyboard.press("Enter");
    const messageId = `mid_ps_${Date.now()}`;
    return {
      messageId,
      chatId,
      timestamp: Date.now()
    };
  }
  async sendMedia(chatId, media, options) {
    throw new Error("Direct file upload on personal Messenger is disabled in safe mode to prevent account checkpoints. Use sendText or Page Graph API.");
  }
  async getThreads(limit = 30) {
    if (!this.isConnected() || !this._activePage) {
      throw new Error("MessengerPersonalAdapter is not connected");
    }
    return await this._activePage.evaluate((max) => {
      const links = Array.from(document.querySelectorAll("a[href*='/t/']"));
      const seen = new Set;
      const list = [];
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
            if (list.length >= max)
              break;
          }
        }
      }
      return list;
    }, limit);
  }
  async getThreadHistory(threadId, limit = 20) {
    if (!this.isConnected() || !this._activePage) {
      throw new Error("MessengerPersonalAdapter is not connected");
    }
    const targetUrl = `https://www.messenger.com/t/${threadId}`;
    if (this._activePage.url() !== targetUrl) {
      await this._activePage.goto(targetUrl, { waitUntil: "domcontentloaded" });
    }
    return await this._activePage.evaluate((max) => {
      const rows = Array.from(document.querySelectorAll("div[role='row'], div[role='main'] div[dir='auto']"));
      const messages = [];
      for (const row of rows) {
        const text = row.textContent?.trim() || "";
        const imgEls = Array.from(row.querySelectorAll("img[src*='fbcdn'], img[src*='scontent'], img[role='presentation']"));
        const images = imgEls.map((img) => img.getAttribute("src")).filter(Boolean);
        if ((text.length > 0 || images.length > 0) && !messages.some((m) => m.text === text && text.length > 0)) {
          const sender = row.getAttribute("aria-label") || undefined;
          messages.push({
            text,
            sender,
            images: images.length > 0 ? images : undefined
          });
          if (messages.length >= max)
            break;
        }
      }
      return messages;
    }, limit);
  }
  async getGroupMembers(threadId) {
    if (!this.isConnected() || !this._activePage) {
      throw new Error("MessengerPersonalAdapter is not connected");
    }
    const targetUrl = `https://www.messenger.com/t/${threadId}`;
    if (this._activePage.url() !== targetUrl) {
      await this._activePage.goto(targetUrl, { waitUntil: "domcontentloaded" });
    }
    return await this._activePage.evaluate(() => {
      const memberLinks = Array.from(document.querySelectorAll("div[role='complementary'] a[href*='facebook.com'], div[role='main'] a[role='link']"));
      const seen = new Set;
      const members = [];
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
            avatarUrl
          });
        }
      }
      return members;
    });
  }
  async getUserProfile(userId) {
    if (!this.isConnected() || !this._activePage) {
      throw new Error("MessengerPersonalAdapter is not connected");
    }
    const targetUrl = `https://www.messenger.com/t/${userId}`;
    if (this._activePage.url() !== targetUrl) {
      await this._activePage.goto(targetUrl, { waitUntil: "domcontentloaded" });
    }
    return await this._activePage.evaluate((uid) => {
      const headerEl = document.querySelector("div[role='main'] header h1, div[role='main'] header span, div[role='complementary'] h2");
      const name = headerEl?.textContent?.trim() || uid;
      const imgEl = document.querySelector("div[role='main'] header img, div[role='complementary'] img");
      const avatarUrl = imgEl?.getAttribute("src") || undefined;
      return { id: uid, name, avatarUrl };
    }, userId);
  }
  async recallMessage(chatId) {
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
      if (!lastRow)
        return false;
      lastRow.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
      const moreBtn = lastRow.querySelector("div[aria-label*='More'], div[aria-label*='Xem thêm'], div[aria-label*='Khác'], div[aria-label*='Hành động khác']");
      if (moreBtn) {
        moreBtn.click();
        await new Promise((r) => setTimeout(r, 400));
        const menuItems = Array.from(document.querySelectorAll("div[role='menuitem']"));
        const removeOption = menuItems.find((el) => /remove|gỡ|thu hồi|unsend/i.test(el.textContent || ""));
        if (removeOption) {
          removeOption.click();
          await new Promise((r) => setTimeout(r, 400));
          const dialogBtns = Array.from(document.querySelectorAll("div[role='dialog'] div[role='button']"));
          const confirmBtn = dialogBtns.find((el) => /unsend|thu hồi|remove for everyone/i.test(el.textContent || ""));
          if (confirmBtn) {
            confirmBtn.click();
            return true;
          }
        }
      }
      return false;
    });
  }
  async disconnect() {
    this.setConnected(false);
    if (this._browserContext) {
      try {
        await this._browserContext.close();
      } catch {}
      this._browserContext = null;
      this._activePage = null;
    }
  }
}
