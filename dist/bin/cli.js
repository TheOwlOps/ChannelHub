#!/usr/bin/env node
var __esm = (fn, res, err) => () => {
  if (fn)
    try {
      res = fn(fn = 0);
    } catch (e) {
      err = [e];
    }
  if (err)
    throw err[0];
  return res;
};

// src/core/bus.ts
import { EventEmitter } from "node:events";
var ChannelEventBus;
var init_bus = __esm(() => {
  ChannelEventBus = class ChannelEventBus extends EventEmitter {
    emitMessage(msg) {
      return this.emit("message", msg);
    }
    emitError(err) {
      return this.emit("error", err);
    }
    emitStatus(status) {
      return this.emit("status", status);
    }
  };
});

// src/core/stream.ts
class SmartStreamer {
  adapter;
  options;
  constructor(adapter, options = {}) {
    this.adapter = adapter;
    this.options = {
      editDebounceMs: 1000,
      typingIntervalMs: 4000,
      chunkMode: "sentence",
      minSentenceLength: 60,
      initialPlaceholder: "...",
      ...options
    };
  }
  async stream(chatId, tokenStream, sendOptions) {
    let typingActive = true;
    const triggerTyping = async () => {
      if (this.adapter.sendTyping) {
        try {
          await this.adapter.sendTyping(chatId);
        } catch {}
      }
    };
    await triggerTyping();
    const typingTimer = setInterval(() => {
      if (typingActive)
        triggerTyping();
    }, this.options.typingIntervalMs);
    try {
      if (typeof this.adapter.editText === "function") {
        return await this.streamWithEdit(chatId, tokenStream, sendOptions);
      } else {
        return await this.streamWithoutEdit(chatId, tokenStream, sendOptions);
      }
    } finally {
      typingActive = false;
      clearInterval(typingTimer);
    }
  }
  async streamWithEdit(chatId, tokenStream, sendOptions) {
    let accumulated = "";
    let sentMsg = null;
    let lastEditTime = 0;
    let pendingEditTimeout = null;
    const performEdit = async (text) => {
      if (sentMsg && this.adapter.editText) {
        await this.adapter.editText(chatId, sentMsg.messageId, text);
        lastEditTime = Date.now();
      }
    };
    for await (const chunk of tokenStream) {
      accumulated += chunk;
      if (!sentMsg) {
        sentMsg = await this.adapter.sendText(chatId, accumulated.trim() || this.options.initialPlaceholder, sendOptions);
        lastEditTime = Date.now();
        continue;
      }
      const now = Date.now();
      const elapsed = now - lastEditTime;
      if (elapsed >= this.options.editDebounceMs) {
        if (pendingEditTimeout) {
          clearTimeout(pendingEditTimeout);
          pendingEditTimeout = null;
        }
        await performEdit(accumulated);
      } else if (!pendingEditTimeout) {
        pendingEditTimeout = setTimeout(async () => {
          pendingEditTimeout = null;
          await performEdit(accumulated);
        }, this.options.editDebounceMs - elapsed);
      }
    }
    if (pendingEditTimeout) {
      clearTimeout(pendingEditTimeout);
      pendingEditTimeout = null;
    }
    if (sentMsg && accumulated) {
      await performEdit(accumulated);
      return [sentMsg];
    } else if (!sentMsg && accumulated) {
      const res = await this.adapter.sendText(chatId, accumulated, sendOptions);
      return [res];
    }
    return sentMsg ? [sentMsg] : [];
  }
  async streamWithoutEdit(chatId, tokenStream, sendOptions) {
    const results = [];
    if (this.options.chunkMode === "accumulate") {
      let accumulated = "";
      for await (const chunk of tokenStream) {
        accumulated += chunk;
      }
      if (accumulated.trim()) {
        const res = await this.adapter.sendText(chatId, accumulated, sendOptions);
        results.push(res);
      }
      return results;
    }
    let buffer = "";
    const sentenceEndRegex = /[.?!;\n]\s*$/;
    for await (const chunk of tokenStream) {
      buffer += chunk;
      if (buffer.length >= this.options.minSentenceLength && sentenceEndRegex.test(buffer.trimEnd())) {
        const textToSend = buffer.trim();
        if (textToSend) {
          const res = await this.adapter.sendText(chatId, textToSend, sendOptions);
          results.push(res);
          buffer = "";
        }
      }
    }
    if (buffer.trim()) {
      const res = await this.adapter.sendText(chatId, buffer.trim(), sendOptions);
      results.push(res);
    }
    return results;
  }
}

