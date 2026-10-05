// src/core/adapter.ts
import { EventEmitter } from "node:events";

class BaseChannel extends EventEmitter {
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
// src/core/bus.ts
import { EventEmitter as EventEmitter2 } from "node:events";

class ChannelEventBus extends EventEmitter2 {
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
export {
  BaseChannel,
  ChannelHub,
  IdempotencyCache,
  IdentityStitcher,
  SmartStreamer,
  TokenBucketLimiter,
  createMessageContext
};
