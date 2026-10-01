#!/usr/bin/env node
import { createRequire } from "node:module";
var __create = Object.create;
var __getProtoOf = Object.getPrototypeOf;
var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
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
var __commonJS = (cb, mod) => () => (mod || cb((mod = { exports: {} }).exports, mod), mod.exports);
var __require = /* @__PURE__ */ createRequire(import.meta.url);

// node_modules/dotenv/package.json
var require_package = __commonJS(function(exports, module) {
  module.exports = {
    name: "dotenv",
    version: "16.6.1",
    description: "Loads environment variables from .env file",
    main: "lib/main.js",
    types: "lib/main.d.ts",
    exports: {
      ".": {
        types: "./lib/main.d.ts",
        require: "./lib/main.js",
        default: "./lib/main.js"
      },
      "./config": "./config.js",
      "./config.js": "./config.js",
      "./lib/env-options": "./lib/env-options.js",
      "./lib/env-options.js": "./lib/env-options.js",
      "./lib/cli-options": "./lib/cli-options.js",
      "./lib/cli-options.js": "./lib/cli-options.js",
      "./package.json": "./package.json"
    },
    scripts: {
      "dts-check": "tsc --project tests/types/tsconfig.json",
      lint: "standard",
      pretest: "npm run lint && npm run dts-check",
      test: "tap run --allow-empty-coverage --disable-coverage --timeout=60000",
      "test:coverage": "tap run --show-full-coverage --timeout=60000 --coverage-report=text --coverage-report=lcov",
      prerelease: "npm test",
      release: "standard-version"
    },
    repository: {
      type: "git",
      url: "git://github.com/motdotla/dotenv.git"
    },
    homepage: "https://github.com/motdotla/dotenv#readme",
    funding: "https://dotenvx.com",
    keywords: [
      "dotenv",
      "env",
      ".env",
      "environment",
      "variables",
      "config",
      "settings"
    ],
    readmeFilename: "README.md",
    license: "BSD-2-Clause",
    devDependencies: {
      "@types/node": "^18.11.3",
      decache: "^4.6.2",
      sinon: "^14.0.1",
      standard: "^17.0.0",
      "standard-version": "^9.5.0",
      tap: "^19.2.0",
      typescript: "^4.8.4"
    },
    engines: {
      node: ">=12"
    },
    browser: {
      fs: false
    }
  };
});