// src/core/context.ts
function createMessageContext(message, channel, identity) {
  return {
    message,
    channel,
    identity,
    reply: (text, options) => channel.sendText(message.chat.id, text, {
      replyToId: message.id,
      ...options
    }),
    replyWithActions: (text, actions, options) => channel.sendText(message.chat.id, text, {
      replyToId: message.id,
      actions,
      ...options
    }),
    replyMedia: (media, options) => channel.sendMedia(message.chat.id, media, {
      replyToId: message.id,
      ...options
    }),
    react: async (emoji) => {
      if (channel.addReaction) {
        await channel.addReaction(message.chat.id, message.id, emoji);
      }
    },
    sendTyping: async () => {
      if (channel.sendTyping) {
        await channel.sendTyping(message.chat.id);
      }
    },
    stream: async (tokenStream, options) => {
      const streamer = new SmartStreamer(channel, options);
      return await streamer.stream(message.chat.id, tokenStream, {
        replyToId: message.id
      });
    }
  };
}
var init_context = () => {};

// src/core/dedup.ts
class IdempotencyCache {
  _maxEntries;
  _ttlMs;
  _map = new Map;
  constructor(options = {}) {
    this._maxEntries = options.maxEntries ?? 50000;
    this._ttlMs = options.ttlMs ?? 300000;
  }
  checkAndSet(id) {
    const now = Date.now();
    const existing = this._map.get(id);
    if (existing !== undefined) {
      if (now < existing) {
        return false;
      }
    }
    if (this._map.size >= this._maxEntries) {
      const oldestKey = this._map.keys().next().value;
      if (oldestKey)
        this._map.delete(oldestKey);
    }
    this._map.set(id, now + this._ttlMs);
    return true;
  }
  has(id) {
    const expiresAt = this._map.get(id);
    if (expiresAt === undefined)
      return false;
    if (Date.now() >= expiresAt) {
      this._map.delete(id);
      return false;
    }
    return true;
  }
  cleanup() {
    const now = Date.now();
    let purged = 0;
    for (const [key, expiresAt] of this._map.entries()) {
      if (now >= expiresAt) {
        this._map.delete(key);
        purged++;
      }
    }
    return purged;
  }
  get size() {
    return this._map.size;
  }
  clear() {
    this._map.clear();
  }
}

// src/core/identity.ts
class IdentityStitcher {
  _lookup = new Map;
  _identities = new Map;
  makeKey(channel, channelUserId) {
    return `${channel}:${channelUserId}`;
  }
  resolve(channel, channelUserId) {
    const key = this.makeKey(channel, channelUserId);
    const existingPrimaryId = this._lookup.get(key);
    if (existingPrimaryId && this._identities.has(existingPrimaryId)) {
      return this._identities.get(existingPrimaryId);
    }
    const primaryUserId = `usr_${Math.random().toString(36).substring(2, 10)}`;
    const identity = {
      primaryUserId,
      channels: { [channel]: channelUserId },
      createdAt: Date.now()
    };
    this._lookup.set(key, primaryUserId);
    this._identities.set(primaryUserId, identity);
    return identity;
  }
  link(primaryUserId, channel, channelUserId) {
    let identity = this._identities.get(primaryUserId);
    if (!identity) {
      identity = {
        primaryUserId,
        channels: {},
        createdAt: Date.now()
      };
      this._identities.set(primaryUserId, identity);
    }
    const key = this.makeKey(channel, channelUserId);
    this._lookup.set(key, primaryUserId);
    identity.channels[channel] = channelUserId;
    return identity;
  }
  merge(targetPrimaryId, sourcePrimaryId) {
    if (targetPrimaryId === sourcePrimaryId) {
      return this._identities.get(targetPrimaryId);
    }
    const target = this._identities.get(targetPrimaryId);
    const source = this._identities.get(sourcePrimaryId);
    if (!target || !source) {
      throw new Error(`Cannot merge identities: both target and source must exist.`);
    }
    for (const [ch, chUserId] of Object.entries(source.channels)) {
      const key = this.makeKey(ch, chUserId);
      this._lookup.set(key, targetPrimaryId);
      target.channels[ch] = chUserId;
    }
    target.metadata = { ...source.metadata, ...target.metadata };
    this._identities.delete(sourcePrimaryId);
    return target;
  }
  get(primaryUserId) {
    return this._identities.get(primaryUserId);
  }
  get count() {
    return this._identities.size;
  }
}

