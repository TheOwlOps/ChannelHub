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

// src/core/engine/bus.ts
import { EventEmitter } from "node:events";
var ChannelEventBus;
var init_bus = __esm(() => {
  ChannelEventBus = class ChannelEventBus extends EventEmitter {
    emitMessage(msg) {
      return this.emit("message", msg);
    }
    emitError(err) {
      if (this.listenerCount("error") === 0)
        return false;
      return this.emit("error", err);
    }
    emitStatus(status) {
      return this.emit("status", status);
    }
  };
});

// src/core/engine/stream.ts
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

// src/core/contracts/context.ts
function createMessageContext(message, channel, identity, handoffManager, sessionStore) {
  const isHandedOff = handoffManager ? handoffManager.isPaused(channel.name, message.chat.id) : false;
  const session = sessionStore?.getOrCreate(channel.name, message.chat.id);
  const recordAssistant = (text) => {
    sessionStore?.pushHistory(channel.name, message.chat.id, { role: "assistant", text });
  };
  return {
    message,
    channel,
    identity,
    session,
    isHandedOff,
    handoff: (durationMs, reason) => {
      if (handoffManager) {
        handoffManager.pause(channel.name, message.chat.id, durationMs, reason);
      }
    },
    resume: () => {
      return handoffManager ? handoffManager.resume(channel.name, message.chat.id) : false;
    },
    reply: async (text, options) => {
      const res = await channel.sendText(message.chat.id, text, {
        replyToId: message.id,
        ...options
      });
      recordAssistant(text);
      return res;
    },
    replyWithActions: async (text, actions, options) => {
      const res = await channel.sendText(message.chat.id, text, {
        replyToId: message.id,
        actions,
        ...options
      });
      recordAssistant(text);
      return res;
    },
    replyMedia: async (media, options) => {
      const res = await channel.sendMedia(message.chat.id, media, {
        replyToId: message.id,
        ...options
      });
      recordAssistant(media.caption ?? `[${media.type}]`);
      return res;
    },
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

// src/core/reliability/dedup.ts
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

// src/core/identity/identity.ts
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

// src/core/engine/handoff.ts
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

// src/core/engine/session.ts
class SessionStore {
  sessions = new Map;
  ttlMs;
  maxHistory;
  now;
  constructor(options = {}) {
    this.ttlMs = options.ttlMs ?? DEFAULT_TTL_MS;
    this.maxHistory = options.maxHistory ?? DEFAULT_MAX_HISTORY;
    this.now = options.now ?? Date.now;
  }
  static keyFor(channel, chatId) {
    return `${channel}:${chatId}`;
  }
  getOrCreate(channel, chatId) {
    const existing = this.live(SessionStore.keyFor(channel, chatId));
    if (existing) {
      this.touch(existing);
      return existing;
    }
    const at = this.now();
    const session = {
      key: SessionStore.keyFor(channel, chatId),
      channel,
      chatId,
      state: {},
      history: [],
      createdAt: at,
      updatedAt: at,
      expiresAt: at + this.ttlMs
    };
    this.sessions.set(session.key, session);
    return session;
  }
  get(channel, chatId) {
    const session = this.live(SessionStore.keyFor(channel, chatId));
    if (!session)
      return;
    this.touch(session);
    return session;
  }
  setState(channel, chatId, key, value) {
    this.getOrCreate(channel, chatId).state[key] = value;
  }
  getState(channel, chatId, key) {
    return this.get(channel, chatId)?.state[key];
  }
  pushHistory(channel, chatId, msg) {
    const session = this.getOrCreate(channel, chatId);
    session.history.push({ ...msg, at: msg.at ?? this.now() });
    if (session.history.length > this.maxHistory) {
      session.history.splice(0, session.history.length - this.maxHistory);
    }
    return session;
  }
  history(channel, chatId) {
    return [...this.get(channel, chatId)?.history ?? []];
  }
  clear(channel, chatId) {
    return this.sessions.delete(SessionStore.keyFor(channel, chatId));
  }
  sweep() {
    let removed = 0;
    for (const [key, session] of this.sessions) {
      if (this.now() > session.expiresAt) {
        this.sessions.delete(key);
        removed++;
      }
    }
    return removed;
  }
  get size() {
    return this.sessions.size;
  }
  live(key) {
    const session = this.sessions.get(key);
    if (!session)
      return;
    if (this.now() > session.expiresAt) {
      this.sessions.delete(key);
      return;
    }
    return session;
  }
  touch(session) {
    const at = this.now();
    session.updatedAt = at;
    session.expiresAt = at + this.ttlMs;
  }
}
var DEFAULT_TTL_MS, DEFAULT_MAX_HISTORY = 50;
var init_session = __esm(() => {
  DEFAULT_TTL_MS = 30 * 60000;
});

// src/core/engine/router.ts
function splitArgs(input) {
  const args = [];
  let current = "";
  let inQuotes = false;
  let hasToken = false;
  for (const ch of input) {
    if (ch === '"') {
      inQuotes = !inQuotes;
      hasToken = true;
    } else if (!inQuotes && /\s/.test(ch)) {
      if (hasToken) {
        args.push(current);
        current = "";
        hasToken = false;
      }
    } else {
      current += ch;
      hasToken = true;
    }
  }
  if (hasToken)
    args.push(current);
  return args;
}
function parseCommand(text, prefixes = DEFAULT_PREFIXES) {
  if (typeof text !== "string")
    return null;
  const trimmed = text.trim();
  if (!trimmed)
    return null;
  const prefix = [...prefixes].sort((a, b) => b.length - a.length).find((p) => p.length > 0 && trimmed.startsWith(p));
  if (!prefix)
    return null;
  const body = trimmed.slice(prefix.length);
  if (!body || /^\s/.test(body))
    return null;
  const firstSpace = body.search(/\s/);
  const token = firstSpace === -1 ? body : body.slice(0, firstSpace);
  const rawArgs = firstSpace === -1 ? "" : body.slice(firstSpace).trim();
  const name = token.split("@")[0].toLowerCase();
  if (!name)
    return null;
  return { name, args: splitArgs(rawArgs), rawArgs };
}
function matchesAny(value, expected) {
  if (expected === undefined)
    return true;
  return Array.isArray(expected) ? expected.includes(value) : expected === value;
}
function matchesPattern(text, pattern) {
  if (pattern === undefined)
    return true;
  if (typeof pattern === "string") {
    return text.toLowerCase().includes(pattern.toLowerCase());
  }
  pattern.lastIndex = 0;
  return pattern.test(text);
}

class CommandRouter {
  commands = new Map;
  commandInfos = [];
  routes = [];
  registerCommand(name, handler, opts) {
    const canonical = name.trim().toLowerCase();
    const aliases = (opts?.aliases ?? []).map((a) => a.trim().toLowerCase());
    const entry = {
      info: { name: canonical, aliases, description: opts?.description },
      handler
    };
    this.commands.set(canonical, entry);
    for (const alias of aliases)
      this.commands.set(alias, entry);
    this.commandInfos.push(entry.info);
    return this;
  }
  addRoute(rule) {
    this.routes.push(rule);
    return this;
  }
  listCommands() {
    return [...this.commandInfos];
  }
  get routeCount() {
    return this.routes.length;
  }
  get hasEntries() {
    return this.commands.size > 0 || this.routes.length > 0;
  }
  async dispatch(ctx) {
    const text = ctx.message.content.text ?? "";
    const parsed = parseCommand(text);
    if (parsed) {
      const entry = this.commands.get(parsed.name);
      if (entry) {
        await entry.handler(ctx, parsed.args, parsed.rawArgs);
        return true;
      }
    }
    for (const rule of this.routes) {
      if (!matchesAny(ctx.channel.name, rule.channel))
        continue;
      if (!matchesAny(ctx.message.chat.type, rule.chatType))
        continue;
      if (!matchesPattern(text, rule.pattern))
        continue;
      if (rule.predicate && !rule.predicate(ctx))
        continue;
      await rule.handler(ctx);
      return true;
    }
    return false;
  }
}
var DEFAULT_PREFIXES;
var init_router = __esm(() => {
  DEFAULT_PREFIXES = ["/", "!"];
});

// src/core/reliability/retry.ts
function defaultSleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
function computeBackoffDelay(attempt, options) {
  const baseDelayMs = options?.baseDelayMs ?? DEFAULT_BASE_DELAY_MS;
  const maxDelayMs = options?.maxDelayMs ?? DEFAULT_MAX_DELAY_MS;
  const jitter = options?.jitter ?? true;
  const exponential = baseDelayMs * 2 ** (attempt - 1);
  const capped = Math.min(maxDelayMs, exponential);
  if (!jitter)
    return capped;
  return Math.round(capped * (0.7 + Math.random() * 0.6));
}
async function withRetry(fn, options) {
  const retries = options?.retries ?? DEFAULT_RETRIES;
  const sleep = options?.sleep ?? defaultSleep;
  let lastError;
  for (let attempt = 0;attempt <= retries; attempt++) {
    try {
      return await fn(attempt);
    } catch (err) {
      lastError = err;
      if (attempt >= retries)
        break;
      if (options?.shouldRetry && !options.shouldRetry(err, attempt))
        throw err;
      const retryNumber = attempt + 1;
      const delayMs = computeBackoffDelay(retryNumber, options);
      options?.onRetry?.(err, retryNumber, delayMs);
      await sleep(delayMs);
    }
  }
  throw lastError;
}
var DEFAULT_BASE_DELAY_MS = 200, DEFAULT_MAX_DELAY_MS = 5000, DEFAULT_RETRIES = 3;

// src/core/engine/broadcast.ts
function renderTemplate(template, vars) {
  return template.replace(/\{\{([^{}]+)\}\}/g, (match, rawKey) => {
    const key = rawKey.trim();
    return Object.prototype.hasOwnProperty.call(vars, key) ? vars[key] : match;
  });
}
async function broadcastMessage(hub, targets, content, options = {}) {
  if (!content.text && !content.media) {
    throw new Error("broadcastMessage: content must include text or media");
  }
  const concurrency = Math.max(1, Math.floor(options.concurrency ?? 5));
  const startedAt = Date.now();
  const results = new Array(targets.length);
  let cursor = 0;
  const worker = async () => {
    while (true) {
      const index = cursor++;
      if (index >= targets.length)
        return;
      results[index] = await deliver(hub, targets[index], content, options.retry);
    }
  };
  const workerCount = Math.min(concurrency, targets.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  const sent = results.filter((r) => r.ok).length;
  return {
    total: targets.length,
    sent,
    failed: targets.length - sent,
    durationMs: Date.now() - startedAt,
    results
  };
}
async function deliver(hub, target, content, retry) {
  const base = { channel: target.channel, chatId: target.chatId };
  const adapter = hub.getChannel(target.channel);
  if (!adapter) {
    return {
      ...base,
      ok: false,
      attempts: 0,
      error: `Channel "${target.channel}" not found (no adapter registered)`
    };
  }
  const vars = {
    channel: target.channel,
    chatId: target.chatId,
    ...target.vars
  };
  const renderedText = content.text !== undefined ? renderTemplate(content.text, vars) : undefined;
  const doSend = async () => {
    if (content.media) {
      const media = { ...content.media };
      if (renderedText !== undefined && !media.caption) {
        media.caption = renderedText;
      }
      return adapter.sendMedia(target.chatId, media);
    }
    return adapter.sendText(target.chatId, renderedText);
  };
  let attempts = 0;
  try {
    let result;
    if (retry === false) {
      attempts = 1;
      result = await doSend();
    } else {
      result = await withRetry(async (attempt) => {
        attempts = attempt + 1;
        return doSend();
      }, retry);
    }
    return { ...base, ok: true, messageId: result.messageId, attempts };
  } catch (err) {
    return {
      ...base,
      ok: false,
      error: err instanceof Error ? err.message : String(err),
      attempts
    };
  }
}
var init_broadcast = () => {};

// src/core/reliability/scheduler.ts
class MessageScheduler {
  _sendFn;
  _now;
  _tickMs;
  _jobs = new Map;
  _counter = 0;
  _timer = null;
  _ticking = false;
  constructor(sendFn, options = {}) {
    if (typeof sendFn !== "function") {
      throw new Error("MessageScheduler: sendFn must be a function.");
    }
    this._sendFn = sendFn;
    this._now = options.now ?? (() => Date.now());
    this._tickMs = Math.max(1, options.tickMs ?? 250);
  }
  schedule(input) {
    if (!input.text || !input.text.trim()) {
      throw new Error('MessageScheduler.schedule: "text" must be a non-empty string.');
    }
    if (!input.channel || !input.channel.trim()) {
      throw new Error('MessageScheduler.schedule: "channel" must be a non-empty string.');
    }
    if (!input.chatId || !input.chatId.trim()) {
      throw new Error('MessageScheduler.schedule: "chatId" must be a non-empty string.');
    }
    if (input.everyMs !== undefined && !(input.everyMs > 0)) {
      throw new Error('MessageScheduler.schedule: "everyMs" must be a positive number.');
    }
    const now = this._now();
    let at;
    if (input.at !== undefined) {
      at = input.at;
    } else if (input.delayMs !== undefined) {
      at = now + input.delayMs;
    } else if (input.everyMs !== undefined) {
      at = now + input.everyMs;
    } else {
      at = now;
    }
    const job = {
      id: `job_${(++this._counter).toString(36)}_${Math.random().toString(36).slice(2, 10)}`,
      at,
      everyMs: input.everyMs,
      channel: input.channel,
      chatId: input.chatId,
      text: input.text,
      createdAt: now,
      runs: 0
    };
    this._jobs.set(job.id, job);
    return job;
  }
  cancel(id) {
    return this._jobs.delete(id);
  }
  get(id) {
    return this._jobs.get(id);
  }
  list() {
    return [...this._jobs.values()].sort((a, b) => a.at - b.at || a.createdAt - b.createdAt).map((job) => ({ ...job }));
  }
  get size() {
    return this._jobs.size;
  }
  clear() {
    this._jobs.clear();
  }
  async runDue(referenceNow) {
    const now = referenceNow ?? this._now();
    const due = [...this._jobs.values()].filter((job) => job.at <= now).sort((a, b) => a.at - b.at || a.createdAt - b.createdAt);
    let executed = 0;
    for (const job of due) {
      if (!this._jobs.has(job.id))
        continue;
      executed++;
      job.runs++;
      job.lastRunAt = now;
      try {
        await this._sendFn(job);
        delete job.lastError;
      } catch (err) {
        job.lastError = err instanceof Error ? err.message : String(err);
      }
      if (job.everyMs !== undefined) {
        const missed = Math.floor((now - job.at) / job.everyMs);
        job.at = job.at + job.everyMs * (missed + 1);
      } else {
        this._jobs.delete(job.id);
      }
    }
    return executed;
  }
  start() {
    if (this._timer !== null)
      return;
    this._timer = setInterval(() => {
      if (this._ticking)
        return;
      this._ticking = true;
      this.runDue().catch(() => {}).finally(() => {
        this._ticking = false;
      });
    }, this._tickMs);
    this._timer.unref?.();
  }
  stop() {
    if (this._timer !== null) {
      clearInterval(this._timer);
      this._timer = null;
    }
  }
  get running() {
    return this._timer !== null;
  }
}

// src/core/engine/flow.ts
class FlowManager {
  flows = new Map;
  define(def) {
    if (!def.steps || def.steps.length === 0) {
      throw new Error(`Flow "${def.name}" must define at least one step.`);
    }
    this.flows.set(def.name, def);
    return this;
  }
  listFlows() {
    return [...this.flows.keys()];
  }
  has(name) {
    return this.flows.has(name);
  }
  async start(ctx, name) {
    const def = this.flows.get(name);
    if (!def || !ctx.session)
      return false;
    const state = { flow: name, stepIndex: 0, data: {}, startedAt: Date.now() };
    ctx.session.state[FLOW_STATE_KEY] = state;
    await ctx.reply(await this.promptFor(def.steps[0], ctx, state.data));
    return true;
  }
  active(ctx) {
    if (!ctx.session)
      return;
    const state = ctx.session.state[FLOW_STATE_KEY];
    return state && typeof state.flow === "string" ? state : undefined;
  }
  cancel(ctx) {
    if (!ctx.session || !this.active(ctx))
      return false;
    delete ctx.session.state[FLOW_STATE_KEY];
    return true;
  }
  async handle(ctx) {
    const state = this.active(ctx);
    if (!state || !ctx.session)
      return false;
    const def = this.flows.get(state.flow);
    if (!def) {
      delete ctx.session.state[FLOW_STATE_KEY];
      return false;
    }
    const step = def.steps[state.stepIndex];
    if (!step) {
      delete ctx.session.state[FLOW_STATE_KEY];
      return false;
    }
    const text = ctx.message.content.text ?? "";
    const keywords = (def.cancelKeywords ?? DEFAULT_CANCEL_KEYWORDS).map((k) => k.trim().toLowerCase());
    if (keywords.includes(text.trim().toLowerCase())) {
      const data = state.data;
      delete ctx.session.state[FLOW_STATE_KEY];
      await def.onCancel?.(ctx, data);
      return true;
    }
    const value = step.parse ? step.parse(text, ctx) : text;
    if (step.validate) {
      const verdict = step.validate(value, state.data);
      if (typeof verdict === "string") {
        await ctx.reply(verdict);
        return true;
      }
    }
    state.data[step.id] = value;
    if (state.stepIndex < def.steps.length - 1) {
      state.stepIndex++;
      await ctx.reply(await this.promptFor(def.steps[state.stepIndex], ctx, state.data));
      return true;
    }
    const data = state.data;
    delete ctx.session.state[FLOW_STATE_KEY];
    await def.onComplete?.(ctx, data);
    return true;
  }
  async promptFor(step, ctx, data) {
    return typeof step.prompt === "function" ? await step.prompt(ctx, data) : step.prompt;
  }
}
var FLOW_STATE_KEY = "__flow", DEFAULT_CANCEL_KEYWORDS;
var init_flow = __esm(() => {
  DEFAULT_CANCEL_KEYWORDS = ["/cancel", "cancel", "hủy", "huỷ"];
});

// src/core/reliability/dead-letter-store.ts
class DeadLetterStore {
  _maxEntries;
  _items = [];
  constructor(options = {}) {
    this._maxEntries = Math.max(1, options.maxEntries ?? 100);
  }
  add(item) {
    this._items.push(item);
    while (this._items.length > this._maxEntries) {
      this._items.shift();
    }
  }
  list(filter) {
    if (filter?.channel === undefined) {
      return [...this._items];
    }
    return this._items.filter((item) => item.channel === filter.channel);
  }
  get size() {
    return this._items.length;
  }
  clear() {
    this._items = [];
  }
  async replay(handler) {
    const snapshot = [...this._items];
    let replayed = 0;
    let failed = 0;
    for (const item of snapshot) {
      try {
        await handler(item);
        const idx = this._items.indexOf(item);
        if (idx !== -1)
          this._items.splice(idx, 1);
        replayed++;
      } catch {
        item.retryCount++;
        failed++;
      }
    }
    return { replayed, failed };
  }
  takeFailed() {
    const drained = this._items;
    this._items = [];
    return drained;
  }
}

// src/core/insights/journal.ts
class MessageJournal {
  _maxEntries;
  _now;
  _entries = [];
  _nextId = 1;
  constructor(options = {}) {
    this._maxEntries = Math.max(1, options.maxEntries ?? 1000);
    this._now = options.now ?? Date.now;
  }
  record(entry) {
    const stored = {
      ...entry,
      id: this._nextId++,
      at: entry.at ?? this._now()
    };
    this._entries.push(stored);
    if (this._entries.length > this._maxEntries) {
      this._entries.splice(0, this._entries.length - this._maxEntries);
    }
    return stored;
  }
  inbound(msg) {
    return this.record({ ...msg, type: "inbound" });
  }
  outbound(msg) {
    return this.record({ ...msg, type: "outbound" });
  }
  error(channel, err, chatId) {
    return this.record({
      type: "error",
      channel,
      chatId,
      error: err instanceof Error ? err.message : err
    });
  }
  query(q = {}) {
    const limit = q.limit ?? 50;
    const out = [];
    for (let i = this._entries.length - 1;i >= 0 && out.length < limit; i--) {
      const e = this._entries[i];
      if (q.channel !== undefined && e.channel !== q.channel)
        continue;
      if (q.chatId !== undefined && e.chatId !== q.chatId)
        continue;
      if (q.type !== undefined && e.type !== q.type)
        continue;
      out.push(e);
    }
    return out;
  }
  recent(n = 50) {
    return this.query({ limit: n });
  }
  summary() {
    const s = { total: 0, inbound: 0, outbound: 0, errors: 0, perChannel: {} };
    for (const e of this._entries) {
      s.total++;
      if (e.type === "inbound")
        s.inbound++;
      else if (e.type === "outbound")
        s.outbound++;
      else
        s.errors++;
      s.perChannel[e.channel] = (s.perChannel[e.channel] ?? 0) + 1;
    }
    return s;
  }
  toJSONL() {
    return this._entries.map((e) => JSON.stringify(e)).join(`
`);
  }
  get size() {
    return this._entries.length;
  }
  clear() {
    this._entries = [];
  }
}

// src/core/reliability/watchdog.ts
class ConnectionWatchdog {
  _getChannels;
  _intervalMs;
  _baseDelayMs;
  _maxDelayMs;
  _maxFailures;
  _now;
  _onEvent;
  _states = new Map;
  _timer = null;
  _checking = false;
  constructor(getChannels, options = {}) {
    this._getChannels = getChannels;
    this._intervalMs = options.intervalMs ?? 30000;
    this._baseDelayMs = options.baseDelayMs ?? 1000;
    this._maxDelayMs = options.maxDelayMs ?? 60000;
    this._maxFailures = options.maxFailures ?? 0;
    this._now = options.now ?? Date.now;
    this._onEvent = options.onEvent;
  }
  _stateFor(name) {
    let state = this._states.get(name);
    if (!state) {
      state = { failures: 0, gaveUp: false };
      this._states.set(name, state);
    }
    return state;
  }
  _emit(event) {
    this._onEvent?.(event);
  }
  async checkOnce() {
    const now = this._now();
    for (const channel of this._getChannels()) {
      const state = this._stateFor(channel.name);
      if (channel.isConnected()) {
        if (state.failures > 0 || state.gaveUp || state.nextAttemptAt !== undefined) {
          state.failures = 0;
          state.nextAttemptAt = undefined;
          state.gaveUp = false;
          state.lastError = undefined;
        }
        continue;
      }
      if (state.gaveUp)
        continue;
      if (state.nextAttemptAt !== undefined && now < state.nextAttemptAt)
        continue;
      try {
        await channel.connect();
        const hadFailures = state.failures > 0;
        state.failures = 0;
        state.nextAttemptAt = undefined;
        state.gaveUp = false;
        state.lastError = undefined;
        if (hadFailures) {
          this._emit({ type: "reconnected", channel: channel.name, failures: 0, at: this._now() });
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        state.failures++;
        state.lastError = message;
        const delay = Math.min(this._maxDelayMs, this._baseDelayMs * 2 ** (state.failures - 1));
        state.nextAttemptAt = now + delay;
        const at = this._now();
        this._emit({
          type: "reconnect_failed",
          channel: channel.name,
          failures: state.failures,
          error: message,
          at
        });
        if (this._maxFailures > 0 && state.failures >= this._maxFailures) {
          state.gaveUp = true;
          this._emit({
            type: "gave_up",
            channel: channel.name,
            failures: state.failures,
            error: message,
            at
          });
        }
      }
    }
  }
  status() {
    return this._getChannels().map((channel) => {
      const state = this._states.get(channel.name);
      return {
        channel: channel.name,
        connected: channel.isConnected(),
        failures: state?.failures ?? 0,
        nextAttemptAt: state?.nextAttemptAt,
        gaveUp: state?.gaveUp ?? false
      };
    });
  }
  start() {
    if (this._timer)
      return;
    this._timer = setInterval(() => {
      if (this._checking)
        return;
      this._checking = true;
      this.checkOnce().catch(() => {}).finally(() => {
        this._checking = false;
      });
    }, this._intervalMs);
    this._timer.unref?.();
  }
  stop() {
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
  }
  get running() {
    return this._timer !== null;
  }
  reset(channelName) {
    if (channelName !== undefined) {
      this._states.delete(channelName);
    } else {
      this._states.clear();
    }
  }
}

// src/core/insights/stats.ts
function pad2(n) {
  return String(n).padStart(2, "0");
}
function dayKey(ts) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function hourKey(ts) {
  const d = new Date(ts);
  return `${dayKey(ts)}T${pad2(d.getHours())}`;
}

class StatsCollector {
  startedAt;
  retentionDays;
  maxUsersPerDay;
  topUsersLimit;
  totals = { inbound: 0, outbound: 0, errors: 0 };
  channels = new Map;
  hourly = new Map;
  daily = new Map;
  constructor(options = {}) {
    this.retentionDays = options.retentionDays ?? 30;
    this.maxUsersPerDay = options.maxUsersPerDay ?? 5000;
    this.topUsersLimit = options.topUsersLimit ?? 10;
    this.startedAt = Date.now();
  }
  recordInbound(msg, ts = Date.now()) {
    const channel = String(msg.channel || "unknown");
    this.totals.inbound++;
    const c = this.channelEntry(channel);
    c.inbound++;
    c.lastInbound = ts;
    const hk = hourKey(ts);
    const h = this.hourly.get(hk) ?? { inbound: 0, outbound: 0 };
    h.inbound++;
    this.hourly.set(hk, h);
    const dk = dayKey(ts);
    const d = this.dailyEntry(dk);
    d.inbound++;
    const id = String(msg.sender?.id ?? "unknown");
    const name = msg.sender?.name || msg.sender?.username || id;
    const existing = d.users.get(id);
    if (existing) {
      existing.count++;
      existing.lastSeen = ts;
      existing.channel = channel;
      if (msg.sender?.name)
        existing.name = name;
    } else if (d.users.size < this.maxUsersPerDay) {
      d.users.set(id, { id, name, channel, count: 1, lastSeen: ts });
    } else {
      d.overflow++;
    }
  }
  recordOutbound(channel, ts = Date.now()) {
    this.totals.outbound++;
    const c = this.channelEntry(channel);
    c.outbound++;
    c.lastOutbound = ts;
    const hk = hourKey(ts);
    const h = this.hourly.get(hk) ?? { inbound: 0, outbound: 0 };
    h.outbound++;
    this.hourly.set(hk, h);
    this.dailyEntry(dayKey(ts)).outbound++;
  }
  recordError(channel) {
    this.totals.errors++;
    this.channelEntry(channel).errors++;
  }
  snapshot(now = Date.now()) {
    this.prune(now);
    const perChannel = Array.from(this.channels.entries()).map(([channel, s]) => ({ channel, ...s })).sort((a, b) => b.inbound + b.outbound - (a.inbound + a.outbound));
    const endHour = new Date(now);
    endHour.setMinutes(0, 0, 0);
    const hourly24 = [];
    for (let i = 23;i >= 0; i--) {
      const d = new Date(endHour);
      d.setHours(endHour.getHours() - i);
      const key = hourKey(d.getTime());
      const b = this.hourly.get(key) ?? { inbound: 0, outbound: 0 };
      hourly24.push({
        key,
        label: `${pad2(d.getHours())}:00 ${dayKey(d.getTime()).slice(5)}`,
        inbound: b.inbound,
        outbound: b.outbound
      });
    }
    const heatmap = [];
    for (let i = 6;i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dk = dayKey(d.getTime());
      const hours = [];
      for (let h = 0;h < 24; h++) {
        hours.push(this.hourly.get(`${dk}T${pad2(h)}`)?.inbound ?? 0);
      }
      heatmap.push({ date: dk, weekday: WEEKDAYS[d.getDay()], hours });
    }
    const daily14 = [];
    for (let i = 13;i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dk = dayKey(d.getTime());
      const b = this.daily.get(dk);
      daily14.push({
        date: dk,
        inbound: b?.inbound ?? 0,
        outbound: b?.outbound ?? 0
      });
    }
    const cutoff7d = dayKey(now - 6 * 86400000);
    const merged = new Map;
    for (const [date, bucket] of this.daily) {
      if (date < cutoff7d)
        continue;
      for (const [ukey, u] of bucket.users) {
        const agg = merged.get(ukey);
        if (agg) {
          agg.count += u.count;
          if (u.lastSeen > agg.lastSeen) {
            agg.lastSeen = u.lastSeen;
            agg.name = u.name;
          }
        } else {
          merged.set(ukey, { ...u });
        }
      }
    }
    const topUsers = Array.from(merged.values()).sort((a, b) => b.count - a.count).slice(0, this.topUsersLimit);
    const todayBucket = this.daily.get(dayKey(now));
    return {
      generatedAt: now,
      totals: { ...this.totals },
      today: {
        inbound: todayBucket?.inbound ?? 0,
        outbound: todayBucket?.outbound ?? 0,
        activeUsers: todayBucket?.users.size ?? 0
      },
      activeUsers: {
        today: todayBucket?.users.size ?? 0,
        last7d: merged.size
      },
      perChannel,
      hourly24,
      heatmap,
      daily14,
      topUsers
    };
  }
  prune(now = Date.now()) {
    const cutoffDay = dayKey(now - this.retentionDays * 86400000);
    for (const key of this.daily.keys()) {
      if (key < cutoffDay)
        this.daily.delete(key);
    }
    const cutoffHour = `${cutoffDay}T00`;
    for (const key of this.hourly.keys()) {
      if (key < cutoffHour)
        this.hourly.delete(key);
    }
  }
  toJSON() {
    this.prune();
    return {
      version: 1,
      startedAt: this.startedAt,
      totals: { ...this.totals },
      channels: Array.from(this.channels.entries(), ([channel, s]) => ({ channel, ...s })),
      hourly: Array.from(this.hourly.entries(), ([key, b]) => ({ key, ...b })),
      daily: Array.from(this.daily.entries(), ([date, d]) => ({
        date,
        inbound: d.inbound,
        outbound: d.outbound,
        overflow: d.overflow,
        users: Array.from(d.users.values())
      }))
    };
  }
  hydrate(data) {
    if (!data || typeof data !== "object")
      return false;
    const raw = data;
    if (raw.version !== 1)
      return false;
    if (!raw.totals || !Array.isArray(raw.channels) || !Array.isArray(raw.hourly) || !Array.isArray(raw.daily)) {
      return false;
    }
    this.totals = {
      inbound: Number(raw.totals.inbound) || 0,
      outbound: Number(raw.totals.outbound) || 0,
      errors: Number(raw.totals.errors) || 0
    };
    this.channels = new Map(raw.channels.filter((c) => c && typeof c.channel === "string").map((c) => [
      c.channel,
      {
        inbound: Number(c.inbound) || 0,
        outbound: Number(c.outbound) || 0,
        errors: Number(c.errors) || 0,
        lastInbound: c.lastInbound ?? null,
        lastOutbound: c.lastOutbound ?? null
      }
    ]));
    this.hourly = new Map(raw.hourly.filter((h) => h && typeof h.key === "string").map((h) => [
      h.key,
      { inbound: Number(h.inbound) || 0, outbound: Number(h.outbound) || 0 }
    ]));
    this.daily = new Map(raw.daily.filter((d) => d && typeof d.date === "string").map((d) => {
      const bucket = {
        inbound: Number(d.inbound) || 0,
        outbound: Number(d.outbound) || 0,
        users: new Map,
        overflow: Number(d.overflow) || 0
      };
      if (Array.isArray(d.users)) {
        for (const u of d.users) {
          if (!u || typeof u.id !== "string")
            continue;
          bucket.users.set(u.id, {
            id: u.id,
            name: String(u.name || u.id),
            channel: String(u.channel || "unknown"),
            count: Number(u.count) || 0,
            lastSeen: Number(u.lastSeen) || 0
          });
        }
      }
      return [d.date, bucket];
    }));
    this.prune();
    return true;
  }
  channelEntry(channel) {
    let c = this.channels.get(channel);
    if (!c) {
      c = { inbound: 0, outbound: 0, errors: 0, lastInbound: null, lastOutbound: null };
      this.channels.set(channel, c);
    }
    return c;
  }
  dailyEntry(date) {
    let d = this.daily.get(date);
    if (!d) {
      d = { inbound: 0, outbound: 0, users: new Map, overflow: 0 };
      this.daily.set(date, d);
    }
    return d;
  }
}
var WEEKDAYS;
var init_stats = __esm(() => {
  WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
});

// src/bridges/dashboard/html.ts
var DASHBOARD_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>ChannelHub &middot; Live Dashboard</title>
<style>
  :root {
    --bg: #0d1117; --panel: #161b22; --panel2: #1c2333;
    --border: #21262d; --text: #e6edf3; --muted: #8b949e;
    --accent: #8b5cf6; --accent2: #22d3ee; --green: #3fb950; --red: #f85149; --amber: #d29922;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    background: var(--bg); color: var(--text);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    font-size: 14px; line-height: 1.5;
    background-image: radial-gradient(1200px 400px at 50% -100px, rgba(139, 92, 246, 0.12), transparent);
  }
  header {
    max-width: 1100px; margin: 0 auto; padding: 28px 20px 8px;
    display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px;
  }
  .brand { display: flex; align-items: center; gap: 10px; }
  .brand .logo { font-size: 26px; }
  .brand h1 { font-size: 20px; font-weight: 600; letter-spacing: -0.3px; }
  .brand h1 em { font-style: normal; background: linear-gradient(90deg, var(--accent), var(--accent2)); -webkit-background-clip: text; background-clip: text; color: transparent; }
  .meta { display: flex; align-items: center; gap: 10px; color: var(--muted); font-size: 12.5px; flex-wrap: wrap; }
  .pill { padding: 2px 10px; border-radius: 999px; font-weight: 600; font-size: 11px; letter-spacing: 0.5px; }
  .pill.live { color: var(--green); background: rgba(63, 185, 80, 0.12); border: 1px solid rgba(63, 185, 80, 0.35); }
  .pill.down { color: var(--red); background: rgba(248, 81, 73, 0.12); border: 1px solid rgba(248, 81, 73, 0.35); }
  main { max-width: 1100px; margin: 0 auto; padding: 16px 20px 40px; }
  .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; margin-bottom: 16px; }
  .card {
    background: var(--panel); border: 1px solid var(--border); border-radius: 10px;
    padding: 14px 16px; position: relative; overflow: hidden;
  }
  .card::before { content: ""; position: absolute; inset: 0 auto 0 0; width: 3px; background: var(--accent); opacity: 0.7; }
  .card.c2::before { background: var(--accent2); }
  .card.c3::before { background: var(--green); }
  .card.c4::before { background: var(--red); }
  .card.c5::before { background: var(--amber); }
  .card.c6::before { background: #58a6ff; }
  .card .k { color: var(--muted); font-size: 11px; text-transform: uppercase; letter-spacing: 0.8px; }
  .card .v { font-size: 26px; font-weight: 700; margin-top: 2px; font-variant-numeric: tabular-nums; }
  .card .s { color: var(--muted); font-size: 11.5px; margin-top: 2px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; }
  @media (max-width: 800px) { .grid { grid-template-columns: 1fr; } }
  .panel { background: var(--panel); border: 1px solid var(--border); border-radius: 10px; padding: 16px; }
  .panel.wide { grid-column: 1 / -1; }
  .panel h2 { font-size: 13px; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 12px; }
  .chart { width: 100%; height: auto; display: block; }
  .legend { display: flex; gap: 16px; margin-top: 8px; color: var(--muted); font-size: 12px; }
  .legend i { display: inline-block; width: 10px; height: 10px; border-radius: 2px; margin-right: 5px; vertical-align: -1px; }
  .hlabels { display: flex; justify-content: space-between; color: var(--muted); font-size: 11px; margin-top: 4px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { text-align: left; color: var(--muted); font-weight: 500; font-size: 11.5px; text-transform: uppercase; letter-spacing: 0.5px; padding: 6px 8px; border-bottom: 1px solid var(--border); }
  td { padding: 7px 8px; border-bottom: 1px solid rgba(33, 38, 45, 0.6); }
  tr:last-child td { border-bottom: none; }
  td.num, th.num { text-align: right; font-variant-numeric: tabular-nums; }
  .who b { font-weight: 600; }
  .who span { display: block; color: var(--muted); font-size: 11.5px; }
  .tag { display: inline-block; padding: 1px 8px; border-radius: 999px; font-size: 11px; background: rgba(139, 92, 246, 0.15); color: #c4b5fd; border: 1px solid rgba(139, 92, 246, 0.3); }
  .dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 6px; }
  .dot.on { background: var(--green); box-shadow: 0 0 6px rgba(63, 185, 80, 0.8); }
  .dot.off { background: var(--muted); }
  .brow { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
  .brow .bname { width: 90px; color: var(--muted); font-size: 12.5px; text-align: right; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .brow .btrack { flex: 1; height: 14px; background: var(--panel2); border-radius: 4px; overflow: hidden; }
  .brow .bfill { height: 100%; border-radius: 4px; background: linear-gradient(90deg, var(--accent), var(--accent2)); min-width: 2px; }
  .brow .bval { width: 60px; font-size: 12px; font-variant-numeric: tabular-nums; }
  .hm { display: flex; flex-direction: column; gap: 3px; }
  .hmrow { display: grid; grid-template-columns: 76px repeat(24, 1fr); gap: 3px; align-items: center; }
  .hmhead { margin-bottom: 2px; }
  .hmlabel { color: var(--muted); font-size: 11px; white-space: nowrap; }
  .hmhour { color: var(--muted); font-size: 10px; text-align: center; }
  .hmcell { height: 16px; border-radius: 3px; background: var(--panel2); }
  .foot { text-align: center; color: var(--muted); font-size: 12px; margin-top: 24px; }
  .empty { color: var(--muted); font-style: italic; padding: 8px; }
</style>
</head>
<body>
<header>
  <div class="brand"><span class="logo">&#127760;</span><h1>ChannelHub <em>Dashboard</em></h1></div>
  <div class="meta">
    <span id="status" class="pill live">&#9679; LIVE</span>
    <span id="uptime">&mdash;</span>
    <span id="updated">&mdash;</span>
  </div>
</header>
<main>
  <section id="cards" class="cards"></section>

  <section class="grid">
    <article class="panel wide">
      <h2>Messages &mdash; last 24 hours</h2>
      <div id="hourly"></div>
      <div class="legend"><span><i style="background:#8b5cf6"></i>Inbound</span><span><i style="background:#22d3ee"></i>Outbound</span></div>
      <div id="hourlyLabels" class="hlabels"></div>
    </article>
    <article class="panel wide">
      <h2>Daily traffic &mdash; last 14 days</h2>
      <div id="daily"></div>
      <div class="legend"><span><i style="background:#8b5cf6"></i>Inbound</span><span><i style="background:#22d3ee"></i>Outbound</span></div>
    </article>
    <article class="panel">
      <h2>Top channels</h2>
      <div id="channelBars"></div>
    </article>
    <article class="panel">
      <h2>Top users &mdash; 7 days</h2>
      <table id="topUsers"></table>
    </article>
    <article class="panel wide">
      <h2>Activity heatmap &mdash; 7 days &times; 24h (inbound)</h2>
      <div id="heatmap"></div>
    </article>
    <article class="panel wide">
      <h2>Channels</h2>
      <table id="channelTable"></table>
    </article>
  </section>

  <p class="foot">ChannelHub SDK &middot; <span id="gen">&mdash;</span></p>
</main>
<script>
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var KEY = null;
  try { KEY = sessionStorage.getItem("chkey"); } catch (e) {}

  function headers() {
    return KEY ? { "Authorization": "Bearer " + KEY } : {};
  }
  function fmt(n) {
    if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\\.0$/, "") + "M";
    if (n >= 1000) return (n / 1000).toFixed(1).replace(/\\.0$/, "") + "k";
    return String(n);
  }
  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  function timeAgo(ts) {
    if (!ts) return "never";
    var s = Math.max(0, Math.floor(Date.now() / 1000 - ts / 1000));
    if (s < 60) return "just now";
    if (s < 3600) return Math.floor(s / 60) + "m ago";
    if (s < 86400) return Math.floor(s / 3600) + "h ago";
    return Math.floor(s / 86400) + "d ago";
  }
  function uptime(sec) {
    var d = Math.floor(sec / 86400), h = Math.floor((sec % 86400) / 3600), m = Math.floor((sec % 3600) / 60);
    if (d > 0) return d + "d " + h + "h";
    if (h > 0) return h + "h " + m + "m";
    return m + "m " + (sec % 60) + "s";
  }

  function load() {
    fetch("/api/stats", { headers: headers() }).then(function (r) {
      if (r.status === 401) {
        var k = window.prompt("Dashboard API key:");
        if (k !== null) {
          KEY = k;
          try { sessionStorage.setItem("chkey", k); } catch (e) {}
        }
        return null;
      }
      if (!r.ok) throw new Error("http " + r.status);
      return r.json();
    }).then(function (s) {
      if (s) { $("status").className = "pill live"; render(s); }
    }).catch(function () {
      $("status").className = "pill down";
    });
  }

  function card(k, v, s, cls) {
    return '<div class="card ' + (cls || "") + '"><div class="k">' + k + '</div><div class="v">' + v + '</div><div class="s">' + s + "</div></div>";
  }

  function svgHourly(data) {
    var W = 760, H = 170, bw = W / 24, top = 26;
    var max = 1, i, d;
    for (i = 0; i < data.length; i++) max = Math.max(max, data[i].inbound, data[i].outbound);
    var grid = "";
    for (i = 1; i <= 3; i++) {
      var y = Math.round(H - (H - top) * i / 3);
      grid += '<line x1="0" y1="' + y + '" x2="' + W + '" y2="' + y + '" stroke="#21262d" stroke-width="1"/>';
    }
    var bars = "";
    for (i = 0; i < data.length; i++) {
      d = data[i];
      var h1 = Math.round(d.inbound / max * (H - top));
      var h2 = Math.round(d.outbound / max * (H - top));
      var x = i * bw;
      bars += '<rect x="' + (x + 2).toFixed(1) + '" y="' + (H - h1) + '" width="' + (bw / 2 - 3).toFixed(1) + '" height="' + h1 + '" rx="2" fill="#8b5cf6"><title>' + esc(d.label) + " &middot; in " + d.inbound + "</title></rect>";
      bars += '<rect x="' + (x + bw / 2 + 1).toFixed(1) + '" y="' + (H - h2) + '" width="' + (bw / 2 - 3).toFixed(1) + '" height="' + h2 + '" rx="2" fill="#22d3ee"><title>' + esc(d.label) + " &middot; out " + d.outbound + "</title></rect>";
    }
    return '<svg viewBox="0 0 ' + W + " " + H + '" preserveAspectRatio="none" class="chart" style="height:170px">' + grid + bars + "</svg>";
  }

  function svgDaily(data) {
    var W = 760, H = 150, top = 20;
    var n = data.length, max = 1, i;
    for (i = 0; i < n; i++) max = Math.max(max, data[i].inbound, data[i].outbound);
    var pts = [], ptsOut = [];
    for (i = 0; i < n; i++) {
      var x = n === 1 ? W / 2 : i * W / (n - 1);
      pts.push([x, H - Math.round(data[i].inbound / max * (H - top))]);
      ptsOut.push([x, H - Math.round(data[i].outbound / max * (H - top))]);
    }
    var line = pts.map(function (p) { return p[0].toFixed(1) + "," + p[1]; }).join(" ");
    var lineOut = ptsOut.map(function (p) { return p[0].toFixed(1) + "," + p[1]; }).join(" ");
    var area = "M0," + H + " L" + line.replace(/ /g, " L") + " L" + W + "," + H + " Z";
    var dots = "";
    for (i = 0; i < n; i++) {
      dots += '<circle cx="' + pts[i][0].toFixed(1) + '" cy="' + pts[i][1] + '" r="3" fill="#8b5cf6"><title>' + esc(data[i].date) + " &middot; " + data[i].inbound + " in / " + data[i].outbound + " out</title></circle>";
    }
    var labels = "";
    for (i = 0; i < n; i += 2) {
      var anchor = "middle";
      if (i === 0) anchor = "start";
      else if (i >= n - 2) anchor = "end";
      labels += '<text x="' + pts[i][0].toFixed(1) + '" y="' + (H - 4) + '" font-size="10" fill="#8b949e" text-anchor="' + anchor + '">' + data[i].date.slice(5) + "</text>";
    }
    var svg = '<svg viewBox="0 0 ' + W + " " + H + '" preserveAspectRatio="none" class="chart" style="height:150px">';
    svg += '<defs><linearGradient id="ga" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#8b5cf6" stop-opacity="0.35"/><stop offset="100%" stop-color="#8b5cf6" stop-opacity="0"/></linearGradient></defs>';
    svg += '<path d="' + area + '" fill="url(#ga)"/>';
    svg += '<polyline points="' + line + '" fill="none" stroke="#8b5cf6" stroke-width="2"/>';
    svg += '<polyline points="' + lineOut + '" fill="none" stroke="#22d3ee" stroke-width="2" opacity="0.85"/>';
    svg += dots + labels + "</svg>";
    return svg;
  }

  function renderHeatmap(days) {
    var max = 1, r, c;
    for (r = 0; r < days.length; r++) for (c = 0; c < 24; c++) max = Math.max(max, days[r].hours[c]);
    var html = '<div class="hm"><div class="hmrow hmhead"><div class="hmlabel"></div>';
    for (c = 0; c < 24; c++) html += '<div class="hmhour">' + (c % 3 === 0 ? c : "") + "</div>";
    html += "</div>";
    for (r = 0; r < days.length; r++) {
      html += '<div class="hmrow"><div class="hmlabel">' + esc(days[r].weekday + " " + days[r].date.slice(5)) + "</div>";
      for (c = 0; c < 24; c++) {
        var v = days[r].hours[c];
        var a = v === 0 ? 0 : Math.max(0.18, v / max);
        var bg = v === 0 ? "" : ' style="background:rgba(139,92,246,' + a.toFixed(2) + ')"';
        html += '<div class="hmcell"' + bg + ' title="' + esc(days[r].date) + " " + c + ":00 &middot; " + v + '"></div>';
      }
      html += "</div>";
    }
    return html + "</div>";
  }

  function render(s) {
    var t = s.totals, sum24 = 0, i;
    for (i = 0; i < s.hourly24.length; i++) sum24 += s.hourly24[i].inbound;
    var connected = 0;
    for (i = 0; i < s.runtime.channels.length; i++) if (s.runtime.channels[i].connected) connected++;

    $("cards").innerHTML =
      card("Messages in", fmt(t.inbound), "today " + fmt(s.today.inbound), "c1") +
      card("Messages out", fmt(t.outbound), "today " + fmt(s.today.outbound), "c2") +
      card("Active users", fmt(s.activeUsers.last7d), "today " + fmt(s.today.activeUsers), "c3") +
      card("Last 24h", fmt(sum24), "inbound messages", "c6") +
      card("Errors", fmt(t.errors), "all channels", "c4") +
      card("Channels", connected + "/" + s.runtime.channels.length, "connected", "c5");

    $("uptime").textContent = "uptime " + uptime(s.runtime.uptimeSec);
    $("updated").textContent = "updated " + new Date(s.generatedAt).toLocaleTimeString();
    $("gen").textContent = "snapshot " + new Date(s.generatedAt).toLocaleString();

    $("hourly").innerHTML = svgHourly(s.hourly24);
    var lbl = "", step = Math.ceil(s.hourly24.length / 8);
    for (i = 0; i < s.hourly24.length; i += step) lbl += "<span>" + s.hourly24[i].label + "</span>";
    $("hourlyLabels").innerHTML = lbl;
    $("daily").innerHTML = svgDaily(s.daily14);

    var bars = "", maxCh = 1;
    for (i = 0; i < s.perChannel.length; i++) maxCh = Math.max(maxCh, s.perChannel[i].inbound + s.perChannel[i].outbound);
    if (!s.perChannel.length) bars = '<div class="empty">No traffic recorded yet.</div>';
    for (i = 0; i < Math.min(s.perChannel.length, 8); i++) {
      var ch = s.perChannel[i], total = ch.inbound + ch.outbound;
      bars += '<div class="brow"><span class="bname">' + esc(ch.channel) + '</span><div class="btrack"><div class="bfill" style="width:' + Math.max(2, Math.round(total / maxCh * 100)) + '%"></div></div><span class="bval">' + fmt(total) + "</span></div>";
    }
    $("channelBars").innerHTML = bars;

    var tu = '<tr><th>#</th><th>User</th><th>Channel</th><th class="num">Msgs</th><th class="num">Last seen</th></tr>';
    if (!s.topUsers.length) tu += '<tr><td colspan="5" class="empty">No users recorded yet.</td></tr>';
    for (i = 0; i < s.topUsers.length; i++) {
      var u = s.topUsers[i];
      tu += '<tr><td class="num">' + (i + 1) + '</td><td class="who"><b>' + esc(u.name) + "</b><span>" + esc(u.id) + '</span></td><td><span class="tag">' + esc(u.channel) + '</span></td><td class="num">' + fmt(u.count) + '</td><td class="num">' + timeAgo(u.lastSeen) + "</td></tr>";
    }
    $("topUsers").innerHTML = tu;

    $("heatmap").innerHTML = renderHeatmap(s.heatmap);

    var ct = '<tr><th>Status</th><th>Channel</th><th class="num">In</th><th class="num">Out</th><th class="num">Errors</th><th class="num">Last in</th><th class="num">Last out</th></tr>';
    var rc = {};
    for (i = 0; i < s.runtime.channels.length; i++) rc[s.runtime.channels[i].key.split(":")[0]] = s.runtime.channels[i].connected;
    if (!s.perChannel.length) ct += '<tr><td colspan="7" class="empty">No channels recorded yet.</td></tr>';
    for (i = 0; i < s.perChannel.length; i++) {
      var p = s.perChannel[i];
      var on = rc[p.channel] !== undefined ? rc[p.channel] : s.runtime.channels.length === 0 ? false : true;
      ct += '<tr><td><span class="dot ' + (on ? "on" : "off") + '"></span>' + (on ? "online" : "offline") + '</td><td><b>' + esc(p.channel) + '</b></td><td class="num">' + fmt(p.inbound) + '</td><td class="num">' + fmt(p.outbound) + '</td><td class="num">' + fmt(p.errors) + '</td><td class="num">' + timeAgo(p.lastInbound) + '</td><td class="num">' + timeAgo(p.lastOutbound) + "</td></tr>";
    }
    $("channelTable").innerHTML = ct;
  }

  setInterval(load, 5000);
  load();
})();
</script>
</body>
</html>`;

// src/bridges/dashboard/dashboard.ts
import { createServer } from "node:http";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { timingSafeEqual } from "node:crypto";

class DashboardBridge {
  hub;
  config;
  server = null;
  flushTimer = null;
  stats;
  constructor(hub, config = {}) {
    this.hub = hub;
    const dataFile = config.dataFile !== undefined ? config.dataFile : process.env.CHANNELHUB_STATS_FILE || null;
    this.stats = config.collector ?? hub.stats ?? new StatsCollector;
    hub.stats = this.stats;
    if (dataFile && !config.collector && existsSync(dataFile)) {
      try {
        this.stats.hydrate(JSON.parse(readFileSync(dataFile, "utf8")));
      } catch {}
    }
    this.config = {
      port: config.port ?? 8790,
      host: config.host ?? "127.0.0.1",
      pathPrefix: config.pathPrefix ?? "",
      apiKey: config.apiKey ?? process.env.CHANNELHUB_DASHBOARD_KEY ?? "",
      dataFile: dataFile ? resolve(dataFile) : null,
      flushIntervalMs: config.flushIntervalMs ?? 15000,
      collector: config.collector
    };
  }
  async start() {
    this.server = createServer((req, res) => this.handle(req, res));
    await new Promise((resolve) => {
      this.server.listen(this.config.port, this.config.host, () => resolve());
    });
    if (this.config.dataFile) {
      this.flushTimer = setInterval(() => {
        try {
          this.flush();
        } catch {}
      }, this.config.flushIntervalMs);
      this.flushTimer.unref?.();
    }
  }
  async stop() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    if (this.server) {
      await new Promise((resolve, reject) => {
        this.server.close((err) => err ? reject(err) : resolve());
      });
      this.server = null;
    }
    this.flush();
  }
  get endpoint() {
    if (!this.server)
      return null;
    const addr = this.server.address();
    if (!addr || typeof addr === "string")
      return null;
    return `http://${this.config.host}:${addr.port}`;
  }
  flush() {
    if (!this.config.dataFile)
      return;
    mkdirSync(dirname(this.config.dataFile), { recursive: true });
    const tmp = `${this.config.dataFile}.tmp`;
    writeFileSync(tmp, JSON.stringify(this.stats.toJSON()));
    renameSync(tmp, this.config.dataFile);
  }
  path(req) {
    const bare = (req.url || "/").split("?")[0];
    return bare.startsWith(this.config.pathPrefix) ? bare.slice(this.config.pathPrefix.length) || "/" : bare;
  }
  authenticate(req) {
    const isLoopback = this.config.host === "127.0.0.1" || this.config.host === "localhost";
    if (!this.config.apiKey) {
      if (!isLoopback)
        return false;
      return true;
    }
    const authHeader = req.headers["authorization"];
    if (!authHeader || !authHeader.startsWith("Bearer "))
      return false;
    const tokenBuf = Buffer.from(authHeader.slice(7).trim());
    const keyBuf = Buffer.from(this.config.apiKey);
    if (tokenBuf.length !== keyBuf.length)
      return false;
    return timingSafeEqual(tokenBuf, keyBuf);
  }
  handle(req, res) {
    const p = this.path(req);
    if (req.method === "GET" && (p === "/" || p === "/index.html")) {
      const body = Buffer.from(DASHBOARD_HTML);
      res.writeHead(200, {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Length": body.length,
        "Cache-Control": "no-store"
      });
      res.end(body);
      return;
    }
    if (req.method === "GET" && p === "/health") {
      return this.json(res, 200, { ok: true });
    }
    if (req.method === "GET" && p === "/api/stats") {
      if (!this.authenticate(req)) {
        return this.json(res, 401, { error: "Unauthorized: Invalid or missing API key" });
      }
      const uptimeSec = Math.max(0, Math.floor((Date.now() - this.stats.startedAt) / 1000));
      return this.json(res, 200, {
        ...this.stats.snapshot(),
        runtime: {
          startedAt: this.stats.startedAt,
          uptimeSec,
          channels: this.hub.listChannels().map((key) => ({
            key,
            connected: this.hub.getChannel(key)?.isConnected() ?? false
          }))
        }
      });
    }
    this.json(res, 404, { error: "Not found" });
  }
  json(res, status, body) {
    const data = JSON.stringify(body);
    res.writeHead(status, {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(data)
    });
    res.end(data);
  }
}
var init_dashboard = __esm(() => {
  init_stats();
});

// src/core/engine/hub.ts
class ChannelHub {
  _channels = new Map;
  _bus = new ChannelEventBus;
  _messageHandlers = [];
  _middlewares = [];
  _dedupCache;
  _dlqHandler;
  _identityStitcher;
  _handoffManager;
  _sessionStore;
  _router;
  _scheduler;
  _flows;
  _deadLetterStore;
  _journal;
  _watchdogOptions;
  _watchdog;
  _stats;
  _instrumented = new WeakSet;
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
    this._sessionStore = new SessionStore(options.sessionOptions);
    this._router = new CommandRouter;
    this._scheduler = new MessageScheduler(async (job) => {
      const ch = this.getChannel(job.channel);
      if (!ch)
        throw new Error(`Scheduled message: channel '${job.channel}' is not registered.`);
      await ch.sendText(job.chatId, job.text);
    }, { tickMs: options.schedulerTickMs });
    this._flows = new FlowManager;
    if (options.deadLetterStore) {
      this._deadLetterStore = new DeadLetterStore(typeof options.deadLetterStore === "object" ? options.deadLetterStore : {});
    }
    this._journal = new MessageJournal({ maxEntries: options.journalMaxEntries });
    this._watchdogOptions = options.watchdog;
    this._stats = options.stats ?? null;
  }
  get identityStitcher() {
    return this._identityStitcher;
  }
  get handoff() {
    return this._handoffManager;
  }
  get sessions() {
    return this._sessionStore;
  }
  get router() {
    return this._router;
  }
  get scheduler() {
    return this._scheduler;
  }
  command(name, handler, opts) {
    this._router.registerCommand(name, handler, opts);
    return this;
  }
  route(rule) {
    this._router.addRoute(rule);
    return this;
  }
  async broadcast(targets, content, options) {
    return broadcastMessage(this, targets, content, options);
  }
  schedule(input) {
    const job = this._scheduler.schedule(input);
    this._scheduler.start();
    return job;
  }
  listScheduled() {
    return this._scheduler.list();
  }
  cancelScheduled(id) {
    return this._scheduler.cancel(id);
  }
  get flows() {
    return this._flows;
  }
  defineFlow(def) {
    this._flows.define(def);
    return this;
  }
  get journal() {
    return this._journal;
  }
  get deadLetterStore() {
    return this._deadLetterStore;
  }
  deadLetters() {
    return this._deadLetterStore?.list() ?? [];
  }
  async replayDeadLetters() {
    if (!this._deadLetterStore)
      return { replayed: 0, failed: 0 };
    return this._deadLetterStore.replay(async (item) => {
      const ch = this.getChannel(item.channel);
      if (!ch)
        throw new Error(`Channel '${item.channel}' is not registered.`);
      const ctx = createMessageContext(item.message, ch, undefined, this._handoffManager, this._sessionStore);
      for (const handler of this._messageHandlers) {
        await handler(ctx);
      }
    });
  }
  get watchdog() {
    if (!this._watchdog) {
      this._watchdog = new ConnectionWatchdog(() => Array.from(new Set(this._channels.values())), this._watchdogOptions);
    }
    return this._watchdog;
  }
  startWatchdog() {
    this.watchdog.start();
    return this;
  }
  stopWatchdog() {
    this._watchdog?.stop();
    return this;
  }
  health() {
    return {
      channels: this.listChannels().map((key) => ({
        key,
        connected: this.getChannel(key)?.isConnected() ?? false
      })),
      scheduledJobs: this._scheduler.size,
      deadLetters: this._deadLetterStore?.size ?? 0,
      journal: this._journal.summary()
    };
  }
  get stats() {
    return this._stats;
  }
  set stats(collector) {
    this._stats = collector;
    if (collector) {
      for (const ch of new Set(this._channels.values())) {
        this._instrumentOutbound(ch);
      }
    }
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
    this._instrumentOutbound(channel);
    channel.on("message", async (msg) => {
      if (this._dedupCache && msg.id) {
        const isNew = this._dedupCache.checkAndSet(`${channel.name}:${msg.id}`);
        if (!isNew) {
          return;
        }
      }
      this._stats?.recordInbound(msg);
      this._journal.inbound({
        channel: channel.name,
        chatId: msg.chat.id,
        senderId: msg.sender.id,
        text: msg.content?.text
      });
      this._bus.emitMessage(msg);
      const identity = this._identityStitcher.resolve(channel.name, msg.sender.id);
      if (msg.content?.text) {
        this._sessionStore.pushHistory(channel.name, msg.chat.id, {
          role: "user",
          text: msg.content.text,
          senderId: msg.sender.id
        });
      }
      const ctx = createMessageContext(msg, channel, identity, this._handoffManager, this._sessionStore);
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
          let handled = false;
          if (ctx.session?.state?.["__flow"]) {
            handled = await this._flows.handle(ctx);
          }
          if (!handled && this._router.hasEntries) {
            handled = await this._router.dispatch(ctx);
          }
          if (!handled) {
            for (const handler of this._messageHandlers) {
              await handler(ctx);
            }
          }
        }
      };
      try {
        await executePipeline(0);
      } catch (err) {
        const errorObj = err instanceof Error ? err : new Error(String(err));
        this._stats?.recordError(channel.name);
        this._journal.error(channel.name, errorObj, msg.chat.id);
        this._bus.emitError(errorObj);
        const dlqItem = {
          message: msg,
          error: errorObj,
          timestamp: Date.now(),
          retryCount: 0,
          channel: channel.name
        };
        this._deadLetterStore?.add(dlqItem);
        if (this._dlqHandler) {
          try {
            await this._dlqHandler(dlqItem);
          } catch (dlqErr) {
            this._bus.emitError(dlqErr instanceof Error ? dlqErr : new Error(String(dlqErr)));
          }
        }
      }
    });
    channel.on("error", (err) => {
      this._stats?.recordError(channel.name);
      this._bus.emitError(err);
    });
    return this;
  }
  _instrumentOutbound(channel) {
    if (this._instrumented.has(channel))
      return;
    this._instrumented.add(channel);
    const hub = this;
    const wrap = (fn) => async (...args) => {
      const result = await fn(...args);
      hub._stats?.recordOutbound(channel.name);
      const first = args[0];
      const second = args[1];
      hub._journal.outbound({
        channel: channel.name,
        chatId: first,
        text: typeof second === "string" ? second : second?.caption
      });
      return result;
    };
    const target = channel;
    for (const method of ["sendText", "sendMedia"]) {
      const original = target[method];
      if (typeof original === "function") {
        target[method] = wrap(original.bind(channel));
      }
    }
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
  async dashboard(options = {}) {
    await Promise.resolve().then(() => init_dashboard());
    const bridge = new DashboardBridge(this, options);
    await bridge.start();
    return bridge;
  }
  async stop(signal) {
    this._watchdog?.stop();
    this._scheduler.stop();
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
  init_session();
  init_router();
  init_broadcast();
  init_flow();
});

