var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __hasOwnProp = Object.prototype.hasOwnProperty;
function __accessProp(key) {
  return this[key];
}
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

// src/core/index.ts
var exports_core = {};
__export(exports_core, {
  BaseChannel: () => BaseChannel,
  ChannelHub: () => ChannelHub,
  GroupManager: () => GroupManager,
  HumanHandoffManager: () => HumanHandoffManager,
  IdempotencyCache: () => IdempotencyCache,
  IdentityStitcher: () => IdentityStitcher,
  MediaTranscoder: () => MediaTranscoder,
  SharedTokenBucketLimiter: () => SharedTokenBucketLimiter,
  SmartStreamer: () => SmartStreamer,
  TokenBucketLimiter: () => TokenBucketLimiter,
  VideoEngine: () => VideoEngine,
  WebResearch: () => WebResearch,
  createMessageContext: () => createMessageContext
});
module.exports = __toCommonJS(exports_core);

// src/core/adapter.ts
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
function createMessageContext(message, channel, identity, handoffManager) {
  const isHandedOff = handoffManager ? handoffManager.isPaused(channel.name, message.chat.id) : false;
  return {
    message,
    channel,
    identity,
    isHandedOff,
    handoff: (durationMs, reason) => {
      if (handoffManager) {
        handoffManager.pause(channel.name, message.chat.id, durationMs, reason);
      }
    },
    resume: () => {
      return handoffManager ? handoffManager.resume(channel.name, message.chat.id) : false;
    },
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
// src/core/bus.ts
var import_node_events2 = require("node:events");

class ChannelEventBus extends import_node_events2.EventEmitter {
  emitMessage(msg) {
    return this.emit("message", msg);
  }
  emitError(err) {
    return this.emit("error", err);
  }
  emitStatus(status) {
    return this.emit("status", status);
  }
}

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

// src/core/handoff.ts
class HumanHandoffManager {
  _states = new Map;
  _getKey(channel, chatId) {
    return `${channel}:${chatId}`;
  }
  pause(channel, chatId, durationMs = 3600000, reason) {
    const key = this._getKey(channel, chatId);
    const pausedUntil = durationMs === Infinity ? Infinity : Date.now() + durationMs;
    this._states.set(key, { chatId, channel, pausedUntil, reason });
  }
  resume(channel, chatId) {
    const key = this._getKey(channel, chatId);
    return this._states.delete(key);
  }
  isPaused(channel, chatId) {
    const key = this._getKey(channel, chatId);
    const state = this._states.get(key);
    if (!state)
      return false;
    if (state.pausedUntil !== Infinity && Date.now() > state.pausedUntil) {
      this._states.delete(key);
      return false;
    }
    return true;
  }
  getState(channel, chatId) {
    if (!this.isPaused(channel, chatId))
      return;
    return this._states.get(this._getKey(channel, chatId));
  }
}

// src/core/hub.ts
class ChannelHub {
  _channels = new Map;
  _bus = new ChannelEventBus;
  _messageHandlers = [];
  _middlewares = [];
  _dedupCache;
  _dlqHandler;
  _identityStitcher;
  _handoffManager;
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
    this._handoffManager = new HumanHandoffManager;
  }
  get identityStitcher() {
    return this._identityStitcher;
  }
  get handoff() {
    return this._handoffManager;
  }
  use(middleware) {
    this._middlewares.push(middleware);
    return this;
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
      const ctx = createMessageContext(msg, channel, identity, this._handoffManager);
      if (ctx.isHandedOff) {
        this._bus.emit("handoff", ctx);
      }
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
      const executePipeline = async (index) => {
        if (index < this._middlewares.length) {
          const fn = this._middlewares[index];
          await fn(ctx, () => executePipeline(index + 1));
          return;
        }
        if (!ctx.isHandedOff) {
          for (const handler of this._messageHandlers) {
            await handler(ctx);
          }
        }
      };
      try {
        await executePipeline(0);
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
    } else if (event === "handoff") {
      this._bus.on("handoff", handler);
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
// src/core/limiter.ts
class TokenBucketLimiter {
  _tokens;
  _capacity;
  _refillRate;
  _refillIntervalMs;
  _lastRefill;
  constructor(options) {
    this._capacity = Math.max(1, options.capacity);
    this._tokens = this._capacity;
    this._refillRate = Math.max(1, options.refillRate);
    this._refillIntervalMs = Math.max(1, options.refillIntervalMs);
    this._lastRefill = Date.now();
  }
  refill() {
    const now = Date.now();
    const elapsed = now - this._lastRefill;
    if (elapsed >= this._refillIntervalMs) {
      const intervals = Math.floor(elapsed / this._refillIntervalMs);
      const addedTokens = intervals * this._refillRate;
      this._tokens = Math.min(this._capacity, this._tokens + addedTokens);
      this._lastRefill += intervals * this._refillIntervalMs;
    }
  }
  async acquire(tokens = 1, maxWaitMs) {
    if (tokens > this._capacity) {
      throw new Error(`Cannot acquire ${tokens} tokens; exceeds bucket capacity of ${this._capacity}.`);
    }
    return new Promise((resolve, reject) => {
      let timeoutId;
      let intervalId;
      const start = Date.now();
      const tryAcquire = () => {
        this.refill();
        if (this._tokens >= tokens) {
          this._tokens -= tokens;
          cleanup();
          resolve(true);
          return true;
        }
        if (maxWaitMs !== undefined && Date.now() - start > maxWaitMs) {
          cleanup();
          reject(new Error(`Timeout of ${maxWaitMs}ms exceeded while waiting for rate limiter token.`));
          return true;
        }
        return false;
      };
      const cleanup = () => {
        if (timeoutId)
          clearTimeout(timeoutId);
        if (intervalId)
          clearInterval(intervalId);
      };
      if (tryAcquire())
        return;
      const pollMs = Math.min(this._refillIntervalMs, 50);
      intervalId = setInterval(tryAcquire, pollMs);
      if (maxWaitMs !== undefined) {
        timeoutId = setTimeout(() => {
          cleanup();
          reject(new Error(`Timeout of ${maxWaitMs}ms exceeded while waiting for rate limiter token.`));
        }, maxWaitMs);
      }
    });
  }
  get tokensAvailable() {
    this.refill();
    return this._tokens;
  }
}
// src/core/shared-limiter.ts
var delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

class SharedTokenBucketLimiter {
  maxTokens;
  refillRatePerSec;
  mem;
  TOKENS_MASK = (1n << 22n) - 1n;
  constructor(maxTokens, refillRatePerSec, sharedBuffer) {
    this.maxTokens = maxTokens;
    this.refillRatePerSec = refillRatePerSec;
    if (maxTokens > 4000000) {
      throw new Error("SharedTokenBucketLimiter supports max 4,000,000 tokens per bucket.");
    }
    const buffer = sharedBuffer ?? new SharedArrayBuffer(8);
    this.mem = new BigInt64Array(buffer);
    if (!sharedBuffer) {
      const initialPacked = this.pack(BigInt(Date.now()), BigInt(maxTokens));
      Atomics.store(this.mem, 0, initialPacked);
    }
  }
  get buffer() {
    return this.mem.buffer;
  }
  pack(timestampMs, tokens) {
    return timestampMs << 22n | tokens & this.TOKENS_MASK;
  }
  unpack(packed) {
    const tokens = packed & this.TOKENS_MASK;
    const timestampMs = packed >> 22n;
    return { timestampMs, tokens };
  }
  tryAcquire(cost = 1) {
    const costBn = BigInt(cost);
    let currentPacked = Atomics.load(this.mem, 0);
    while (true) {
      let { timestampMs, tokens } = this.unpack(currentPacked);
      const now = BigInt(Date.now());
      const elapsedMs = Number(now - timestampMs);
      if (elapsedMs > 0) {
        const added = Math.floor(elapsedMs / 1000 * this.refillRatePerSec);
        if (added > 0) {
          tokens = BigInt(Math.min(this.maxTokens, Number(tokens) + added));
          const msConsumed = added * 1000 / this.refillRatePerSec;
          timestampMs = timestampMs + BigInt(Math.floor(msConsumed));
        }
      }
      if (tokens < costBn) {
        return false;
      }
      const newPacked = this.pack(timestampMs, tokens - costBn);
      const actual = Atomics.compareExchange(this.mem, 0, currentPacked, newPacked);
      if (actual === currentPacked) {
        return true;
      }
      currentPacked = actual;
    }
  }
  async acquire(cost = 1, timeoutMs = 5000) {
    const start = Date.now();
    while (true) {
      if (this.tryAcquire(cost))
        return true;
      if (Date.now() - start > timeoutMs)
        return false;
      await delay(Math.max(10, Math.floor(1000 / this.refillRatePerSec)));
    }
  }
}
// src/core/transcoder.ts
class MediaTranscoder {
  static sharpCache = null;
  static async getSharp() {
    if (this.sharpCache)
      return this.sharpCache;
    try {
      const mod = await import("sharp");
      this.sharpCache = mod.default || mod;
      return this.sharpCache;
    } catch (e) {
      throw new Error("Cannot load optional dependency 'sharp'. Please install it: npm install sharp");
    }
  }
  static async transcodeImage(source, options = {}) {
    const sharp = await this.getSharp();
    const {
      maxWidth = 1920,
      maxHeight = 1920,
      quality = 80,
      format = "webp",
      stripMetadata = true
    } = options;
    const sourceBuf = Buffer.isBuffer(source) ? source : Buffer.from(source);
    let pipeline = sharp(sourceBuf, { failOn: "none" });
    if (stripMetadata) {
      pipeline = pipeline.withMetadata(false);
    }
    pipeline = pipeline.rotate();
    pipeline = pipeline.resize({
      width: maxWidth,
      height: maxHeight,
      fit: "inside",
      withoutEnlargement: true
    });
    let mimeType = "image/webp";
    if (format === "webp") {
      pipeline = pipeline.webp({ quality, effort: 4 });
    } else if (format === "jpeg") {
      pipeline = pipeline.jpeg({ quality, progressive: true, mozjpeg: true });
      mimeType = "image/jpeg";
    } else if (format === "png") {
      pipeline = pipeline.png({ compressionLevel: 8, adaptiveFiltering: true });
      mimeType = "image/png";
    }
    const { data: outputBuffer, info } = await pipeline.toBuffer({ resolveWithObject: true });
    return {
      buffer: outputBuffer,
      format: info.format,
      mimeType,
      originalSize: sourceBuf.length,
      transcodedSize: outputBuffer.length,
      compressionRatio: outputBuffer.length / sourceBuf.length,
      width: info.width,
      height: info.height
    };
  }
}
// src/core/research.ts
class WebResearch {
  static async search(query, options = {}) {
    const { limit = 5, provider = "duckduckgo", apiKey, deepExtract = false, signal } = options;
    let results = [];
    if (provider === "tavily") {
      results = await this.searchTavily(query, apiKey, limit, signal);
    } else if (provider === "brave") {
      results = await this.searchBrave(query, apiKey, limit, signal);
    } else {
      results = await this.searchDuckDuckGo(query, limit, signal);
    }
    if (deepExtract && results.length > 0) {
      const topToExtract = results.slice(0, 3);
      await Promise.allSettled(topToExtract.map(async (r) => {
        try {
          const page = await this.extract(r.url, signal);
          r.content = page.content.slice(0, 5000);
        } catch {}
      }));
    }
    return results;
  }
  static async extract(url, signal) {
    try {
      const res = await fetch(`https://r.jina.ai/${encodeURI(url)}`, {
        headers: {
          Accept: "text/plain",
          "User-Agent": "ChannelHub-Agent/1.0"
        },
        signal
      });
      if (res.ok) {
        const text = await res.text();
        return {
          url,
          content: text.trim()
        };
      }
    } catch {}
    const rawRes = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
      },
      signal
    });
    const html = await rawRes.text();
    const clean = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "").replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    return {
      url,
      content: clean.slice(0, 1e4)
    };
  }
  static async searchDuckDuckGo(query, limit, signal) {
    const res = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)"
      },
      signal
    });
    if (!res.ok)
      throw new Error(`DuckDuckGo returned ${res.status}`);
    const html = await res.text();
    const results = [];
    const blockRegex = /<div class="result results_links results_links_deep web-result[\s\S]*?<a class="result__snippet[^>]*>([\s\S]*?)<\/a>/g;
    let match;
    while ((match = blockRegex.exec(html)) !== null && results.length < limit) {
      const block = match[0];
      const titleMatch = block.match(/<a rel="nofollow" class="result__a" href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/);
      const snippetMatch = block.match(/<a class="result__snippet[^>]*>([\s\S]*?)<\/a>/);
      if (titleMatch) {
        let rawUrl = titleMatch[1];
        if (rawUrl.includes("uddg=")) {
          const extracted = rawUrl.split("uddg=")[1]?.split("&")[0];
          if (extracted)
            rawUrl = decodeURIComponent(extracted);
        }
        const title = titleMatch[2].replace(/<[^>]+>/g, "").trim();
        const snippet = snippetMatch ? snippetMatch[1].replace(/<[^>]+>/g, "").trim() : "";
        if (rawUrl.startsWith("http")) {
          results.push({
            title,
            url: rawUrl,
            snippet
          });
        }
      }
    }
    return results;
  }
  static async searchTavily(query, apiKey, limit = 5, signal) {
    if (!apiKey)
      throw new Error("Tavily provider requires apiKey in options");
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        max_results: limit
      }),
      signal
    });
    if (!res.ok)
      throw new Error(`Tavily error: ${res.status}`);
    const data = await res.json();
    return (data.results || []).map((r) => ({
      title: r.title,
      url: r.url,
      snippet: r.content
    }));
  }
  static async searchBrave(query, apiKey, limit = 5, signal) {
    if (!apiKey)
      throw new Error("Brave provider requires apiKey in options");
    const res = await fetch(`https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${limit}`, {
      headers: {
        Accept: "application/json",
        "X-Subscription-Token": apiKey
      },
      signal
    });
    if (!res.ok)
      throw new Error(`Brave search error: ${res.status}`);
    const data = await res.json();
    return (data.web?.results || []).map((r) => ({
      title: r.title,
      url: r.url,
      snippet: r.description
    }));
  }
}
// src/core/video.ts
var import_node_child_process = require("node:child_process");
var import_node_fs = require("node:fs");
var import_node_path = require("node:path");
var import_node_os = require("node:os");

