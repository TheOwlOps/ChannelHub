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

// src/personal/index.ts
import fs from "node:fs";

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

// src/channels/zalo/types.ts
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

// src/personal/index.ts
async function initPersonalBot() {
  if (!fs.existsSync(CONFIG.PERSONAL.CRED_PATH)) {
    throw new Error(`Missing ${CONFIG.PERSONAL.CRED_PATH}. Run 'bun run login:personal' to scan QR code.`);
  }
  const { Zalo } = await import("zca-js");
  const creds = JSON.parse(fs.readFileSync(CONFIG.PERSONAL.CRED_PATH, "utf-8"));
  const zalo = new Zalo;
  const api = await zalo.login(creds);
  const bot = new ZaloPersonalBot(api);
  const ownId = await bot.getOwnId();
  console.log(`[Personal Bot] Logged in successfully. Bot UID: ${ownId}`);
  return { bot, api };
}
export {
  initPersonalBot
};