// src/core/hub.ts
class ChannelHub {
  _channels = new Map;
  _bus = new ChannelEventBus;
  _messageHandlers = [];
  _dedupCache;
  _dlqHandler;
  _identityStitcher;
  _queue = [];
  _waiters = [];
  _queueDrainWaiters = [];
  _isClosed = false;
  constructor(options = {}) {
    if (options.enableDeduplication) {
      this._dedupCache = new IdempotencyCache(options.dedupOptions);
    }
    this._dlqHandler = options.onDeadLetter;
    this._identityStitcher = options.identityStitcher ?? new IdentityStitcher;
  }
  get identityStitcher() {
    return this._identityStitcher;
  }
  register(channel) {
    const provider = channel.provider || channel.name;
    const accountId = channel.accountId || "default";
    const fullKey = `${provider}:${accountId}`;
    if (this._channels.has(fullKey)) {
      throw new Error(`Channel '${fullKey}' is already registered in ChannelHub.`);
    }
    this._channels.set(fullKey, channel);
    if (!this._channels.has(provider)) {
      this._channels.set(provider, channel);
    }
    if (!this._channels.has(channel.name)) {
      this._channels.set(channel.name, channel);
    }
    channel.on("message", async (msg) => {
      if (this._dedupCache && msg.id) {
        const isNew = this._dedupCache.checkAndSet(`${channel.name}:${msg.id}`);
        if (!isNew) {
          return;
        }
      }
      this._bus.emitMessage(msg);
      const identity = this._identityStitcher.resolve(channel.name, msg.sender.id);
      const ctx = createMessageContext(msg, channel, identity);
      if (this._waiters.length > 0) {
        const waiter = this._waiters.shift();
        waiter(ctx);
      } else {
        while (this._queue.length >= 2000 && !this._isClosed) {
          await new Promise((resolve) => this._queueDrainWaiters.push(resolve));
        }
        if (!this._isClosed) {
          this._queue.push(ctx);
        }
      }
      for (const handler of this._messageHandlers) {
        try {
          await handler(ctx);
        } catch (err) {
          const errorObj = err instanceof Error ? err : new Error(String(err));
          this._bus.emitError(errorObj);
          if (this._dlqHandler) {
            try {
              await this._dlqHandler({
                message: msg,
                error: errorObj,
                timestamp: Date.now(),
                retryCount: 0,
                channel: channel.name
              });
            } catch (dlqErr) {
              this._bus.emitError(dlqErr instanceof Error ? dlqErr : new Error(String(dlqErr)));
            }
          }
        }
      }
    });
    channel.on("error", (err) => {
      this._bus.emitError(err);
    });
    return this;
  }
  getChannel(providerOrKey, accountId) {
    if (accountId) {
      return this._channels.get(`${providerOrKey}:${accountId}`);
    }
    return this._channels.get(providerOrKey);
  }
  listChannels() {
    const seen = new Set;
    const keys = [];
    for (const [key, ch] of this._channels.entries()) {
      if (!seen.has(ch)) {
        seen.add(ch);
        keys.push(key);
      }
    }
    return keys;
  }
  onMessage(handler) {
    this._messageHandlers.push(handler);
    return this;
  }
  on(event, handler) {
    if (event === "message") {
      this.onMessage(handler);
    } else if (event === "error") {
      this._bus.on("error", handler);
    }
    return this;
  }
  async* messages(signal) {
    while (!this._isClosed && !signal?.aborted) {
      if (this._queue.length > 0) {
        const item = this._queue.shift();
        if (this._queueDrainWaiters.length > 0) {
          const drain = this._queueDrainWaiters.shift();
          drain();
        }
        yield item;
        continue;
      }
      const next = await new Promise((resolve) => {
        const waiter = (ctx) => {
          signal?.removeEventListener("abort", onAbort);
          resolve(ctx);
        };
        const onAbort = () => {
          const idx = this._waiters.indexOf(waiter);
          if (idx !== -1)
            this._waiters.splice(idx, 1);
          signal?.removeEventListener("abort", onAbort);
          resolve(null);
        };
        signal?.addEventListener("abort", onAbort, { once: true });
        this._waiters.push(waiter);
      });
      if (!next || signal?.aborted)
        break;
      yield next;
    }
  }
  async start(signal) {
    this._isClosed = false;
    const connected = [];
    const uniqueChannels = Array.from(new Set(this._channels.values()));
    try {
      for (const ch of uniqueChannels) {
        if (signal?.aborted) {
          throw signal.reason || new Error("Startup aborted");
        }
        await ch.connect(signal);
        connected.push(ch);
      }
    } catch (err) {
      await Promise.allSettled(connected.map((ch) => ch.disconnect()));
      throw err;
    }
  }
  async startAll(signal) {
    return this.start(signal);
  }
  async stop(signal) {
    this._isClosed = true;
    for (const waiter of this._waiters) {
      waiter(null);
    }
    this._waiters = [];
    while (this._queueDrainWaiters.length > 0) {
      const drain = this._queueDrainWaiters.shift();
      drain();
    }
    const uniqueChannels = Array.from(new Set(this._channels.values()));
    await Promise.allSettled(uniqueChannels.map((ch) => ch.disconnect(signal)));
  }
}
var init_hub = __esm(() => {
  init_bus();
  init_context();
});