class VideoEngine {
  static async createShort(options) {
    const {
      input,
      output,
      mode = "blur-backdrop",
      targetWidth = 1080,
      targetHeight = 1920,
      ffmpegPath = "ffmpeg"
    } = options;
    let filterGraph = "";
    if (mode === "blur-backdrop") {
      filterGraph = [
        `[0:v]scale=${targetWidth}:${targetHeight}:force_original_aspect_ratio=increase,crop=${targetWidth}:${targetHeight},boxblur=20:5[bg]`,
        `[0:v]scale=${targetWidth}:${targetHeight}:force_original_aspect_ratio=decrease[fg]`,
        `[bg][fg]overlay=(W-w)/2:(H-h)/2[outv]`
      ].join(";");
    } else if (mode === "crop-center") {
      filterGraph = `[0:v]scale=${targetWidth}:${targetHeight}:force_original_aspect_ratio=increase,crop=${targetWidth}:${targetHeight}[outv]`;
    } else {
      filterGraph = `[0:v]scale=${targetWidth}:${targetHeight}:force_original_aspect_ratio=decrease,pad=${targetWidth}:${targetHeight}:(ow-iw)/2:(oh-ih)/2:black[outv]`;
    }
    const args = [
      "-y",
      "-i",
      input,
      "-filter_complex",
      filterGraph,
      "-map",
      "[outv]",
      "-map",
      "0:a?",
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-crf",
      "22",
      "-c:a",
      "aac",
      "-b:a",
      "128k",
      output
    ];
    await this.runProcess(ffmpegPath, args);
    return { output, command: [ffmpegPath, ...args] };
  }
  static async burnSubtitles(options) {
    const { input, output, subtitles, style = {}, ffmpegPath = "ffmpeg" } = options;
    let srtPath = subtitles;
    let tempCreated = false;
    if (!subtitles.endsWith(".srt") && !subtitles.endsWith(".vtt")) {
      srtPath = import_node_path.join(import_node_os.tmpdir(), `sub_${Date.now()}_${Math.random().toString(36).slice(2)}.srt`);
      await import_node_fs.promises.writeFile(srtPath, subtitles, "utf8");
      tempCreated = true;
    }
    try {
      const fontSize = style.fontSize || 24;
      const fontColor = style.fontColor || "&H00FFFFFF";
      const bold = style.bold ? 1 : 0;
      const safeSrtPath = srtPath.replace(/\\/g, "/").replace(/:/g, "\\:");
      const filter = `subtitles='${safeSrtPath}':force_style='FontSize=${fontSize},PrimaryColour=${fontColor},Bold=${bold}'`;
      const args = [
        "-y",
        "-i",
        input,
        "-vf",
        filter,
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-crf",
        "22",
        "-c:a",
        "copy",
        output
      ];
      await this.runProcess(ffmpegPath, args);
      return { output, command: [ffmpegPath, ...args] };
    } finally {
      if (tempCreated) {
        await import_node_fs.promises.unlink(srtPath).catch(() => {});
      }
    }
  }
  static async addWatermark(options) {
    const {
      input,
      watermark,
      output,
      position = "top-right",
      opacity = 0.9,
      scale = 0.15,
      ffmpegPath = "ffmpeg"
    } = options;
    let posExpr = "W-w-20:20";
    if (position === "top-left")
      posExpr = "20:20";
    else if (position === "bottom-left")
      posExpr = "20:H-h-20";
    else if (position === "bottom-right")
      posExpr = "W-w-20:H-h-20";
    else if (position === "center")
      posExpr = "(W-w)/2:(H-h)/2";
    const filterGraph = [
      `[1:v]scale=iw*${scale}:-1,format=rgba,colorchannelmixer=aa=${opacity}[wm]`,
      `[0:v][wm]overlay=${posExpr}[outv]`
    ].join(";");
    const args = [
      "-y",
      "-i",
      input,
      "-i",
      watermark,
      "-filter_complex",
      filterGraph,
      "-map",
      "[outv]",
      "-map",
      "0:a?",
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-c:a",
      "copy",
      output
    ];
    await this.runProcess(ffmpegPath, args);
    return { output, command: [ffmpegPath, ...args] };
  }
  static async extractThumbnail(options) {
    const { input, output, timestampSec = 1, width, ffmpegPath = "ffmpeg" } = options;
    const args = [
      "-y",
      "-ss",
      String(timestampSec),
      "-i",
      input,
      "-vframes",
      "1"
    ];
    if (width) {
      args.push("-vf", `scale=${width}:-1`);
    }
    args.push(output);
    await this.runProcess(ffmpegPath, args);
    return { output, command: [ffmpegPath, ...args] };
  }
  static async generateMemeGif(options) {
    const {
      input,
      output,
      startSec = 0,
      durationSec = 5,
      fps = 15,
      width = 480,
      topText,
      bottomText,
      ffmpegPath = "ffmpeg"
    } = options;
    const filterParts = [
      `fps=${fps}`,
      `scale=${width}:-1:flags=lanczos`
    ];
    if (topText) {
      filterParts.push(`drawtext=text='${topText.replace(/'/g, "")}':x=(w-text_w)/2:y=20:fontsize=24:fontcolor=white:borderw=2:bordercolor=black`);
    }
    if (bottomText) {
      filterParts.push(`drawtext=text='${bottomText.replace(/'/g, "")}':x=(w-text_w)/2:y=h-text_h-20:fontsize=24:fontcolor=white:borderw=2:bordercolor=black`);
    }
    const vf = `${filterParts.join(",")},split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse`;
    const args = [
      "-y",
      "-ss",
      String(startSec),
      "-t",
      String(durationSec),
      "-i",
      input,
      "-vf",
      vf,
      output
    ];
    await this.runProcess(ffmpegPath, args);
    return { output, command: [ffmpegPath, ...args] };
  }
  static async renderShotstack(options) {
    const {
      timeline,
      apiKey,
      env = "stage",
      outputFormat = "mp4",
      aspectRatio = "9:16",
      signal
    } = options;
    const baseUrl = env === "v1" ? "https://api.shotstack.io/edit/v1" : "https://api.shotstack.io/edit/stage";
    const payload = {
      timeline,
      output: {
        format: outputFormat,
        aspectRatio,
        fps: 30
      }
    };
    const res = await fetch(`${baseUrl}/render`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey
      },
      body: JSON.stringify(payload),
      signal
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Shotstack render error (${res.status}): ${errText}`);
    }
    const data = await res.json();
    return {
      renderId: data.response?.id,
      status: data.response?.status || "queued",
      url: data.response?.url
    };
  }
  static runProcess(cmd, args) {
    return new Promise((resolve, reject) => {
      const child = import_node_child_process.spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });
      let stderr = "";
      child.stderr?.on("data", (chunk) => {
        stderr += chunk.toString();
      });
      child.on("error", (err) => {
        reject(new Error(`Failed to execute ${cmd}: ${err.message}`));
      });
      child.on("close", (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`${cmd} exited with code ${code}. Details:
${stderr.slice(-500)}`));
        }
      });
    });
  }
}
// src/core/group-manager.ts
class GroupManager {
  userMessageHistory = new Map;
  reminders = new Map;
  pendingChallenges = new Map;
  chatActivities = new Map;
  warnings = new Map;
  polls = new Map;
  generateRecap(messages) {
    const participants = Array.from(new Set(messages.map((m) => m.sender || m.senderId || "Unknown")));
    const keyTopics = [];
    const decisions = [];
    const actionItems = [];
    for (const msg of messages) {
      const text = msg.text.trim();
      const lower = text.toLowerCase();
      if (lower.startsWith("chốt:") || lower.startsWith("quyết định:") || lower.includes("thống nhất") || lower.startsWith("agree:") || lower.startsWith("decided:")) {
        decisions.push(text);
      }
      if (lower.includes("cần làm") || lower.includes("todo:") || lower.includes("giao cho") || lower.includes("hạn chót") || lower.startsWith("task:")) {
        actionItems.push({
          task: text,
          assignee: msg.sender
        });
      }
      if (text.length > 15 && !keyTopics.includes(text) && keyTopics.length < 5) {
        if (!decisions.includes(text) && !actionItems.some((a) => a.task === text)) {
          keyTopics.push(text.length > 80 ? text.slice(0, 77) + "..." : text);
        }
      }
    }
    const summaryLines = [
      `\uD83D\uDCCA **Tóm tắt cuộc thảo luận (${messages.length} tin nhắn)**:`,
      `\uD83D\uDC65 **Thành viên tham gia:** ${participants.join(", ") || "Không có"}`,
      `\uD83D\uDCCC **Chủ đề chính:** ${keyTopics.length > 0 ? keyTopics.join(" | ") : "Thảo luận thông thường"}`,
      `✅ **Quyết định đã chốt:** ${decisions.length > 0 ? decisions.join("; ") : "Không có"}`,
      `\uD83D\uDCDD **Đầu việc (Action items):** ${actionItems.length > 0 ? actionItems.map((a) => a.task).join("; ") : "Không có"}`
    ];
    return {
      totalMessages: messages.length,
      participants,
      keyTopics,
      decisions,
      actionItems,
      summaryText: summaryLines.join(`
`)
    };
  }
  checkSpam(senderId, text, options = {}) {
    const now = Date.now();
    const windowMs = options.windowMs || 1e4;
    const maxMessages = options.maxMessagesPerWindow || 5;
    const blacklisted = options.blacklistedDomains || ["t.me/", "bit.ly/", "cutt.ly/", "tini.vn/"];
    const urlMatches = text.match(/https?:\/\/[^\s]+/gi) || [];
    if (options.disallowLinks && urlMatches.length > 0) {
      return {
        isSpam: true,
        reason: "links_disabled",
        recommendedAction: "delete",
        messageCountInWindow: 1
      };
    }
    for (const url of urlMatches) {
      if (blacklisted.some((bad) => url.toLowerCase().includes(bad.toLowerCase()))) {
        return {
          isSpam: true,
          reason: "blacklisted_link",
          recommendedAction: "kick",
          messageCountInWindow: 1
        };
      }
    }
    const userHistory = this.userMessageHistory.get(senderId) || [];
    const validHistory = userHistory.filter((item) => now - item.timestamp < windowMs);
    const identicalCount = validHistory.filter((item) => item.text === text).length;
    if (identicalCount >= 2) {
      return {
        isSpam: true,
        reason: "repetitive_text",
        recommendedAction: "warn",
        messageCountInWindow: validHistory.length + 1
      };
    }
    validHistory.push({ text, timestamp: now });
    this.userMessageHistory.set(senderId, validHistory);
    if (validHistory.length >= maxMessages) {
      return {
        isSpam: true,
        reason: "flood",
        recommendedAction: "warn",
        messageCountInWindow: validHistory.length
      };
    }
    return {
      isSpam: false,
      recommendedAction: "allow",
      messageCountInWindow: validHistory.length
    };
  }
  registerNewMember(chatId, member, groupRules = "Vui lòng tôn trọng thành viên và không gửi link quảng cáo.", timeoutSeconds = 60) {
    const a = Math.floor(Math.random() * 8) + 1;
    const b = Math.floor(Math.random() * 8) + 1;
    const answer = String(a + b);
    const expiresAt = Date.now() + timeoutSeconds * 1000;
    const challengeKey = `${chatId}:${member.id}`;
    const challenge = {
      memberId: member.id,
      memberName: member.name,
      welcomeMessage: `\uD83C\uDF89 Chào mừng **${member.name}** đã tham gia nhóm!
\uD83D\uDCDC Nội quy: ${groupRules}
\uD83D\uDD12 Để tránh tài khoản clone, bạn hãy trả lời câu hỏi bảo mật trong vòng ${timeoutSeconds}s:`,
      question: `Bạn hãy tính: ${a} + ${b} = ?`,
      expectedAnswer: answer,
      expiresAt
    };
    this.pendingChallenges.set(challengeKey, challenge);
    return challenge;
  }
  verifyMember(chatId, memberId, answer) {
    const challengeKey = `${chatId}:${memberId}`;
    const challenge = this.pendingChallenges.get(challengeKey);
    if (!challenge)
      return true;
    if (Date.now() > challenge.expiresAt) {
      this.pendingChallenges.delete(challengeKey);
      return false;
    }
    if (answer.trim() === challenge.expectedAnswer) {
      this.pendingChallenges.delete(challengeKey);
      return true;
    }
    return false;
  }
  scheduleReminder(chatId, text, triggerAt, recurringIntervalMs) {
    const id = `remind_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const timestamp = typeof triggerAt === "number" ? triggerAt : triggerAt.getTime();
    const reminder = {
      id,
      chatId,
      text,
      triggerAt: timestamp,
      recurringIntervalMs,
      executed: false
    };
    this.reminders.set(id, reminder);
    return reminder;
  }
  pollDueReminders() {
    const now = Date.now();
    const dueList = [];
    for (const [id, r] of this.reminders.entries()) {
      if (!r.executed && r.triggerAt <= now) {
        dueList.push({ ...r });
        if (r.recurringIntervalMs && r.recurringIntervalMs > 0) {
          r.triggerAt = now + r.recurringIntervalMs;
        } else {
          r.executed = true;
          this.reminders.delete(id);
        }
      }
    }
    return dueList;
  }
  recordActivity(chatId, senderId, senderName = senderId, timestamp = Date.now()) {
    let groupMap = this.chatActivities.get(chatId);
    if (!groupMap) {
      groupMap = new Map;
      this.chatActivities.set(chatId, groupMap);
    }
    const current = groupMap.get(senderId) || {
      userId: senderId,
      name: senderName,
      messageCount: 0,
      lastActiveAt: timestamp
    };
    current.messageCount += 1;
    current.name = senderName;
    current.lastActiveAt = timestamp;
    groupMap.set(senderId, current);
  }
  getLeaderboard(chatId, limit = 10) {
    const groupMap = this.chatActivities.get(chatId);
    if (!groupMap)
      return [];
    return Array.from(groupMap.values()).sort((a, b) => b.messageCount - a.messageCount).slice(0, limit);
  }
  getInactiveMembers(chatId, cutoffDays = 7) {
    const groupMap = this.chatActivities.get(chatId);
    if (!groupMap)
      return [];
    const threshold = Date.now() - cutoffDays * 24 * 60 * 60 * 1000;
    return Array.from(groupMap.values()).filter((m) => m.lastActiveAt < threshold);
  }
  checkProfanity(text, badWords = ["dm", "vcl", "fuck", "bitch", "scam", "lua dao"]) {
    const lower = text.toLowerCase();
    const flagged = [];
    for (const w of badWords) {
      const regex = new RegExp(`(^|\\s|[^a-zA-Z0-9_])${w}([^a-zA-Z0-9_]|\\s|$)`, "i");
      if (regex.test(lower)) {
        flagged.push(w);
      }
    }
    return {
      isClean: flagged.length === 0,
      flaggedWords: flagged
    };
  }
  issueWarning(chatId, userId, reason, maxStrikes = 3) {
    let chatMap = this.warnings.get(chatId);
    if (!chatMap) {
      chatMap = new Map;
      this.warnings.set(chatId, chatMap);
    }
    const userWarns = chatMap.get(userId) || [];
    userWarns.push({ reason, timestamp: Date.now() });
    chatMap.set(userId, userWarns);
    return {
      strikes: userWarns.length,
      action: userWarns.length >= maxStrikes ? "kick" : "warn"
    };
  }
  getWarnings(chatId, userId) {
    return this.warnings.get(chatId)?.get(userId) || [];
  }
  clearWarnings(chatId, userId) {
    this.warnings.get(chatId)?.delete(userId);
  }
  createPoll(chatId, creatorId, question, options) {
    const id = `poll_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const poll = {
      id,
      chatId,
      creatorId,
      question,
      options,
      votes: new Map,
      active: true
    };
    this.polls.set(id, poll);
    return poll;
  }
  castVote(pollId, voterId, optionIndex) {
    const poll = this.polls.get(pollId);
    if (!poll || !poll.active || optionIndex < 0 || optionIndex >= poll.options.length) {
      return false;
    }
    poll.votes.set(voterId, optionIndex);
    return true;
  }
  getPollResults(pollId) {
    const poll = this.polls.get(pollId);
    if (!poll)
      return null;
    const counts = new Array(poll.options.length).fill(0);
    for (const optIdx of poll.votes.values()) {
      counts[optIdx]++;
    }
    const total = poll.votes.size;
    const results = poll.options.map((option, idx) => ({
      option,
      votes: counts[idx],
      percentage: total > 0 ? Math.round(counts[idx] / total * 100) : 0
    }));
    return {
      question: poll.question,
      totalVotes: total,
      active: poll.active,
      results
    };
  }
  closePoll(pollId, creatorId) {
    const poll = this.polls.get(pollId);
    if (!poll)
      return false;
    if (creatorId && poll.creatorId !== creatorId)
      return false;
    poll.active = false;
    return true;
  }
}
