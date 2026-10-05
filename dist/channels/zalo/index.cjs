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
var __commonJS = (cb, mod) => () => (mod || cb((mod = { exports: {} }).exports, mod), mod.exports);
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

// node_modules/dotenv/package.json
var require_package = __commonJS(function(exports2, module2) {
  module2.exports = {
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
var require_main = __commonJS(function(exports2, module2) {
  var fs = require("fs");
  var path = require("path");
  var os = require("os");
  var crypto = require("crypto");
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
  module2.exports.configDotenv = DotenvModule.configDotenv;
  module2.exports._configVault = DotenvModule._configVault;
  module2.exports._parseVault = DotenvModule._parseVault;
  module2.exports.config = DotenvModule.config;
  module2.exports.decrypt = DotenvModule.decrypt;
  module2.exports.parse = DotenvModule.parse;
  module2.exports.populate = DotenvModule.populate;
  module2.exports = DotenvModule;
});

// src/channels/zalo/index.ts
var exports_zalo = {};
__export(exports_zalo, {
  EMOJI_TO_ZALO: () => EMOJI_TO_ZALO,
  Reactions: () => Reactions,
  ZaloChannelAdapter: () => ZaloChannelAdapter,
  ZaloOABot: () => ZaloOABot,
  ZaloPersonalBot: () => ZaloPersonalBot,
  ZaloReactions: () => ZaloReactions,
  ZaloThreadType: () => ZaloThreadType,
  initOABot: () => initOABot,
  initPersonalBot: () => initPersonalBot
});
module.exports = __toCommonJS(exports_zalo);

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
  capabilities = {
    inbound: true,
    outbound: true,
    media: ["image", "video", "file", "audio", "animation", "sticker"],
    reactions: true,
    editing: false,
    typing: true,
    mode: "gateway"
  };
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
  async connect(signal) {
    this.assertNotAborted(signal);
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
  async disconnect(signal) {
    this.assertNotAborted(signal);
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
    this.api.listener.on("message", async (raw) => {
      this.recordInbound(raw);
      const unified = this.normalizeMessage(raw);
      if (unified) {
        await this.dispatchMessage(unified);
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
    this.assertNotAborted(options?.signal);
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
    this.assertNotAborted(options?.signal);
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
  async addReaction(chatId, messageId, emoji, options) {
    this.assertNotAborted(options?.signal);
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
  async sendTyping(chatId, options) {
    this.assertNotAborted(options?.signal);
    if (!this.api?.sendTypingEvent)
      return;
    const threadType = this.resolveThreadType(chatId);
    try {
      await this.api.sendTypingEvent(chatId, true, threadType);
    } catch {}
  }
}
// src/channels/zalo/types.ts
var ZaloThreadType;
((ZaloThreadType) => {
  ZaloThreadType[ZaloThreadType["User"] = 0] = "User";
  ZaloThreadType[ZaloThreadType["Group"] = 1] = "Group";
})(ZaloThreadType ||= {});
var ZaloReactions = {
  HEART: "/-heart",
  LIKE: "/-strong",
  HAHA: ":>",
  WOW: ":o",
  CRY: ":-((",
  ANGRY: ":-h",
  KISS: ":-*",
  TEARS_OF_JOY: ":')",
  SHIT: "/-shit",
  ROSE: "/-rose",
  BROKEN_HEART: "/-break",
  DISLIKE: "/-weak",
  LOVE: ";xx",
  CONFUSED: ";-/",
  WINK: ";-)",
  FADE: "/-fade",
  SUN: "/-li",
  BIRTHDAY: "/-bd",
  BOMB: "/-bome",
  OK: "/-ok",
  PEACE: "/-v",
  THANKS: "/-thanks",
  PUNCH: "/-punch",
  SHARE: "/-share",
  PRAY: "_()_",
  NO: "/-no",
  BAD: "/-bad",
  LOVE_YOU: "/-loveu",
  SAD: "--b",
  VERY_SAD: ":((",
  COOL: "x-)",
  NERD: "8-)",
  BIG_SMILE: ";-d",
  SUNGLASSES: "b-)",
  NEUTRAL: ":--|",
  SAD_FACE: "p-(",
  BYE: ":-bye",
  SLEEPY: "|-)",
  WIPE: ":wipe",
  DIG: ":-dig",
  ANGUISH: "&-(",
  HANDCLAP: ":handclap",
  ANGRY_FACE: ">-|",
  F_CHAIR: ":-f",
  L_CHAIR: ":-l",
  R_CHAIR: ":-r",
  SILENT: ";-x",
  SURPRISE: ":-o",
  EMBARRASSED: ";-s",
  AFRAID: ";-a",
  SAD2: ":-<",
  BIG_LAUGH: ":))",
  RICH: "$-)",
  BEER: "/-beer",
  NONE: ""
};
var Reactions = ZaloReactions;
// src/personal/client.ts
class ZaloPersonalBot {
  api;
  constructor(apiInstance) {
    this.api = apiInstance;
  }
  async sendMessage(message, threadId, type = 1 /* Group */) {
    return await this.api.sendMessage(message, threadId, type);
  }
  async sendText(threadId, text, mentions = [], isGroup = true) {
    const type = isGroup ? 1 /* Group */ : 0 /* User */;
    return await this.api.sendMessage({ msg: text, mentions }, threadId, type);
  }
  async sendImage(threadId, imagePath, caption = "", isGroup = true) {
    const type = isGroup ? 1 /* Group */ : 0 /* User */;
    const attachments = Array.isArray(imagePath) ? imagePath : [imagePath];
    return await this.api.sendMessage({ msg: caption, attachments }, threadId, type);
  }
  async sendVideo(threadId, videoPath, caption = "", isGroup = true) {
    const type = isGroup ? 1 /* Group */ : 0 /* User */;
    return await this.api.sendVideo({ video: videoPath, msg: caption }, threadId, type);
  }
  async sendVoice(threadId, voicePath, isGroup = true) {
    const type = isGroup ? 1 /* Group */ : 0 /* User */;
    return await this.api.sendVoice(voicePath, threadId, type);
  }
  async sendLink(threadId, link, isGroup = true) {
    const type = isGroup ? 1 /* Group */ : 0 /* User */;
    return await this.api.sendLink(link, threadId, type);
  }
  async sendCard(threadId, cardPayload, isGroup = true) {
    const type = isGroup ? 1 /* Group */ : 0 /* User */;
    return await this.api.sendCard(cardPayload, threadId, type);
  }
  async sendBankCard(threadId, payload, isGroup = true) {
    const type = isGroup ? 1 /* Group */ : 0 /* User */;
    return await this.api.sendBankCard(payload, threadId, type);
  }
  async forwardMessage(threadId, msgId, type = 1 /* Group */) {
    return await this.api.forwardMessage(msgId, threadId, type);
  }
  async recallMessage(msgObj) {
    return await this.api.undo(msgObj);
  }
  async deleteMessage(msgObj, onlyMe = false) {
    return await this.api.deleteMessage(msgObj, onlyMe);
  }
  async deleteChat(threadId, type = 1 /* Group */) {
    return await this.api.deleteChat(threadId, type);
  }
  async parseLink(link) {
    return await this.api.parseLink(link);
  }
  async scanURL(url) {
    return await this.api.scanURL(url);
  }
  async addReaction(threadId, msgId, cliMsgId, emojiOrReaction = ZaloReactions.HEART, isGroup = true) {
    const type = isGroup ? 1 /* Group */ : 0 /* User */;
    const unicodeMap = {
      "❤️": ZaloReactions.HEART,
      "\uD83D\uDC96": ZaloReactions.HEART,
      "\uD83D\uDC4D": ZaloReactions.LIKE,
      "\uD83D\uDE06": ZaloReactions.HAHA,
      "\uD83D\uDE02": ZaloReactions.TEARS_OF_JOY,
      "\uD83D\uDE2E": ZaloReactions.WOW,
      "\uD83D\uDE2D": ZaloReactions.CRY,
      "\uD83D\uDE21": ZaloReactions.ANGRY,
      "\uD83D\uDE18": ZaloReactions.KISS,
      "\uD83D\uDCA9": ZaloReactions.SHIT,
      "\uD83C\uDF39": ZaloReactions.ROSE,
      "\uD83D\uDC94": ZaloReactions.BROKEN_HEART,
      "\uD83D\uDC4E": ZaloReactions.DISLIKE,
      "\uD83D\uDE0D": ZaloReactions.LOVE,
      "\uD83E\uDD14": ZaloReactions.CONFUSED,
      "\uD83D\uDE09": ZaloReactions.WINK,
      "☀️": ZaloReactions.SUN,
      "\uD83C\uDF82": ZaloReactions.BIRTHDAY,
      "\uD83D\uDCA3": ZaloReactions.BOMB,
      "\uD83D\uDC4C": ZaloReactions.OK,
      "✌️": ZaloReactions.PEACE,
      "\uD83D\uDE4F": ZaloReactions.PRAY,
      "\uD83D\uDC4F": ZaloReactions.HANDCLAP,
      "\uD83D\uDE0E": ZaloReactions.SUNGLASSES,
      "\uD83D\uDC4B": ZaloReactions.BYE,
      "\uD83D\uDE34": ZaloReactions.SLEEPY
    };
    const targetReaction = unicodeMap[emojiOrReaction] || emojiOrReaction;
    return await this.api.addReaction(targetReaction, {
      data: { msgId, cliMsgId },
      threadId,
      type
    });
  }
  async sendTypingEvent(threadId, isTyping = true, isGroup = true) {
    const type = isGroup ? 1 /* Group */ : 0 /* User */;
    return await this.api.sendTypingEvent(threadId, isTyping, type);
  }
  async sendSeenEvent(threadId, msgId, isGroup = true) {
    const type = isGroup ? 1 /* Group */ : 0 /* User */;
    return await this.api.sendSeenEvent(threadId, msgId, type);
  }
  async sendDeliveredEvent(threadId, msgId, isGroup = true) {
    const type = isGroup ? 1 /* Group */ : 0 /* User */;
    return await this.api.sendDeliveredEvent(threadId, msgId, type);
  }
  async addUnreadMark(threadId, isGroup = true) {
    const type = isGroup ? 1 /* Group */ : 0 /* User */;
    return await this.api.addUnreadMark(threadId, type);
  }
  async removeUnreadMark(threadId, isGroup = true) {
    const type = isGroup ? 1 /* Group */ : 0 /* User */;
    return await this.api.removeUnreadMark(threadId, type);
  }
  async getUnreadMark() {
    return await this.api.getUnreadMark();
  }
  async sendSticker(threadId, stickerDetail, isGroup = true) {
    const type = isGroup ? 1 /* Group */ : 0 /* User */;
    return await this.api.sendSticker(stickerDetail, threadId, type);
  }
  async getStickers(keyword) {
    return await this.api.getStickers(keyword);
  }
  async searchSticker(keyword) {
    return await this.api.searchSticker(keyword);
  }
  async getStickersDetail(stickerId) {
    return await this.api.getStickersDetail(stickerId);
  }
  async getStickerCategoryDetail(cateId) {
    return await this.api.getStickerCategoryDetail(cateId);
  }
  async uploadAttachment(filePath, threadId, type = 1 /* Group */) {
    return await this.api.uploadAttachment(filePath, threadId, type);
  }
  async createGroup(name, members = []) {
    return await this.api.createGroup({ name, members });
  }
  async disperseGroup(groupId) {
    return await this.api.disperseGroup(groupId);
  }
  async leaveGroup(groupId) {
    return await this.api.leaveGroup(groupId);
  }
  async changeGroupName(groupId, newName) {
    return await this.api.changeGroupName(newName, groupId);
  }
  async changeGroupAvatar(groupId, avatarPath) {
    return await this.api.changeGroupAvatar(groupId, avatarPath);
  }
  async changeGroupOwner(groupId, newOwnerId) {
    return await this.api.changeGroupOwner(newOwnerId, groupId);
  }
  async addGroupDeputy(groupId, memberId) {
    return await this.api.addGroupDeputy(memberId, groupId);
  }
  async removeGroupDeputy(groupId, memberId) {
    return await this.api.removeGroupDeputy(memberId, groupId);
  }
  async addUserToGroup(groupId, members) {
    return await this.api.addUserToGroup(members, groupId);
  }
  async removeUserFromGroup(groupId, members) {
    return await this.api.removeUserFromGroup(members, groupId);
  }
  async addGroupBlockedMember(groupId, memberId) {
    return await this.api.addGroupBlockedMember(memberId, groupId);
  }
  async removeGroupBlockedMember(groupId, memberId) {
    return await this.api.removeGroupBlockedMember(memberId, groupId);
  }
  async getGroupBlockedMember(groupId) {
    return await this.api.getGroupBlockedMember(groupId);
  }
  async getGroupInfo(groupId) {
    return await this.api.getGroupInfo(groupId);
  }
  async getAllGroups() {
    return await this.api.getAllGroups();
  }
  async getGroupMembersInfo(groupId) {
    return await this.api.getGroupMembersInfo(groupId);
  }
  async getPendingGroupMembers(groupId) {
    return await this.api.getPendingGroupMembers(groupId);
  }
  async reviewPendingMemberRequest(groupId, memberId, isAccept = true) {
    return await this.api.reviewPendingMemberRequest(groupId, memberId, isAccept);
  }
  async updateGroupSettings(groupId, settings) {
    return await this.api.updateGroupSettings(groupId, settings);
  }
  async upgradeGroupToCommunity(groupId) {
    return await this.api.upgradeGroupToCommunity(groupId);
  }
  async inviteUserToGroups(userId, groupIds) {
    return await this.api.inviteUserToGroups(userId, groupIds);
  }
  async getGroupLinkInfo(groupId) {
    return await this.api.getGroupLinkInfo(groupId);
  }
  async getGroupLinkDetail(linkId) {
    return await this.api.getGroupLinkDetail(linkId);
  }
  async enableGroupLink(groupId) {
    return await this.api.enableGroupLink(groupId);
  }
  async disableGroupLink(groupId) {
    return await this.api.disableGroupLink(groupId);
  }
  async joinGroupLink(link) {
    return await this.api.joinGroupLink(link);
  }
  async getGroupInviteBoxList() {
    return await this.api.getGroupInviteBoxList();
  }
  async getGroupInviteBoxInfo(boxId) {
    return await this.api.getGroupInviteBoxInfo(boxId);
  }
  async joinGroupInviteBox(boxId) {
    return await this.api.joinGroupInviteBox(boxId);
  }
  async deleteGroupInviteBox(boxId) {
    return await this.api.deleteGroupInviteBox(boxId);
  }
  async createPoll(groupId, question, options, settings) {
    return await this.api.createPoll({ groupId, question, options, ...settings || {} });
  }
  async votePoll(pollId, optionIds) {
    return await this.api.votePoll(pollId, optionIds);
  }
  async addPollOptions(pollId, options) {
    return await this.api.addPollOptions(pollId, options);
  }
  async lockPoll(pollId) {
    return await this.api.lockPoll(pollId);
  }
  async sharePoll(pollId, threadId) {
    return await this.api.sharePoll(pollId, threadId);
  }
  async getPollDetail(pollId) {
    return await this.api.getPollDetail(pollId);
  }
  async createNote(threadId, title, content, isGroup = true) {
    const type = isGroup ? 1 /* Group */ : 0 /* User */;
    return await this.api.createNote({ title, content }, threadId, type);
  }
  async editNote(noteId, title, content, threadId, isGroup = true) {
    const type = isGroup ? 1 /* Group */ : 0 /* User */;
    return await this.api.editNote(noteId, { title, content }, threadId, type);
  }
  async getListBoard(threadId, isGroup = true) {
    const type = isGroup ? 1 /* Group */ : 0 /* User */;
    return await this.api.getListBoard(threadId, type);
  }
  async getFriendBoardList(friendId) {
    return await this.api.getFriendBoardList(friendId);
  }
  async createReminder(threadId, content, remindTime, isGroup = true) {
    const type = isGroup ? 1 /* Group */ : 0 /* User */;
    return await this.api.createReminder({ content, remindTime }, threadId, type);
  }
  async editReminder(reminderId, content, remindTime, threadId, isGroup = true) {
    const type = isGroup ? 1 /* Group */ : 0 /* User */;
    return await this.api.editReminder(reminderId, { content, remindTime }, threadId, type);
  }
  async removeReminder(reminderId, threadId, isGroup = true) {
    const type = isGroup ? 1 /* Group */ : 0 /* User */;
    return await this.api.removeReminder(reminderId, threadId, type);
  }
  async getReminder(reminderId, threadId, isGroup = true) {
    const type = isGroup ? 1 /* Group */ : 0 /* User */;
    return await this.api.getReminder(reminderId, threadId, type);
  }
  async getListReminder(threadId, isGroup = true) {
    const type = isGroup ? 1 /* Group */ : 0 /* User */;
    return await this.api.getListReminder(threadId, type);
  }
  async getReminderResponses(reminderId) {
    return await this.api.getReminderResponses(reminderId);
  }
  async getAllFriends() {
    return await this.api.getAllFriends();
  }
  async getCloseFriends() {
    return await this.api.getCloseFriends();
  }
  async getFriendOnlines() {
    return await this.api.getFriendOnlines();
  }
  async getFriendRecommendations() {
    return await this.api.getFriendRecommendations();
  }
  async getRelatedFriendGroup() {
    return await this.api.getRelatedFriendGroup();
  }
  async sendFriendRequest(userId, msg = "") {
    return await this.api.sendFriendRequest(userId, msg);
  }
  async acceptFriendRequest(userId) {
    return await this.api.acceptFriendRequest(userId);
  }
  async rejectFriendRequest(userId) {
    return await this.api.rejectFriendRequest(userId);
  }
  async undoFriendRequest(userId) {
    return await this.api.undoFriendRequest(userId);
  }
  async getSentFriendRequest() {
    return await this.api.getSentFriendRequest();
  }
  async getFriendRequestStatus(userId) {
    return await this.api.getFriendRequestStatus(userId);
  }
  async removeFriend(userId) {
    return await this.api.removeFriend(userId);
  }
  async changeFriendAlias(friendId, alias) {
    return await this.api.changeFriendAlias(friendId, alias);
  }
  async removeFriendAlias(friendId) {
    return await this.api.removeFriendAlias(friendId);
  }
  async getAliasList() {
    return await this.api.getAliasList();
  }
  async blockUser(userId) {
    return await this.api.blockUser(userId);
  }
  async unblockUser(userId) {
    return await this.api.unblockUser(userId);
  }
  async blockViewFeed(userId, isBlock = true) {
    return await this.api.blockViewFeed(userId, isBlock);
  }
  async findUserByPhone(phone) {
    return await this.api.findUser(phone);
  }
  async findUserByUsername(username) {
    return await this.api.findUserByUsername(username);
  }
  async getMultiUsersByPhones(phones) {
    return await this.api.getMultiUsersByPhones(phones);
  }
  async getUserInfo(userId) {
    return await this.api.getUserInfo(userId);
  }
  async getOwnId() {
    return await this.api.getOwnId();
  }
  async fetchAccountInfo() {
    return await this.api.fetchAccountInfo();
  }
  async getBizAccount(userId) {
    return await this.api.getBizAccount(userId);
  }
  async lastOnline(userId) {
    return await this.api.lastOnline(userId);
  }
  async updateProfile(profileData) {
    return await this.api.updateProfile(profileData);
  }
  async updateProfileBio(bio) {
    return await this.api.updateProfileBio(bio);
  }
  async changeAccountAvatar(avatarPath) {
    return await this.api.changeAccountAvatar(avatarPath);
  }
  async deleteAvatar(avatarId) {
    return await this.api.deleteAvatar(avatarId);
  }
  async reuseAvatar(avatarId) {
    return await this.api.reuseAvatar(avatarId);
  }
  async getAvatarList() {
    return await this.api.getAvatarList();
  }
  async getFullAvatar(userId) {
    return await this.api.getFullAvatar(userId);
  }
  async getAvatarUrlProfile(userId) {
    return await this.api.getAvatarUrlProfile(userId);
  }
  async getGroupChatHistory(groupId, count = 20) {
    return await this.api.getGroupChatHistory(groupId, count);
  }
  async setMute(threadId, duration = -1, isGroup = true) {
    const type = isGroup ? 1 /* Group */ : 0 /* User */;
    return await this.api.setMute(threadId, duration, type);
  }
  async getMute(threadId, isGroup = true) {
    const type = isGroup ? 1 /* Group */ : 0 /* User */;
    return await this.api.getMute(threadId, type);
  }
  async setPinnedConversations(threadId, isPin = true, isGroup = true) {
    const type = isGroup ? 1 /* Group */ : 0 /* User */;
    return await this.api.setPinnedConversations(threadId, isPin, type);
  }
  async getPinConversations() {
    return await this.api.getPinConversations();
  }
  async setHiddenConversations(threadId, pinCode, isGroup = true) {
    const type = isGroup ? 1 /* Group */ : 0 /* User */;
    return await this.api.setHiddenConversations(threadId, pinCode, type);
  }
  async getHiddenConversations() {
    return await this.api.getHiddenConversations();
  }
  async updateHiddenConversPin(oldPin, newPin) {
    return await this.api.updateHiddenConversPin(oldPin, newPin);
  }
  async resetHiddenConversPin() {
    return await this.api.resetHiddenConversPin();
  }
  async updateAutoDeleteChat(threadId, ttl, isGroup = true) {
    const type = isGroup ? 1 /* Group */ : 0 /* User */;
    return await this.api.updateAutoDeleteChat(threadId, ttl, type);
  }
  async getAutoDeleteChat(threadId, isGroup = true) {
    const type = isGroup ? 1 /* Group */ : 0 /* User */;
    return await this.api.getAutoDeleteChat(threadId, type);
  }
  async updateArchivedChatList(threadId, isArchive = true, isGroup = true) {
    const type = isGroup ? 1 /* Group */ : 0 /* User */;
    return await this.api.updateArchivedChatList(threadId, isArchive, type);
  }
  async getArchivedChatList() {
    return await this.api.getArchivedChatList();
  }
  async addQuickMessage(shortcut, message) {
    return await this.api.addQuickMessage({ shortcut, message });
  }
  async updateQuickMessage(id, shortcut, message) {
    return await this.api.updateQuickMessage(id, { shortcut, message });
  }
  async removeQuickMessage(id) {
    return await this.api.removeQuickMessage(id);
  }
  async getQuickMessageList() {
    return await this.api.getQuickMessageList();
  }
  async createAutoReply(data) {
    return await this.api.createAutoReply(data);
  }
  async updateAutoReply(id, data) {
    return await this.api.updateAutoReply(id, data);
  }
  async deleteAutoReply(id) {
    return await this.api.deleteAutoReply(id);
  }
  async getAutoReplyList() {
    return await this.api.getAutoReplyList();
  }
  async getLabels() {
    return await this.api.getLabels();
  }
  async updateLabels(labelsData) {
    return await this.api.updateLabels(labelsData);
  }
  async createCatalog(name) {
    return await this.api.createCatalog(name);
  }
  async updateCatalog(catalogId, name) {
    return await this.api.updateCatalog(catalogId, name);
  }
  async deleteCatalog(catalogId) {
    return await this.api.deleteCatalog(catalogId);
  }
  async getCatalogList() {
    return await this.api.getCatalogList();
  }
  async registerCatalog(catalogData) {
    return await this.api.registerCatalog(catalogData);
  }
  async createProductCatalog(productData) {
    return await this.api.createProductCatalog(productData);
  }
  async updateProductCatalog(productId, productData) {
    return await this.api.updateProductCatalog(productId, productData);
  }
  async deleteProductCatalog(productId) {
    return await this.api.deleteProductCatalog(productId);
  }
  async getProductCatalogList() {
    return await this.api.getProductCatalogList();
  }
  async uploadProductPhoto(photoPath) {
    return await this.api.uploadProductPhoto(photoPath);
  }
  async createBankAccount(bankData) {
    return await this.api.createBankAccount(bankData);
  }
  async updateBankAccount(bankId, bankData) {
    return await this.api.updateBankAccount(bankId, bankData);
  }
  async deleteBankAccount(bankId) {
    return await this.api.deleteBankAccount(bankId);
  }
  async getListBank() {
    return await this.api.getListBank();
  }
  async getListBankAccount() {
    return await this.api.getListBankAccount();
  }
  async getSettings() {
    return await this.api.getSettings();
  }
  async updateSettings(settings) {
    return await this.api.updateSettings(settings);
  }
  async updateActiveStatus(isActive) {
    return await this.api.updateActiveStatus(isActive);
  }
  async updateLang(lang) {
    return await this.api.updateLang(lang);
  }
  async getListDevice() {
    return await this.api.getListDevice();
  }
  async getQR() {
    return await this.api.getQR();
  }
  async getCookie() {
    return await this.api.getCookie();
  }
  async getContext() {
    return await this.api.getContext();
  }
  async keepAlive() {
    return await this.api.keepAlive();
  }
  async lostFocus() {
    return await this.api.lostFocus();
  }
  async sendReport(reportData) {
    return await this.api.sendReport(reportData);
  }
  async custom(service, endpoint, body) {
    return await this.api.custom(service, endpoint, body);
  }
}
// src/config/env.ts
var import_node_path = __toESM(require("node:path"), 1);
var import_dotenv = __toESM(require_main(), 1);
import_dotenv.default.config();
var CONFIG = {
  PERSONAL: {
    CRED_PATH: process.env.ZALO_CRED_PATH || import_node_path.default.resolve("./credentials.json"),
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

// src/oa/client.ts
class ZaloOABot {
  accessToken;
  baseUrl;
  constructor(accessToken = CONFIG.OA.ACCESS_TOKEN) {
    this.accessToken = accessToken;
    this.baseUrl = CONFIG.OA.BASE_URL;
  }
  setAccessToken(token) {
    this.accessToken = token;
  }
  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      "Content-Type": "application/json",
      access_token: this.accessToken,
      ...options.headers || {}
    };
    const res = await fetch(url, { ...options, headers });
    return await res.json();
  }
  async sendConsultantText(userId, text) {
    return await this.request("/message/cs", {
      method: "POST",
      body: JSON.stringify({ recipient: { user_id: userId }, message: { text } })
    });
  }
  async sendConsultantImage(userId, attachmentId, text = "") {
    return await this.request("/message/cs", {
      method: "POST",
      body: JSON.stringify({
        recipient: { user_id: userId },
        message: {
          text,
          attachment: {
            type: "template",
            payload: {
              template_type: "media",
              elements: [{ media_type: "image", attachment_id: attachmentId }]
            }
          }
        }
      })
    });
  }
  async sendTransactionMessage(userId, templateId, templateData) {
    return await this.request("/message/transaction", {
      method: "POST",
      body: JSON.stringify({
        recipient: { user_id: userId },
        message: {
          attachment: {
            type: "template",
            payload: {
              template_type: "transaction",
              template_id: templateId,
              template_data: templateData
            }
          }
        }
      })
    });
  }
  async sendPromotionMessage(userId, templateId, templateData) {
    return await this.request("/message/promotion", {
      method: "POST",
      body: JSON.stringify({
        recipient: { user_id: userId },
        message: {
          attachment: {
            type: "template",
            payload: {
              template_type: "promotion",
              template_id: templateId,
              template_data: templateData
            }
          }
        }
      })
    });
  }
  async getProfile(userId) {
    return await this.request(`/user/detail?data=${encodeURIComponent(JSON.stringify({ user_id: userId }))}`, {
      method: "GET"
    });
  }
  async getFollowers(offset = 0, count = 50) {
    return await this.request(`/user/getlist?data=${encodeURIComponent(JSON.stringify({ offset, count }))}`, {
      method: "GET"
    });
  }
  async getTags() {
    return await this.request("/tag/gettagsofoa", { method: "GET" });
  }
  async tagUser(userId, tagName) {
    return await this.request("/tag/taguser", {
      method: "POST",
      body: JSON.stringify({ user_id: userId, tag_name: tagName })
    });
  }
  async removeTag(userId, tagName) {
    return await this.request("/tag/rmuserfromtag", {
      method: "POST",
      body: JSON.stringify({ user_id: userId, tag_name: tagName })
    });
  }
  async uploadImage(imageBlob) {
    const formData = new FormData;
    formData.append("file", imageBlob);
    const res = await fetch("https://openapi.zalo.me/v2.0/oa/upload/image", {
      method: "POST",
      headers: { access_token: this.accessToken },
      body: formData
    });
    return await res.json();
  }
  async refreshAccessToken(refreshToken = CONFIG.OA.REFRESH_TOKEN) {
    const params = new URLSearchParams({
      app_id: CONFIG.OA.APP_ID,
      grant_type: "refresh_token",
      refresh_token: refreshToken
    });
    const res = await fetch("https://oauth.zaloapp.com/v4/oa/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        secret_key: CONFIG.OA.APP_SECRET
      },
      body: params.toString()
    });
    const data = await res.json();
    if (data.access_token) {
      this.accessToken = data.access_token;
    }
    return data;
  }
}
// src/personal/index.ts
var import_node_fs = __toESM(require("node:fs"), 1);
async function initPersonalBot() {
  if (!import_node_fs.default.existsSync(CONFIG.PERSONAL.CRED_PATH)) {
    throw new Error(`Missing ${CONFIG.PERSONAL.CRED_PATH}. Run 'bun run login:personal' to scan QR code.`);
  }
  const { Zalo } = await import("zca-js");
  const creds = JSON.parse(import_node_fs.default.readFileSync(CONFIG.PERSONAL.CRED_PATH, "utf-8"));
  const zalo = new Zalo;
  const api = await zalo.login(creds);
  const bot = new ZaloPersonalBot(api);
  const ownId = await bot.getOwnId();
  console.log(`[Personal Bot] Logged in successfully. Bot UID: ${ownId}`);
  return { bot, api };
}
// src/oa/index.ts
function initOABot() {
  return new ZaloOABot;
}