// node_modules/dotenv/lib/main.js
var require_main = __commonJS(function(exports, module) {
  var fs = __require("fs");
  var path = __require("path");
  var os = __require("os");
  var crypto = __require("crypto");
  var packageJson = require_package();
  var version = packageJson.version;
  var LINE = /(?:^|^)\s*(?:export\s+)?([\w.-]+)(?:\s*=\s*?|:\s+?)(\s*'(?:\\'|[^'])*'|\s*"(?:\\"|[^"])*"|\s*`(?:\\`|[^`])*`|[^#\r\n]+)?\s*(?:#.*)?(?:$|$)/mg;
  function parse(src) {
    const obj = {};
    let lines = src.toString();
    lines = lines.replace(/\r\n?/mg, `
`);
    let match;
    while ((match = LINE.exec(lines)) != null) {
      const key = match[1];
      let value = match[2] || "";
      value = value.trim();
      const maybeQuote = value[0];
      value = value.replace(/^(['"`])([\s\S]*)\1$/mg, "$2");
      if (maybeQuote === '"') {
        value = value.replace(/\\n/g, `
`);
        value = value.replace(/\\r/g, "\r");
      }
      obj[key] = value;
    }
    return obj;
  }
  function _parseVault(options) {
    options = options || {};
    const vaultPath = _vaultPath(options);
    options.path = vaultPath;
    const result = DotenvModule.configDotenv(options);
    if (!result.parsed) {
      const err = new Error(`MISSING_DATA: Cannot parse ${vaultPath} for an unknown reason`);
      err.code = "MISSING_DATA";
      throw err;
    }
    const keys = _dotenvKey(options).split(",");
    const length = keys.length;
    let decrypted;
    for (let i = 0;i < length; i++) {
      try {
        const key = keys[i].trim();
        const attrs = _instructions(result, key);
        decrypted = DotenvModule.decrypt(attrs.ciphertext, attrs.key);
        break;
      } catch (error) {
        if (i + 1 >= length) {
          throw error;
        }
      }
    }
    return DotenvModule.parse(decrypted);
  }
  function _warn(message) {
    console.log(`[dotenv@${version}][WARN] ${message}`);
  }
  function _debug(message) {
    console.log(`[dotenv@${version}][DEBUG] ${message}`);
  }
  function _log(message) {
    console.log(`[dotenv@${version}] ${message}`);
  }
  function _dotenvKey(options) {
    if (options && options.DOTENV_KEY && options.DOTENV_KEY.length > 0) {
      return options.DOTENV_KEY;
    }
    if (process.env.DOTENV_KEY && process.env.DOTENV_KEY.length > 0) {
      return process.env.DOTENV_KEY;
    }
    return "";
  }
  function _instructions(result, dotenvKey) {
    let uri;
    try {
      uri = new URL(dotenvKey);
    } catch (error) {
      if (error.code === "ERR_INVALID_URL") {
        const err = new Error("INVALID_DOTENV_KEY: Wrong format. Must be in valid uri format like dotenv://:key_1234@dotenvx.com/vault/.env.vault?environment=development");
        err.code = "INVALID_DOTENV_KEY";
        throw err;
      }
      throw error;
    }
    const key = uri.password;
    if (!key) {
      const err = new Error("INVALID_DOTENV_KEY: Missing key part");
      err.code = "INVALID_DOTENV_KEY";
      throw err;
    }
    const environment = uri.searchParams.get("environment");
    if (!environment) {
      const err = new Error("INVALID_DOTENV_KEY: Missing environment part");
      err.code = "INVALID_DOTENV_KEY";
      throw err;
    }
    const environmentKey = `DOTENV_VAULT_${environment.toUpperCase()}`;
    const ciphertext = result.parsed[environmentKey];
    if (!ciphertext) {
      const err = new Error(`NOT_FOUND_DOTENV_ENVIRONMENT: Cannot locate environment ${environmentKey} in your .env.vault file.`);
      err.code = "NOT_FOUND_DOTENV_ENVIRONMENT";
      throw err;
    }
    return { ciphertext, key };
  }
  function _vaultPath(options) {
    let possibleVaultPath = null;
    if (options && options.path && options.path.length > 0) {
      if (Array.isArray(options.path)) {
        for (const filepath of options.path) {
          if (fs.existsSync(filepath)) {
            possibleVaultPath = filepath.endsWith(".vault") ? filepath : `${filepath}.vault`;
          }
        }
      } else {
        possibleVaultPath = options.path.endsWith(".vault") ? options.path : `${options.path}.vault`;
      }
    } else {
      possibleVaultPath = path.resolve(process.cwd(), ".env.vault");
    }
    if (fs.existsSync(possibleVaultPath)) {
      return possibleVaultPath;
    }
    return null;
  }
  function _resolveHome(envPath) {
    return envPath[0] === "~" ? path.join(os.homedir(), envPath.slice(1)) : envPath;
  }
  function _configVault(options) {
    const debug = Boolean(options && options.debug);
    const quiet = options && "quiet" in options ? options.quiet : true;
    if (debug || !quiet) {
      _log("Loading env from encrypted .env.vault");
    }
    const parsed = DotenvModule._parseVault(options);
    let processEnv = process.env;
    if (options && options.processEnv != null) {
      processEnv = options.processEnv;
    }
    DotenvModule.populate(processEnv, parsed, options);
    return { parsed };
  }
  function configDotenv(options) {
    const dotenvPath = path.resolve(process.cwd(), ".env");
    let encoding = "utf8";
    const debug = Boolean(options && options.debug);
    const quiet = options && "quiet" in options ? options.quiet : true;
    if (options && options.encoding) {
      encoding = options.encoding;
    } else {
      if (debug) {
        _debug("No encoding is specified. UTF-8 is used by default");
      }
    }
    let optionPaths = [dotenvPath];
    if (options && options.path) {
      if (!Array.isArray(options.path)) {
        optionPaths = [_resolveHome(options.path)];
      } else {
        optionPaths = [];
        for (const filepath of options.path) {
          optionPaths.push(_resolveHome(filepath));
        }
      }
    }
    let lastError;
    const parsedAll = {};
    for (const path of optionPaths) {
      try {
        const parsed = DotenvModule.parse(fs.readFileSync(path, { encoding }));
        DotenvModule.populate(parsedAll, parsed, options);
      } catch (e) {
        if (debug) {
          _debug(`Failed to load ${path} ${e.message}`);
        }
        lastError = e;
      }
    }
    let processEnv = process.env;
    if (options && options.processEnv != null) {
      processEnv = options.processEnv;
    }
    DotenvModule.populate(processEnv, parsedAll, options);
    if (debug || !quiet) {
      const keysCount = Object.keys(parsedAll).length;
      const shortPaths = [];
      for (const filePath of optionPaths) {
        try {
          const relative2 = path.relative(process.cwd(), filePath);
          shortPaths.push(relative2);
        } catch (e) {
          if (debug) {
            _debug(`Failed to load ${filePath} ${e.message}`);
          }
          lastError = e;
        }
      }
      _log(`injecting env (${keysCount}) from ${shortPaths.join(",")}`);
    }
    if (lastError) {
      return { parsed: parsedAll, error: lastError };
    } else {
      return { parsed: parsedAll };
    }
  }
  function config(options) {
    if (_dotenvKey(options).length === 0) {
      return DotenvModule.configDotenv(options);
    }
    const vaultPath = _vaultPath(options);
    if (!vaultPath) {
      _warn(`You set DOTENV_KEY but you are missing a .env.vault file at ${vaultPath}. Did you forget to build it?`);
      return DotenvModule.configDotenv(options);
    }
    return DotenvModule._configVault(options);
  }
  function decrypt(encrypted, keyStr) {
    const key = Buffer.from(keyStr.slice(-64), "hex");
    let ciphertext = Buffer.from(encrypted, "base64");
    const nonce = ciphertext.subarray(0, 12);
    const authTag = ciphertext.subarray(-16);
    ciphertext = ciphertext.subarray(12, -16);
    try {
      const aesgcm = crypto.createDecipheriv("aes-256-gcm", key, nonce);
      aesgcm.setAuthTag(authTag);
      return `${aesgcm.update(ciphertext)}${aesgcm.final()}`;
    } catch (error) {
      const isRange = error instanceof RangeError;
      const invalidKeyLength = error.message === "Invalid key length";
      const decryptionFailed = error.message === "Unsupported state or unable to authenticate data";
      if (isRange || invalidKeyLength) {
        const err = new Error("INVALID_DOTENV_KEY: It must be 64 characters long (or more)");
        err.code = "INVALID_DOTENV_KEY";
        throw err;
      } else if (decryptionFailed) {
        const err = new Error("DECRYPTION_FAILED: Please check your DOTENV_KEY");
        err.code = "DECRYPTION_FAILED";
        throw err;
      } else {
        throw error;
      }
    }
  }
  function populate(processEnv, parsed, options = {}) {
    const debug = Boolean(options && options.debug);
    const override = Boolean(options && options.override);
    if (typeof parsed !== "object") {
      const err = new Error("OBJECT_REQUIRED: Please check the processEnv argument being passed to populate");
      err.code = "OBJECT_REQUIRED";
      throw err;
    }
    for (const key of Object.keys(parsed)) {
      if (Object.prototype.hasOwnProperty.call(processEnv, key)) {
        if (override === true) {
          processEnv[key] = parsed[key];
        }
        if (debug) {
          if (override === true) {
            _debug(`"${key}" is already defined and WAS overwritten`);
          } else {
            _debug(`"${key}" is already defined and was NOT overwritten`);
          }
        }
      } else {
        processEnv[key] = parsed[key];
      }
    }
  }
  var DotenvModule = {
    configDotenv,
    _configVault,
    _parseVault,
    config,
    decrypt,
    parse,
    populate
  };
  module.exports.configDotenv = DotenvModule.configDotenv;
  module.exports._configVault = DotenvModule._configVault;
  module.exports._parseVault = DotenvModule._parseVault;
  module.exports.config = DotenvModule.config;
  module.exports.decrypt = DotenvModule.decrypt;
  module.exports.parse = DotenvModule.parse;
  module.exports.populate = DotenvModule.populate;
  module.exports = DotenvModule;
});

// bin/mcp-server.ts
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema
} from "@modelcontextprotocol/sdk/types.js";

// src/core/bus.ts
import { EventEmitter } from "node:events";

class ChannelEventBus extends EventEmitter {
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
function createMessageContext(message, channel) {
  return {
    message,
    channel,
    reply: (text, options) => channel.sendText(message.chat.id, text, {
      replyToId: message.id,
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

// src/core/hub.ts
class ChannelHub {
  _channels = new Map;
  _bus = new ChannelEventBus;
  _messageHandlers = [];
  _queue = [];
  _waiters = [];
  _isClosed = false;
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
      this._bus.emitMessage(msg);
      const ctx = createMessageContext(msg, channel);
      if (this._waiters.length > 0) {
        const waiter = this._waiters.shift();
        waiter(ctx);
      } else {
        this._queue.push(ctx);
        if (this._queue.length > 2000) {
          this._queue.shift();
        }
      }
      for (const handler of this._messageHandlers) {
        try {
          await handler(ctx);
        } catch (err) {
          this._bus.emitError(err instanceof Error ? err : new Error(String(err)));
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
        yield this._queue.shift();
        continue;
      }
      const next = await new Promise((resolve) => {
        const onAbort = () => {
          signal?.removeEventListener("abort", onAbort);
          resolve(null);
        };
        signal?.addEventListener("abort", onAbort, { once: true });
        this._waiters.push((ctx) => {
          signal?.removeEventListener("abort", onAbort);
          resolve(ctx);
        });
      });
      if (!next || signal?.aborted)
        break;
      yield next;
    }
  }
  async start(signal) {
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
    const uniqueChannels = Array.from(new Set(this._channels.values()));
    await Promise.allSettled(uniqueChannels.map((ch) => ch.disconnect(signal)));
  }
}

// src/bridges/mcp/index.ts
function getChannelHubMcpTools() {
  return [
    {
      name: "channelhub_list_channels",
      description: "List all active channels registered in ChannelHub (e.g. zalo, telegram, discord, slack, messenger) with their connection state.",
      parameters: {
        type: "object",
        properties: {}
      }
    },
    {
      name: "channelhub_get_status",
      description: "Get detailed connection status for each registered messaging channel.",
      parameters: {
        type: "object",
        properties: {}
      }
    },
    {
      name: "channelhub_send_message",
      description: "Send a text message or reply to a specific chat on a registered channel.",
      parameters: {
        type: "object",
        required: ["channel", "chatId", "text"],
        properties: {
          channel: {
            type: "string",
            description: "Channel name (e.g. 'zalo', 'telegram', 'discord', 'slack', 'messenger')"
          },
          chatId: {
            type: "string",
            description: "Target chat/thread/channel ID"
          },
          text: {
            type: "string",
            description: "Message body text"
          },
          replyToId: {
            type: "string",
            description: "Optional message ID to reply to"
          }
        }
      }
    },
    {
      name: "channelhub_send_media",
      description: "Send an image, video, audio, or document file to a specific chat.",
      parameters: {
        type: "object",
        required: ["channel", "chatId", "url", "mediaType"],
        properties: {
          channel: {
            type: "string",
            description: "Channel name (e.g. 'zalo', 'telegram', 'discord', 'slack', 'messenger')"
          },
          chatId: {
            type: "string",
            description: "Target chat/thread/channel ID"
          },
          url: {
            type: "string",
            description: "Public URL or local file path to the media"
          },
          mediaType: {
            type: "string",
            enum: ["image", "video", "audio", "file"],
            description: "Media type"
          },
          caption: {
            type: "string",
            description: "Optional caption for the media"
          }
        }
      }
    },
    {
      name: "channelhub_send_typing",
      description: "Trigger a typing indicator on the target channel to let users know the bot is thinking.",
      parameters: {
        type: "object",
        required: ["channel", "chatId"],
        properties: {
          channel: {
            type: "string",
            description: "Channel name"
          },
          chatId: {
            type: "string",
            description: "Target chat/thread ID"
          }
        }
      }
    },
    {
      name: "channelhub_edit_message",
      description: "Edit a previously sent message text (supported on Telegram, Discord, Slack).",
      parameters: {
        type: "object",
        required: ["channel", "chatId", "messageId", "newText"],
        properties: {
          channel: {
            type: "string",
            description: "Channel name"
          },
          chatId: {
            type: "string",
            description: "Target chat/thread ID"
          },
          messageId: {
            type: "string",
            description: "ID of the message to edit"
          },
          newText: {
            type: "string",
            description: "Updated message content"
          }
        }
      }
    },
    {
      name: "channelhub_send_sticker",
      description: "Send a sticker to a chat (supports Telegram sticker file_id/url, Zalo sticker ID, Messenger sticker_id/URL).",
      parameters: {
        type: "object",
        required: ["channel", "chatId", "sticker"],
        properties: {
          channel: { type: "string" },
          chatId: { type: "string" },
          sticker: { type: "string", description: "Sticker ID or public sticker URL/path" },
          replyToId: { type: "string", description: "Optional message ID to reply to" }
        }
      }
    },
    {
      name: "channelhub_send_gif",
      description: "Send an animated GIF to a chat (supports GIF URL or local file path).",
      parameters: {
        type: "object",
        required: ["channel", "chatId", "gifUrl"],
        properties: {
          channel: { type: "string" },
          chatId: { type: "string" },
          gifUrl: { type: "string", description: "Public GIF URL or local .gif file path" },
          caption: { type: "string", description: "Optional caption" },
          replyToId: { type: "string", description: "Optional message ID to reply to" }
        }
      }
    },
    {
      name: "channelhub_add_reaction",
      description: "React to a message with an emoji.",
      parameters: {
        type: "object",
        required: ["channel", "chatId", "messageId", "emoji"],
        properties: {
          channel: { type: "string" },
          chatId: { type: "string" },
          messageId: { type: "string" },
          emoji: { type: "string" }
        }
      }
    },
    {
      name: "channelhub_broadcast",
      description: "Broadcast a text message to multiple destinations (chat IDs) across channels simultaneously.",
      parameters: {
        type: "object",
        required: ["targets", "text"],
        properties: {
          targets: {
            type: "array",
            description: "List of targets to broadcast to",
            items: {
              type: "object",
              required: ["channel", "chatId"],
              properties: {
                channel: { type: "string" },
                chatId: { type: "string" }
              }
            }
          },
          text: {
            type: "string",
            description: "Message body to broadcast"
          }
        }
      }
    }
  ];
}
async function handleChannelHubMcpCall(hub, toolName, args) {
  try {
    switch (toolName) {
      case "channelhub_list_channels": {
        const channels = hub.listChannels();
        return {
          content: [{ type: "text", text: JSON.stringify({ channels }, null, 2) }]
        };
      }
      case "channelhub_get_status": {
        const channels = hub.listChannels();
        const statusMap = {};
        for (const name of channels) {
          const ch = hub.getChannel(name);
          statusMap[name] = { connected: ch ? ch.isConnected() : false };
        }
        return {
          content: [{ type: "text", text: JSON.stringify({ status: statusMap }, null, 2) }]
        };
      }
      case "channelhub_send_message": {
        const ch = hub.getChannel(args.channel);
        if (!ch)
          throw new Error(`Channel '${args.channel}' not found or not active.`);
        const res = await ch.sendText(args.chatId, args.text, { replyToId: args.replyToId });
        return {
          content: [{ type: "text", text: JSON.stringify(res, null, 2) }]
        };
      }
      case "channelhub_send_media": {
        const ch = hub.getChannel(args.channel);
        if (!ch)
          throw new Error(`Channel '${args.channel}' not found or not active.`);
        const res = await ch.sendMedia(args.chatId, {
          type: args.mediaType,
          source: args.url,
          caption: args.caption
        });
        return {
          content: [{ type: "text", text: JSON.stringify(res, null, 2) }]
        };
      }
      case "channelhub_send_sticker": {
        const ch = hub.getChannel(args.channel);
        if (!ch)
          throw new Error(`Channel '${args.channel}' not found or not active.`);
        const res = ch.sendSticker ? await ch.sendSticker(args.chatId, args.sticker, { replyToId: args.replyToId }) : await ch.sendMedia(args.chatId, { type: "sticker", source: args.sticker }, { replyToId: args.replyToId });
        return {
          content: [{ type: "text", text: JSON.stringify(res, null, 2) }]
        };
      }
      case "channelhub_send_gif": {
        const ch = hub.getChannel(args.channel);
        if (!ch)
          throw new Error(`Channel '${args.channel}' not found or not active.`);
        const res = ch.sendGif ? await ch.sendGif(args.chatId, args.gifUrl, args.caption, { replyToId: args.replyToId }) : await ch.sendMedia(args.chatId, { type: "animation", source: args.gifUrl, caption: args.caption }, { replyToId: args.replyToId });
        return {
          content: [{ type: "text", text: JSON.stringify(res, null, 2) }]
        };
      }
      case "channelhub_send_typing": {
        const ch = hub.getChannel(args.channel);
        if (!ch)
          throw new Error(`Channel '${args.channel}' not found.`);
        if (ch.sendTyping) {
          await ch.sendTyping(args.chatId);
          return { content: [{ type: "text", text: JSON.stringify({ success: true }) }] };
        }
        return { content: [{ type: "text", text: JSON.stringify({ supported: false }) }] };
      }
      case "channelhub_edit_message": {
        const ch = hub.getChannel(args.channel);
        if (!ch)
          throw new Error(`Channel '${args.channel}' not found.`);
        if (!ch.editText)
          throw new Error(`Channel '${args.channel}' does not support editing messages.`);
        const res = await ch.editText(args.chatId, args.messageId, args.newText);
        return {
          content: [{ type: "text", text: JSON.stringify(res, null, 2) }]
        };
      }
      case "channelhub_add_reaction": {
        const ch = hub.getChannel(args.channel);
        if (!ch)
          throw new Error(`Channel '${args.channel}' not found.`);
        if (!ch.addReaction)
          throw new Error(`Channel '${args.channel}' does not support reactions.`);
        await ch.addReaction(args.chatId, args.messageId, args.emoji);
        return {
          content: [{ type: "text", text: JSON.stringify({ success: true }) }]
        };
      }
      case "channelhub_broadcast": {
        const targets = args.targets || [];
        const text = args.text || "";
        const results = await Promise.allSettled(targets.map(async (t) => {
          const ch = hub.getChannel(t.channel);
          if (!ch)
            throw new Error(`Channel '${t.channel}' not found.`);
          return await ch.sendText(t.chatId, text);
        }));
        const summary = results.map((r, i) => ({
          target: targets[i],
          status: r.status,
          result: r.status === "fulfilled" ? r.value : undefined,
          error: r.status === "rejected" ? r.reason?.message || String(r.reason) : undefined
        }));
        return {
          content: [{ type: "text", text: JSON.stringify({ broadcast: summary }, null, 2) }]
        };
      }
      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  } catch (err) {
    return {
      isError: true,
      content: [{ type: "text", text: err.message || String(err) }]
    };
  }
}

// src/core/adapter.ts
import { EventEmitter as EventEmitter2 } from "node:events";

class BaseChannel extends EventEmitter2 {
  get provider() {
    return this.name;
  }
  get accountId() {
    return "default";
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

// src/channels/zalo/adapter.ts
var EMOJI_TO_ZALO = {
  "❤️": "HEART",
  "\uD83D\uDC96": "HEART",
  "\uD83D\uDC4D": "LIKE",
  "\uD83D\uDE06": "HAHA",
  "\uD83D\uDE02": "TEARS_OF_JOY",
  "\uD83D\uDE2E": "WOW",
  "\uD83D\uDE2D": "CRY",
  "\uD83D\uDE21": "ANGRY",
  "\uD83D\uDE18": "KISS",
  "\uD83D\uDCA9": "SHIT",
  "\uD83C\uDF39": "ROSE",
  "\uD83D\uDC94": "BROKEN_HEART",
  "\uD83D\uDC4E": "DISLIKE",
  "\uD83D\uDE0D": "LOVE",
  "\uD83E\uDD14": "CONFUSED",
  "\uD83D\uDE09": "WINK",
  heart: "HEART",
  like: "LIKE",
  haha: "HAHA",
  wow: "WOW",
  cry: "CRY",
  angry: "ANGRY"
};

class ZaloChannelAdapter extends BaseChannel {
  name = "zalo";
  api;
  ownId;
  config;
  threadTypeCache = new Map;
  messageCache = new Map;
  sendQueue = Promise.resolve();
  constructor(config = {}) {
    super();
    this.config = {
      minDelayMs: 300,
      maxDelayMs: 800,
      cacheLimit: 1000,
      ...config
    };
    if (config.api) {
      this.api = config.api;
    }
    this.ownId = config.ownId;
  }
  async connect() {
    if (!this.api && this.config.credentialsPath) {
      const fs = await import("node:fs");
      const { Zalo } = await import("zca-js");
      if (!fs.existsSync(this.config.credentialsPath)) {
        throw new Error(`Credentials not found at ${this.config.credentialsPath}. Please run login first.`);
      }
      const creds = JSON.parse(fs.readFileSync(this.config.credentialsPath, "utf-8"));
      const zalo = new Zalo;
      this.api = await zalo.login(creds);
    }
    if (!this.api) {
      throw new Error("Zalo API instance or valid credentialsPath required to connect.");
    }
    this.setupEventListener();
    this.setConnected(true);
  }
  async disconnect() {
    if (this.api?.listener?.stop) {
      try {
        this.api.listener.stop();
      } catch {}
    }
    this.setConnected(false);
  }
  setupEventListener() {
    if (!this.api?.listener?.on)
      return;
    this.api.listener.on("message", (raw) => {
      this.recordInbound(raw);
      const unified = this.normalizeMessage(raw);
      if (unified) {
        this.emit("message", unified);
      }
    });
    const onSessionDrop = (err) => {
      this.emit("session:expired", {
        reason: "SESSION_EXPIRED_OR_DROPPED",
        raw: err,
        requiresQrScan: true
      });
      this.setConnected(false);
    };
    this.api.listener.on("closed", onSessionDrop);
    this.api.listener.on("error", (err) => {
      const msg = String(err?.message || err);
      if (msg.includes("1002") || msg.includes("session") || msg.includes("auth")) {
        onSessionDrop(err);
      }
    });
    if (this.api.listener.start) {
      try {
        this.api.listener.start();
      } catch {}
    }
  }
  recordInbound(raw) {
    if (!raw)
      return;
    const data = raw.data || raw;
    const isGroup = raw.type === 1 || raw.type === "group" || Boolean(raw.isGroup);
    const chatId = String(raw.threadId || data.idTo || data.threadId || "");
    const msgId = String(data.msgId || raw.msgId || "");
    const cliMsgId = data.cliMsgId ? String(data.cliMsgId) : undefined;
    const uidFrom = String(data.uidFrom || raw.senderId || "");
    const content = typeof data.content === "string" ? data.content : data.msg || "";
    if (chatId) {
      this.threadTypeCache.set(chatId, isGroup ? 1 : 0);
    }
    const cached = {
      msgId,
      cliMsgId,
      uidFrom,
      content,
      threadId: chatId,
      isGroup
    };
    const limit = this.config.cacheLimit || 1000;
    if (this.messageCache.size >= limit) {
      const firstKey = this.messageCache.keys().next().value;
      if (firstKey)
        this.messageCache.delete(firstKey);
    }
    if (msgId)
      this.messageCache.set(msgId, cached);
    if (cliMsgId)
      this.messageCache.set(cliMsgId, cached);
  }
  resolveThreadType(chatId) {
    if (this.threadTypeCache.has(chatId)) {
      return this.threadTypeCache.get(chatId);
    }
    return this.config.defaultIsGroup ?? true ? 1 : 0;
  }
  resolveQuote(replyToId) {
    if (!replyToId)
      return;
    const cached = this.messageCache.get(replyToId);
    if (cached) {
      return {
        msgId: cached.msgId,
        cliMsgId: cached.cliMsgId,
        uidFrom: cached.uidFrom,
        content: cached.content
      };
    }
    return replyToId;
  }
  async enqueueSend(operation) {
    const minDelay = this.config.minDelayMs ?? 300;
    const maxDelay = this.config.maxDelayMs ?? 800;
    const execute = async () => {
      if (maxDelay > 0) {
        const jitter = Math.floor(minDelay + Math.random() * Math.max(0, maxDelay - minDelay));
        if (jitter > 0) {
          await new Promise((r) => setTimeout(r, jitter));
        }
      }
      return await operation();
    };
    const next = this.sendQueue.then(execute, execute);
    this.sendQueue = next.catch(() => {});
    return next;
  }
  normalizeMessage(raw) {
    if (!raw)
      return null;
    const data = raw.data || raw;
    const isGroup = raw.type === 1 || raw.type === "group" || Boolean(raw.isGroup);
    const chatId = raw.threadId || data.idTo || data.threadId || "";
    const senderId = data.uidFrom || raw.senderId || "";
    const senderName = data.dName || data.senderName;
    const text = typeof data.content === "string" ? data.content : data.msg || "";
    const msgId = data.msgId || raw.msgId || String(Date.now());
    const ts = Number(data.ts || raw.timestamp) || Date.now();
    return {
      id: String(msgId),
      channel: "zalo",
      sender: {
        id: String(senderId),
        name: senderName,
        isBot: this.ownId ? String(senderId) === String(this.ownId) : false
      },
      chat: {
        id: String(chatId),
        type: isGroup ? "group" : "dm"
      },
      content: {
        text
      },
      raw,
      timestamp: ts
    };
  }
  async sendText(chatId, text, options) {
    if (!this.api)
      throw new Error("Zalo adapter is not connected.");
    const threadType = this.resolveThreadType(chatId);
    const quote = this.resolveQuote(options?.replyToId);
    const payload = { msg: text, quote };
    return await this.enqueueSend(async () => {
      const res = await this.api.sendMessage(payload, chatId, threadType);
      const resMsgId = res?.message?.msgId || res?.msgId || `z-${Date.now()}`;
      return {
        messageId: String(resMsgId),
        chatId,
        timestamp: Date.now()
      };
    });
  }
  async sendMedia(chatId, media, options) {
    if (!this.api)
      throw new Error("Zalo adapter is not connected.");
    const threadType = this.resolveThreadType(chatId);
    const quote = this.resolveQuote(options?.replyToId);
    return await this.enqueueSend(async () => {
      let res;
      if (media.type === "sticker" && this.api.sendSticker) {
        res = await this.api.sendSticker(media.source, chatId, threadType);
      } else if (media.type === "animation" && this.api.sendAnimatedGif) {
        res = await this.api.sendAnimatedGif({ gif: media.source, msg: media.caption || "", quote }, chatId, threadType);
      } else if (media.type === "image") {
        res = await this.api.sendMessage({ msg: media.caption || "", attachments: [media.source], quote }, chatId, threadType);
      } else if (media.type === "video" && this.api.sendVideo) {
        res = await this.api.sendVideo({ video: media.source, msg: media.caption || "", quote }, chatId, threadType);
      } else {
        res = await this.api.sendMessage({ msg: media.caption || "", attachments: [media.source], quote }, chatId, threadType);
      }
      const resMsgId = res?.message?.msgId || res?.msgId || `z-${Date.now()}`;
      return {
        messageId: String(resMsgId),
        chatId,
        timestamp: Date.now()
      };
    });
  }
  async addReaction(chatId, messageId, emoji) {
    if (!this.api?.addReaction)
      return;
    const threadType = this.resolveThreadType(chatId);
    const isGroup = threadType === 1;
    const reactionCode = EMOJI_TO_ZALO[emoji] || emoji;
    const cached = this.messageCache.get(messageId);
    const cliMsgId = cached?.cliMsgId || messageId;
    await this.enqueueSend(async () => {
      await this.api.addReaction(chatId, messageId, cliMsgId, reactionCode, threadType);
    });
  }
  async sendTyping(chatId) {
    if (!this.api?.sendTypingEvent)
      return;
    const threadType = this.resolveThreadType(chatId);
    try {
      await this.api.sendTypingEvent(chatId, true, threadType);
    } catch {}
  }
}
// src/config/env.ts
var import_dotenv = __toESM(require_main(), 1);
import path from "node:path";
import_dotenv.default.config();
var CONFIG = {
  PERSONAL: {
    CRED_PATH: process.env.ZALO_CRED_PATH || path.resolve("./credentials.json"),
    DEFAULT_PREFIX: "!"
  },
  OA: {
    APP_ID: process.env.ZALO_OA_APP_ID || "",
    APP_SECRET: process.env.ZALO_OA_APP_SECRET || "",
    ACCESS_TOKEN: process.env.ZALO_OA_ACCESS_TOKEN || "",
    REFRESH_TOKEN: process.env.ZALO_OA_REFRESH_TOKEN || "",
    BASE_URL: "https://openapi.zalo.me/v3.0/oa"
  }
};
// src/channels/telegram/adapter.ts
class TelegramChannelAdapter extends BaseChannel {
  name = "telegram";
  config;
  apiRoot;
  pollTimer = null;
  lastUpdateId = 0;
  isPolling = false;
  constructor(config) {
    super();
    this.config = config;
    this.apiRoot = config.apiRoot || "https://api.telegram.org";
  }
  async connect() {
    if (!this.config.botToken) {
      throw new Error("Telegram botToken is required.");
    }
    this.setConnected(true);
    if (this.config.autoStart !== false) {
      this.startPolling();
    }
  }
  async disconnect() {
    this.stopPolling();
    this.setConnected(false);
  }
  normalizeUpdate(update) {
    if (!update)
      return null;
    const msg = update.message || update.edited_message || update.channel_post;
    if (!msg)
      return null;
    const chatType = msg.chat.type === "private" ? "dm" : msg.chat.type === "channel" ? "channel" : "group";
    const senderName = [msg.from?.first_name, msg.from?.last_name].filter(Boolean).join(" ");
    return {
      id: String(msg.message_id),
      channel: "telegram",
      sender: {
        id: String(msg.from?.id ?? ""),
        name: senderName || undefined,
        username: msg.from?.username,
        isBot: Boolean(msg.from?.is_bot)
      },
      chat: {
        id: String(msg.chat.id),
        type: chatType,
        title: msg.chat.title
      },
      content: {
        text: msg.text || msg.caption || "",
        replyToId: msg.reply_to_message?.message_id ? String(msg.reply_to_message.message_id) : undefined
      },
      raw: update,
      timestamp: (msg.date || Math.floor(Date.now() / 1000)) * 1000
    };
  }
  async callApi(method, body) {
    const url = `${this.apiRoot}/bot${this.config.botToken}/${method}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Telegram API ${method} failed: ${res.status} ${errText}`);
    }
    const data = await res.json();
    if (!data.ok) {
      throw new Error(`Telegram API ${method} error: ${data.description}`);
    }
    return data.result;
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
  startPolling() {
    if (this.isPolling)
      return;
    this.isPolling = true;
    const interval = this.config.pollIntervalMs || 1000;
    const poll = async () => {
      if (!this.isPolling)
        return;
      try {
        const updates = await this.callApi("getUpdates", {
          offset: this.lastUpdateId + 1,
          timeout: 10
        });
        if (Array.isArray(updates)) {
          for (const u of updates) {
            const unified = this.normalizeUpdate(u);
            if (unified) {
              await this.dispatchMessage(unified);
            }
            this.lastUpdateId = Math.max(this.lastUpdateId, u.update_id);
          }
        }
      } catch (err) {
        this.emit("error", err);
      } finally {
        if (this.isPolling) {
          this.pollTimer = setTimeout(poll, interval);
        }
      }
    };
    poll();
  }
  stopPolling() {
    this.isPolling = false;
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }
  }
  async sendText(chatId, text, options) {
    const payload = {
      chat_id: chatId,
      text
    };
    if (options?.replyToId) {
      payload.reply_to_message_id = Number(options.replyToId);
    }
    const res = await this.callApi("sendMessage", payload);
    return {
      messageId: String(res.message_id),
      chatId,
      timestamp: res.date * 1000
    };
  }
  async sendMedia(chatId, media, options) {
    const method = media.type === "image" ? "sendPhoto" : media.type === "video" ? "sendVideo" : media.type === "animation" ? "sendAnimation" : media.type === "sticker" ? "sendSticker" : "sendDocument";
    const payload = {
      chat_id: chatId,
      caption: media.caption
    };
    if (typeof media.source === "string") {
      if (media.type === "image")
        payload.photo = media.source;
      else if (media.type === "video")
        payload.video = media.source;
      else if (media.type === "animation")
        payload.animation = media.source;
      else if (media.type === "sticker")
        payload.sticker = media.source;
      else
        payload.document = media.source;
    }
    if (options?.replyToId) {
      payload.reply_to_message_id = Number(options.replyToId);
    }
    const res = await this.callApi(method, payload);
    return {
      messageId: String(res.message_id),
      chatId,
      timestamp: (res.date || Date.now()) * 1000
    };
  }
  async addReaction(chatId, messageId, emoji) {
    await this.callApi("setMessageReaction", {
      chat_id: chatId,
      message_id: Number(messageId),
      reaction: [{ type: "emoji", emoji }]
    });
  }
  async sendTyping(chatId) {
    await this.callApi("sendChatAction", {
      chat_id: chatId,
      action: "typing"
    });
  }
  async editText(chatId, messageId, text) {
    const res = await this.callApi("editMessageText", {
      chat_id: chatId,
      message_id: Number(messageId),
      text
    });
    return {
      messageId: String(res.message_id || messageId),
      chatId,
      timestamp: Date.now()
    };
  }
}
// src/channels/discord/adapter.ts
class DiscordChannelAdapter extends BaseChannel {
  name = "discord";
  config;
  apiBase = "https://discord.com/api/v10";
  ws;
  heartbeatTimer;
  sequence = null;
  constructor(config) {
    super();
    this.config = config;
  }
  async connect(signal) {
    this.assertNotAborted(signal);
    if (!this.config.botToken)
      throw new Error("Discord botToken is required.");
    await this.callApi("GET", "/users/@me");
    this.setConnected(true);
    if (this.config.autoStart !== false && typeof globalThis.WebSocket !== "undefined") {
      this.connectGateway();
    }
  }
  connectGateway() {
    const ws = new globalThis.WebSocket("wss://gateway.discord.gg/?v=10&encoding=json");
    this.ws = ws;
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data.toString());
        if (data.s !== null)
          this.sequence = data.s;
        if (data.op === 10) {
          const interval = data.d.heartbeat_interval;
          this.heartbeatTimer = setInterval(() => {
            ws.send(JSON.stringify({ op: 1, d: this.sequence }));
          }, interval);
          ws.send(JSON.stringify({
            op: 2,
            d: {
              token: this.config.botToken,
              intents: this.config.intents ?? 33280,
              properties: {
                os: process.platform,
                browser: "channelhub",
                device: "channelhub"
              }
            }
          }));
        }
        if (data.op === 0 && data.t === "MESSAGE_CREATE") {
          const msg = this.normalizeEvent(data.d);
          if (msg)
            this.emit("message", msg);
        }
      } catch (err) {}
    };
    ws.onclose = () => {
      if (this.heartbeatTimer)
        clearInterval(this.heartbeatTimer);
    };
  }
  async disconnect(signal) {
    this.assertNotAborted(signal);
    if (this.heartbeatTimer)
      clearInterval(this.heartbeatTimer);
    if (this.ws) {
      this.ws.close();
      this.ws = undefined;
    }
    this.setConnected(false);
  }
  normalizeEvent(event) {
    if (!event || event.type !== 0 && !event.content && !event.author) {
      if (!event?.content && !event?.d?.content)
        return null;
    }
    const msg = event.d || event;
    if (!msg.content && !msg.attachments?.length)
      return null;
    if (msg.author?.bot)
      return null;
    const isDm = !msg.guild_id;
    return {
      id: String(msg.id),
      channel: "discord",
      sender: {
        id: String(msg.author?.id ?? ""),
        name: msg.author?.global_name || msg.author?.username,
        username: msg.author?.username,
        isBot: Boolean(msg.author?.bot),
        avatarUrl: msg.author?.avatar ? `https://cdn.discordapp.com/avatars/${msg.author.id}/${msg.author.avatar}.png` : undefined
      },
      chat: {
        id: String(msg.channel_id),
        type: isDm ? "dm" : "channel",
        title: undefined
      },
      content: {
        text: msg.content || "",
        attachments: (msg.attachments || []).map((a) => ({
          type: a.content_type?.startsWith("image/") ? "image" : a.content_type?.startsWith("video/") ? "video" : "file",
          url: a.url,
          filename: a.filename,
          mimeType: a.content_type,
          size: a.size
        })),
        replyToId: msg.message_reference?.message_id ? String(msg.message_reference.message_id) : undefined
      },
      raw: event,
      timestamp: msg.timestamp ? Date.parse(msg.timestamp) : Date.now()
    };
  }
  async callApi(method, path, body) {
    const res = await fetch(`${this.apiBase}${path}`, {
      method,
      headers: {
        Authorization: `Bot ${this.config.botToken}`,
        "Content-Type": "application/json"
      },
      body: body ? JSON.stringify(body) : undefined
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Discord API ${method} ${path} failed: ${res.status} ${errText}`);
    }
    if (res.status === 204)
      return null;
    return res.json();
  }
  async sendText(chatId, text, options) {
    const payload = { content: text };
    if (options?.replyToId) {
      payload.message_reference = { message_id: options.replyToId };
    }
    const res = await this.callApi("POST", `/channels/${chatId}/messages`, payload);
    return {
      messageId: String(res.id),
      chatId,
      timestamp: Date.parse(res.timestamp) || Date.now()
    };
  }
  async sendMedia(chatId, media, options) {
    const payload = {
      content: media.caption || ""
    };
    if (typeof media.source === "string") {
      payload.embeds = [{ image: { url: media.source } }];
    }
    if (options?.replyToId) {
      payload.message_reference = { message_id: options.replyToId };
    }
    const res = await this.callApi("POST", `/channels/${chatId}/messages`, payload);
    return {
      messageId: String(res.id),
      chatId,
      timestamp: Date.parse(res.timestamp) || Date.now()
    };
  }
  async addReaction(chatId, messageId, emoji) {
    const encoded = encodeURIComponent(emoji);
    await this.callApi("PUT", `/channels/${chatId}/messages/${messageId}/reactions/${encoded}/@me`);
  }
  async sendTyping(chatId) {
    await this.callApi("POST", `/channels/${chatId}/typing`, {});
  }
  async editText(chatId, messageId, text) {
    const res = await this.callApi("PATCH", `/channels/${chatId}/messages/${messageId}`, {
      content: text
    });
    return {
      messageId: String(res.id || messageId),
      chatId,
      timestamp: Date.now()
    };
  }
}
// src/channels/slack/adapter.ts
class SlackChannelAdapter extends BaseChannel {
  name = "slack";
  config;
  apiBase = "https://slack.com/api";
  ws;
  constructor(config) {
    super();
    this.config = config;
  }
  async connect(signal) {
    this.assertNotAborted(signal);
    if (!this.config.botToken)
      throw new Error("Slack botToken is required.");
    await this.callApi("auth.test", {});
    if (this.config.appToken) {
      const res = await fetch("https://slack.com/api/apps.connections.open", {
        method: "POST",
        headers: { Authorization: `Bearer ${this.config.appToken}` }
      });
      const data = await res.json();
      if (data.ok && data.url) {
        this.ws = new globalThis.WebSocket(data.url);
        this.ws.onopen = () => this.emit("status", { status: "connected" });
        this.ws.onmessage = (e) => {
          try {
            const payload = JSON.parse(e.data.toString());
            if (payload.type === "hello")
              return;
            if (payload.envelope_id) {
              this.ws?.send(JSON.stringify({ envelope_id: payload.envelope_id }));
            }
            if (payload.payload && payload.payload.event && payload.payload.event.type === "message") {
              const msg = this.normalizeEvent(payload.payload);
              if (msg)
                this.emit("message", msg);
            }
          } catch (err) {}
        };
        this.ws.onerror = (e) => this.emit("error", new Error("Slack Socket Error"));
        this.ws.onclose = () => this.emit("status", { status: "disconnected" });
      }
    }
    this.setConnected(true);
  }
  async disconnect(signal) {
    this.assertNotAborted(signal);
    if (this.ws) {
      this.ws.close();
      this.ws = undefined;
    }
    this.setConnected(false);
  }
  normalizeEvent(event) {
    const msg = event.event || event;
    if (!msg || msg.type !== "message")
      return null;
    if (msg.subtype === "bot_message" || msg.bot_id)
      return null;
    const isDm = msg.channel_type === "im" || msg.channel && msg.channel.startsWith("D");
    return {
      id: String(msg.client_msg_id || msg.ts),
      channel: "slack",
      sender: {
        id: String(msg.user || ""),
        isBot: Boolean(msg.bot_id)
      },
      chat: {
        id: String(msg.channel),
        type: isDm ? "dm" : "channel"
      },
      content: {
        text: msg.text || "",
        replyToId: msg.thread_ts ? String(msg.thread_ts) : undefined
      },
      raw: event,
      timestamp: msg.ts ? parseFloat(msg.ts) * 1000 : Date.now()
    };
  }
  async callApi(method, body) {
    const res = await fetch(`${this.apiBase}/${method}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.config.botToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Slack API ${method} failed: ${res.status} ${errText}`);
    }
    const data = await res.json();
    if (!data.ok) {
      throw new Error(`Slack API ${method} error: ${data.error}`);
    }
    return data;
  }
  async sendText(chatId, text, options) {
    const payload = {
      channel: chatId,
      text
    };
    if (options?.replyToId) {
      payload.thread_ts = options.replyToId;
    }
    const res = await this.callApi("chat.postMessage", payload);
    return {
      messageId: String(res.ts),
      chatId,
      timestamp: parseFloat(res.ts) * 1000
    };
  }
  async sendMedia(chatId, media, options) {
    const payload = {
      channel: chatId,
      text: media.caption || "Attachment"
    };
    if (options?.replyToId) {
      payload.thread_ts = options.replyToId;
    }
    const res = await this.callApi("chat.postMessage", payload);
    return {
      messageId: String(res.ts),
      chatId,
      timestamp: parseFloat(res.ts) * 1000
    };
  }
  async addReaction(chatId, messageId, emoji) {
    const cleanName = emoji.replace(/:/g, "");
    await this.callApi("reactions.add", {
      channel: chatId,
      timestamp: messageId,
      name: cleanName
    });
  }
  async sendTyping(chatId) {}
  async editText(chatId, messageId, text) {
    const res = await this.callApi("chat.update", {
      channel: chatId,
      ts: messageId,
      text
    });
    return {
      messageId: String(res.ts || messageId),
      chatId,
      timestamp: Date.now()
    };
  }
}
// src/channels/messenger/adapter.ts
import http from "node:http";
class MessengerChannelAdapter extends BaseChannel {
  name = "messenger";
  config;
  apiBase;
  server;
  constructor(config) {
    super();
    this.config = config;
    const version = config.apiVersion || "v19.0";
    this.apiBase = `https://graph.facebook.com/${version}`;
  }
  async connect(signal) {
    this.assertNotAborted(signal);
    if (!this.config.pageAccessToken) {
      throw new Error("Messenger pageAccessToken is required.");
    }
    const res = await fetch(`${this.apiBase}/me`, {
      headers: { Authorization: `Bearer ${this.config.pageAccessToken}` }
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Failed to authenticate with Messenger Graph API: ${err}`);
    }
    if (this.config.port) {
      const path = this.config.webhookPath || "/webhook";
      this.server = http.createServer(async (req, res) => {
        const url = new URL(req.url || "/", `http://${req.headers.host}`);
        if (url.pathname !== path) {
          res.writeHead(404).end("Not Found");
          return;
        }
        if (req.method === "GET") {
          const mode = url.searchParams.get("hub.mode") || "";
          const token = url.searchParams.get("hub.verify_token") || "";
          const challenge = url.searchParams.get("hub.challenge") || "";
          const verified = this.verifyWebhook(mode, token, challenge);
          if (verified) {
            res.writeHead(200, { "Content-Type": "text/plain" }).end(verified);
          } else {
            res.writeHead(403).end("Forbidden");
          }
          return;
        }
        if (req.method === "POST") {
          let body = "";
          req.on("data", (chunk) => {
            body += chunk;
            if (body.length > 1024 * 1024)
              req.destroy();
          });
          req.on("end", () => {
            try {
              const data = JSON.parse(body);
              const msgs = this.normalizeEvent(data);
              for (const m of msgs) {
                this.emit("message", m);
              }
              res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify({ status: "ok" }));
            } catch (err) {
              res.writeHead(400).end("Bad Request");
            }
          });
          return;
        }
        res.writeHead(405).end("Method Not Allowed");
      });
      await new Promise((resolve) => {
        this.server?.listen(this.config.port, "0.0.0.0", () => {
          resolve();
        });
      });
    }
    this.setConnected(true);
  }
  async disconnect(signal) {
    this.assertNotAborted(signal);
    if (this.server) {
      await new Promise((resolve) => this.server?.close(() => resolve()));
      this.server = undefined;
    }
    this.setConnected(false);
  }
  verifyWebhook(mode, token, challenge) {
    if (mode === "subscribe" && token === this.config.verifyToken) {
      return challenge;
    }
    return null;
  }
  normalizeEvent(body) {
    const messages = [];
    if (body?.object !== "page" || !Array.isArray(body?.entry)) {
      return messages;
    }
    for (const entry of body.entry) {
      if (!Array.isArray(entry.messaging))
        continue;
      for (const event of entry.messaging) {
        if (!event.message && !event.postback)
          continue;
        const senderId = event.sender?.id || "";
        let text = event.message?.text || event.postback?.title || event.postback?.payload || "";
        const attachments = [];
        if (event.message?.sticker_id) {
          attachments.push({
            type: "image",
            url: event.message?.attachments?.[0]?.payload?.url || `https://facebook.com/sticker/${event.message.sticker_id}`,
            filename: `sticker_${event.message.sticker_id}.png`
          });
        }
        if (Array.isArray(event.message?.attachments)) {
          for (const att of event.message.attachments) {
            let type = "file";
            let url = att.payload?.url || att.url || "";
            let filename = att.payload?.name || att.title || undefined;
            if (att.type === "image")
              type = "image";
            else if (att.type === "video")
              type = "video";
            else if (att.type === "audio")
              type = "audio";
            else if (att.type === "location") {
              type = "file";
              const lat = att.payload?.coordinates?.lat;
              const long = att.payload?.coordinates?.long;
              if (lat != null && long != null) {
                url = `https://www.google.com/maps?q=${lat},${long}`;
                filename = "location.json";
                if (!text)
                  text = `\uD83D\uDCCD [Shared Location: ${lat}, ${long}]`;
              }
            } else if (att.type === "fallback") {
              type = "file";
              if (!text)
                text = `\uD83D\uDD17 [Shared Link: ${att.title || "URL"}]`;
            } else {
              type = "file";
            }
            if (filename) {
              filename = filename.replace(/[\/\\]/g, "_").replace(/\0/g, "");
            }
            if (att.type === "image" && att.payload?.sticker_id)
              continue;
            attachments.push({ type, url, filename });
          }
        }
        messages.push({
          id: event.message?.mid || event.postback?.mid || `fb_${Date.now()}`,
          channel: this.name,
          sender: {
            id: senderId,
            name: undefined
          },
          chat: {
            id: senderId,
            type: "dm"
          },
          content: {
            text,
            attachments,
            replyToId: event.message?.reply_to?.mid
          },
          raw: event,
          timestamp: event.timestamp || Date.now()
        });
      }
    }
    return messages;
  }
  async sendText(chatId, text, options) {
    const payload = {
      recipient: { id: chatId },
      message: { text }
    };
    if (options?.replyToId) {
      payload.message.reply_to = { mid: options.replyToId };
    }
    const res = await this.callApi("POST", "/me/messages", payload);
    return {
      messageId: res.message_id || res.recipient_id || `msg_${Date.now()}`,
      chatId,
      timestamp: Date.now()
    };
  }
  async sendMedia(chatId, media, options) {
    if (media.type === "sticker" && typeof media.source === "string" && /^\d+$/.test(media.source)) {
      const payload = {
        recipient: { id: chatId },
        message: {
          attachment: {
            type: "image",
            payload: { sticker_id: Number(media.source) }
          }
        }
      };
      if (options?.replyToId)
        payload.message.reply_to = { mid: options.replyToId };
      const res = await this.callApi("POST", "/me/messages", payload);
      return {
        messageId: res.message_id || res.recipient_id || `msg_${Date.now()}`,
        chatId,
        timestamp: Date.now()
      };
    }
    const attachmentType = media.type === "sticker" || media.type === "animation" ? "image" : media.type;
    if (typeof media.source === "string" && (media.source.startsWith("http://") || media.source.startsWith("https://"))) {
      const payload = {
        recipient: { id: chatId },
        message: {
          attachment: {
            type: attachmentType,
            payload: {
              url: media.source,
              is_reusable: true
            }
          }
        }
      };
      if (options?.replyToId) {
        payload.message.reply_to = { mid: options.replyToId };
      }
      const res = await this.callApi("POST", "/me/messages", payload);
      return {
        messageId: res.message_id || res.recipient_id || `msg_${Date.now()}`,
        chatId,
        timestamp: Date.now()
      };
    }
    let buffer;
    let mimeType = media.mimeType;
    let filename = media.filename || "file";
    if (typeof media.source === "string") {
      const fs = await import("node:fs");
      const path = await import("node:path");
      const resolvedPath = path.resolve(media.source);
      if (!fs.existsSync(resolvedPath) || !fs.statSync(resolvedPath).isFile()) {
        throw new Error(`Media file not found or is invalid: ${media.source}`);
      }
      buffer = new Uint8Array(fs.readFileSync(resolvedPath));
      if (!media.filename) {
        filename = path.basename(resolvedPath);
      }
    } else {
      buffer = new Uint8Array(media.source);
    }
    const fileSize = buffer.byteLength;
    if (fileSize > 104857600) {
      throw new Error(`Messenger attachment limit exceeded: File size is ${(fileSize / 1048576).toFixed(1)}MB. Meta Messenger caps file/video uploads at 100MB. Please compress the file or provide a streaming URL.`);
    }
    if (!mimeType) {
      const ext = filename.split(".").pop()?.toLowerCase();
      if (ext === "mp4")
        mimeType = "video/mp4";
      else if (ext === "mov")
        mimeType = "video/quicktime";
      else if (ext === "webm")
        mimeType = "video/webm";
      else if (ext === "avi")
        mimeType = "video/x-msvideo";
      else if (ext === "mkv")
        mimeType = "video/x-matroska";
      else if (ext === "jpg" || ext === "jpeg")
        mimeType = "image/jpeg";
      else if (ext === "png")
        mimeType = "image/png";
      else if (ext === "gif")
        mimeType = "image/gif";
      else if (ext === "webp")
        mimeType = "image/webp";
      else if (ext === "mp3")
        mimeType = "audio/mpeg";
      else if (ext === "wav")
        mimeType = "audio/wav";
      else if (ext === "ogg")
        mimeType = "audio/ogg";
      else if (ext === "m4a")
        mimeType = "audio/mp4";
      else if (ext === "pdf")
        mimeType = "application/pdf";
      else
        mimeType = "application/octet-stream";
    }
    const blob = new Blob([buffer], { type: mimeType });
    if (fileSize > 26214400) {
      const uploadFormData = new FormData;
      uploadFormData.append("message", JSON.stringify({
        attachment: {
          type: attachmentType,
          payload: { is_reusable: true }
        }
      }));
      uploadFormData.append("filedata", blob, filename);
      const uploadUrl = `${this.apiBase}/me/message_attachments`;
      const uploadRes = await fetch(uploadUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.config.pageAccessToken}`
        },
        body: uploadFormData
      });
      if (uploadRes.ok) {
        const uploadData = await uploadRes.json();
        if (uploadData.attachment_id) {
          const payload = {
            recipient: { id: chatId },
            message: {
              attachment: {
                type: attachmentType,
                payload: { attachment_id: uploadData.attachment_id }
              }
            }
          };
          if (options?.replyToId)
            payload.message.reply_to = { mid: options.replyToId };
          const res = await this.callApi("POST", "/me/messages", payload);
          return {
            messageId: res.message_id || res.recipient_id || `msg_${Date.now()}`,
            chatId,
            timestamp: Date.now()
          };
        }
      }
    }
    const formData = new FormData;
    formData.append("recipient", JSON.stringify({ id: chatId }));
    formData.append("message", JSON.stringify({
      attachment: {
        type: attachmentType,
        payload: {}
      }
    }));
    formData.append("filedata", blob, filename);
    const url = `${this.apiBase}/me/messages`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.config.pageAccessToken}`
      },
      body: formData
    });
    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Messenger API Error (${response.status}): ${err}`);
    }
    const res = await response.json();
    return {
      messageId: res.message_id || res.recipient_id || `msg_${Date.now()}`,
      chatId,
      timestamp: Date.now()
    };
  }
  async sendTyping(chatId) {
    await this.callApi("POST", "/me/messages", {
      recipient: { id: chatId },
      sender_action: "typing_on"
    });
  }
  async callApi(method, path, body) {
    const url = `${this.apiBase}${path}`;
    const headers = {
      Authorization: `Bearer ${this.config.pageAccessToken}`,
      "Content-Type": "application/json"
    };
    const res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Messenger API Error (${res.status}): ${err}`);
    }
    return await res.json();
  }
}
// bin/mcp-server.ts
import fs from "node:fs";
async function main() {
  const hub = new ChannelHub;
  if (fs.existsSync(CONFIG.PERSONAL.CRED_PATH)) {
    hub.register(new ZaloChannelAdapter({ credentialsPath: CONFIG.PERSONAL.CRED_PATH }));
  }
  if (process.env.TELEGRAM_BOT_TOKEN) {
    hub.register(new TelegramChannelAdapter({ botToken: process.env.TELEGRAM_BOT_TOKEN }));
  }
  if (process.env.DISCORD_BOT_TOKEN) {
    hub.register(new DiscordChannelAdapter({ botToken: process.env.DISCORD_BOT_TOKEN }));
  }
  if (process.env.SLACK_BOT_TOKEN) {
    hub.register(new SlackChannelAdapter({ botToken: process.env.SLACK_BOT_TOKEN }));
  }
  if (process.env.MESSENGER_PAGE_TOKEN) {
    hub.register(new MessengerChannelAdapter({
      pageAccessToken: process.env.MESSENGER_PAGE_TOKEN,
      verifyToken: process.env.MESSENGER_VERIFY_TOKEN || "channelhub_mcp"
    }));
  }
  await hub.start();
  const server = new Server({
    name: "channelhub-mcp",
    version: "1.4.1"
  }, {
    capabilities: {
      tools: {}
    }
  });
  const internalTools = getChannelHubMcpTools();
  const mcpTools = internalTools.map((t) => ({
    name: t.name,
    description: t.description,
    inputSchema: t.parameters
  }));
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools: mcpTools };
  });
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    const safeArgs = args || {};
    const result = await handleChannelHubMcpCall(hub, name, safeArgs);
    return {
      content: result.content,
      isError: result.isError
    };
  });
  const transport = new StdioServerTransport;
  await server.connect(transport);
  console.error("\uD83D\uDE80 ChannelHub MCP Server is running on stdio!");
}
main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