// bin/cli.ts
import fs from "node:fs";
import path from "node:path";
var args = process.argv.slice(2);
var command = args[0] || "help";
function printHelp() {
  console.log(`
ChannelHub CLI \uD83E\uDD89 - Multi-Channel Messaging Toolkit

Usage:
  channelhub <command> [options]

Commands:
  doctor              Diagnose environment, configuration and channel credentials
  start               Start ChannelHub agent/bot services
  login:zalo          Scan QR code to authenticate personal Zalo account
  login:messenger     Authenticate personal Facebook Messenger account via browser
  version             Display version information
  help                Display this help message
`);
}
async function runDoctor() {
  console.log(`ChannelHub Diagnostics \uD83E\uDE7A
`);
  console.log(`Node.js Runtime : ${process.version}`);
  console.log(`Platform        : ${process.platform} (${process.arch})`);
  console.log(`Working Directory: ${process.cwd()}
`);
  const zaloCred = path.resolve(process.cwd(), "credentials.json");
  if (fs.existsSync(zaloCred)) {
    console.log("✅ Zalo Personal Credentials: Found (credentials.json)");
  } else {
    console.log("⚪ Zalo Personal Credentials: Not found (Run 'channelhub login:zalo')");
  }
  const msgCred = path.resolve(process.cwd(), "messenger.credentials.json");
  if (fs.existsSync(msgCred)) {
    console.log("✅ Messenger Credentials    : Found (messenger.credentials.json)");
  } else {
    console.log("⚪ Messenger Credentials    : Not found (Run 'channelhub login:messenger')");
  }
  const envVars = [
    "TELEGRAM_BOT_TOKEN",
    "DISCORD_BOT_TOKEN",
    "SLACK_BOT_TOKEN",
    "MESSENGER_PAGE_TOKEN",
    "ZALO_OA_ACCESS_TOKEN"
  ];
  console.log(`
Configured Environment Variables:`);
  for (const v of envVars) {
    if (process.env[v]) {
      console.log(`  - ${v}: Set (length ${process.env[v].length})`);
    } else {
      console.log(`  - ${v}: Not set`);
    }
  }
}
async function main() {
  switch (command) {
    case "doctor":
      await runDoctor();
      break;
    case "login:zalo":
    case "login": {
      console.log("[ChannelHub CLI] Initiating Zalo QR login...");
      try {
        const { Zalo } = await import("zca-js");
        const zalo = new Zalo;
        const api = await zalo.loginQR({}, (qr) => {
          console.log("[ChannelHub] Scan QR code to authenticate:", qr);
        });
        const creds = api.getContext();
        const outPath = path.resolve(process.cwd(), "credentials.json");
        fs.writeFileSync(outPath, JSON.stringify(creds, null, 2));
        console.log(`✅ Zalo authentication successful! Saved to: ${outPath}`);
      } catch (err) {
        console.error("Zalo login failed:", err.message || err);
        process.exit(1);
      }
      break;
    }
    case "login:messenger": {
      console.log("[ChannelHub CLI] Launching Messenger browser login...");
      try {
        const { chromium } = await import("playwright");
        const browser = await chromium.launch({ headless: false, args: ["--disable-notifications"] });
        const context = await browser.newContext();
        const page = await context.newPage();
        await page.goto("https://www.facebook.com/", { waitUntil: "domcontentloaded" });
        console.log("Waiting for user to log in on the browser window...");
        while (true) {
          const cookies = await context.cookies();
          const cUser = cookies.find((c) => c.name === "c_user");
          if (cUser && cUser.value) {
            const outPath = path.resolve(process.cwd(), "messenger.credentials.json");
            fs.writeFileSync(outPath, JSON.stringify({ userId: cUser.value, cookies, savedAt: new Date().toISOString() }, null, 2));
            console.log(`✅ Messenger authenticated! User ID: ${cUser.value}. Saved to: ${outPath}`);
            await browser.close();
            break;
          }
          await new Promise((r) => setTimeout(r, 1500));
        }
      } catch (err) {
        console.error("Messenger login failed:", err.message || err);
        process.exit(1);
      }
      break;
    }
    case "start": {
      console.log("[ChannelHub CLI] Starting ChannelHub runtime...");
      try {
        await Promise.resolve().then(() => init_hub());
        const hub = new ChannelHub;
        console.log("ChannelHub core initialized. Registering configured adapters...");
        await hub.startAll();
        console.log("ChannelHub is active and running.");
      } catch (err) {
        console.error("Failed to start ChannelHub:", err.message || err);
        process.exit(1);
      }
      break;
    }
    case "version":
    case "-v":
    case "--version": {
      console.log("@theowlops/channelhub v1.4.1");
      break;
    }
    case "help":
    case "-h":
    case "--help":
    default:
      printHelp();
      break;
  }
}
main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
