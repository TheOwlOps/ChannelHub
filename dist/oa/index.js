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

// src/oa/index.ts
function initOABot() {
  return new ZaloOABot;
}
export {
  ZaloOABot,
  initOABot
};