// apps/cli/main.ts
import fs from "node:fs";
import path from "node:path";
var __dirname = "/home/hatch/workspace/ChannelHub/apps/cli";
var args = process.argv.slice(2);
var command = args[0] || "help";
function printHelp() {
  console.log(`
ChannelHub CLI \uD83E\uDD89 - Multi-Channel Messaging Toolkit

Usage:
  channelhub <command> [options]

Commands:
  init                Quickly scaffold a new ChannelHub bot project (.env, bot.ts)
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
    "ZALO_OA_ACCESS_TOKEN",
    "TIKTOK_ACCESS_TOKEN",
    "TIKTOK_CLIENT_SECRET"
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
  if (process.env.MESSENGER_PAGE_TOKEN) {
    console.log(`
\uD83D\uDD0D Running Deep Diagnostic: Messenger Graph API...`);
    try {
      const res = await fetch("https://graph.facebook.com/v19.0/me/permissions", {
        headers: { Authorization: `Bearer ${process.env.MESSENGER_PAGE_TOKEN}` }
      });
      if (res.ok) {
        const data = await res.json();
        const perms = (data.data || []).filter((p) => p.status === "granted").map((p) => p.permission);
        if (perms.includes("pages_messaging")) {
          console.log("  ✅ Token is VALID and has 'pages_messaging' permission.");
        } else {
          console.log("  ❌ Token is VALID but MISSING 'pages_messaging' permission! The bot cannot send/receive messages.");
        }
      } else {
        const errData = await res.text();
        console.log(`  ❌ Token is INVALID or EXPIRED. Meta responded: ${errData}`);
      }
    } catch (err) {
      console.log(`  ⚠️ Failed to connect to Meta API: ${err.message}`);
    }
  }
}
async function runInit() {
  console.log(`\uD83E\uDD89 ChannelHub Starter Setup
`);
  const cwd = process.cwd();
  const envPath = path.resolve(cwd, ".env");
  const envExamplePath = path.resolve(cwd, ".env.example");
  const envTemplate = `# ChannelHub Environment Configuration

# Telegram Bot Token (from @BotFather)
TELEGRAM_BOT_TOKEN=

# Discord Bot Token (from Discord Developer Portal)
DISCORD_BOT_TOKEN=

# Slack Bot Token & Signing Secret
SLACK_BOT_TOKEN=
SLACK_SIGNING_SECRET=

# Meta Messenger Page Token & App Secret
MESSENGER_PAGE_TOKEN=
MESSENGER_VERIFY_TOKEN=
MESSENGER_APP_SECRET=

# TikTok for Business Credentials
TIKTOK_APP_ID=
TIKTOK_CLIENT_SECRET=
TIKTOK_ACCESS_TOKEN=

# Twilio Omnichannel (WhatsApp / SMS)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
`;
  if (!fs.existsSync(envPath)) {
    fs.writeFileSync(envPath, envTemplate, "utf8");
    console.log("✅ Created: .env");
  }
  if (!fs.existsSync(envExamplePath)) {
    fs.writeFileSync(envExamplePath, envTemplate, "utf8");
    console.log("✅ Created: .env.example");
  }
  const botPath = path.resolve(cwd, "bot.ts");
  const botTemplate = `import { ChannelHub } from "@theowlops/channelhub/core";
import { TelegramChannelAdapter } from "@theowlops/channelhub/channels/telegram";
import { DiscordChannelAdapter } from "@theowlops/channelhub/channels/discord";

const hub = new ChannelHub({ enableDeduplication: true });

// Auto-register channels if tokens are set
if (process.env.TELEGRAM_BOT_TOKEN) {
  hub.register(new TelegramChannelAdapter({ botToken: process.env.TELEGRAM_BOT_TOKEN }));
}
if (process.env.DISCORD_BOT_TOKEN) {
  hub.register(new DiscordChannelAdapter({ botToken: process.env.DISCORD_BOT_TOKEN }));
}

hub.on("message", async (ctx) => {
  console.log(\`[\\u{1F4AC} \${ctx.channel}] \${ctx.message.sender.name}: \${ctx.message.content.text}\`);

  if (ctx.message.content.text.startsWith("/ping")) {
    await ctx.reply("pong! \uD83C\uDFD3");
  }
});

await hub.startAll();
console.log("\uD83D\uDE80 ChannelHub is live and listening for messages!");
`;
  if (!fs.existsSync(botPath)) {
    fs.writeFileSync(botPath, botTemplate, "utf8");
    console.log("✅ Created: bot.ts");
  }
  const pkgPath = path.resolve(cwd, "package.json");
  if (!fs.existsSync(pkgPath)) {
    const pkgTemplate = JSON.stringify({
      name: "channelhub-bot",
      type: "module",
      scripts: {
        start: "bun bot.ts",
        doctor: "channelhub doctor"
      },
      dependencies: {
        "@theowlops/channelhub": "^1.5.0",
        dotenv: "^16.4.5"
      }
    }, null, 2);
    fs.writeFileSync(pkgPath, pkgTemplate, "utf8");
    console.log("✅ Created: package.json (run 'bun install' or 'npm install')");
  }
  console.log(`
\uD83C\uDF89 Setup complete!
1. Open '.env' and paste your channel tokens.
2. Run your bot:
   bun bot.ts (or npx tsx bot.ts)
`);
}
async function main() {
  switch (command) {
    case "init":
      await runInit();
      break;
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
      const pkgPath = path.resolve(__dirname, "../../package.json");
      let ver = "1.5.0";
      if (fs.existsSync(pkgPath)) {
        try {
          ver = JSON.parse(fs.readFileSync(pkgPath, "utf8")).version || ver;
        } catch {}
      }
      console.log(`@theowlops/channelhub v${ver}`);
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
