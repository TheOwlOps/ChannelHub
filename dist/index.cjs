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

// node_modules/ws/lib/constants.js
var require_constants = __commonJS(function(exports2, module2) {
  var BINARY_TYPES = ["nodebuffer", "arraybuffer", "fragments"];
  var hasBlob = typeof Blob !== "undefined";
  if (hasBlob)
    BINARY_TYPES.push("blob");
  module2.exports = {
    BINARY_TYPES,
    CLOSE_TIMEOUT: 30000,
    EMPTY_BUFFER: Buffer.alloc(0),
    GUID: "258EAFA5-E914-47DA-95CA-C5AB0DC85B11",
    hasBlob,
    kForOnEventAttribute: Symbol("kIsForOnEventAttribute"),
    kListener: Symbol("kListener"),
    kStatusCode: Symbol("status-code"),
    kWebSocket: Symbol("websocket"),
    NOOP: () => {}
  };
});

// node_modules/ws/lib/buffer-util.js
var require_buffer_util = __commonJS(function(exports2, module2) {
  var { EMPTY_BUFFER } = require_constants();
  var FastBuffer = Buffer[Symbol.species];
  function concat(list, totalLength) {
    if (list.length === 0)
      return EMPTY_BUFFER;
    if (list.length === 1)
      return list[0];
    const target = Buffer.allocUnsafe(totalLength);
    let offset = 0;
    for (let i = 0;i < list.length; i++) {
      const buf = list[i];
      target.set(buf, offset);
      offset += buf.length;
    }
    if (offset < totalLength) {
      return new FastBuffer(target.buffer, target.byteOffset, offset);
    }
    return target;
  }
  function _mask(source, mask, output, offset, length) {
    for (let i = 0;i < length; i++) {
      output[offset + i] = source[i] ^ mask[i & 3];
    }
  }
  function _unmask(buffer, mask) {
    for (let i = 0;i < buffer.length; i++) {
      buffer[i] ^= mask[i & 3];
    }
  }
  function toArrayBuffer(buf) {
    if (buf.length === buf.buffer.byteLength) {
      return buf.buffer;
    }
    return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.length);
  }
  function toBuffer(data) {
    toBuffer.readOnly = true;
    if (Buffer.isBuffer(data))
      return data;
    let buf;
    if (data instanceof ArrayBuffer) {
      buf = new FastBuffer(data);
    } else if (ArrayBuffer.isView(data)) {
      buf = new FastBuffer(data.buffer, data.byteOffset, data.byteLength);
    } else {
      buf = Buffer.from(data);
      toBuffer.readOnly = false;
    }
    return buf;
  }
  module2.exports = {
    concat,
    mask: _mask,
    toArrayBuffer,
    toBuffer,
    unmask: _unmask
  };
  if (!process.env.WS_NO_BUFFER_UTIL) {
    try {
      const bufferUtil = (()=>{throw new Error("Cannot require module "+"bufferutil");})();
      module2.exports.mask = function(source, mask2, output, offset, length) {
        if (length < 48)
          _mask(source, mask2, output, offset, length);
        else
          bufferUtil.mask(source, mask2, output, offset, length);
      };
      module2.exports.unmask = function(buffer, mask) {
        if (buffer.length < 32)
          _unmask(buffer, mask);
        else
          bufferUtil.unmask(buffer, mask);
      };
    } catch (e) {}
  }
});

// node_modules/ws/lib/limiter.js
var require_limiter = __commonJS(function(exports2, module2) {
  var kDone = Symbol("kDone");
  var kRun = Symbol("kRun");

  class Limiter {
    constructor(concurrency) {
      this[kDone] = () => {
        this.pending--;
        this[kRun]();
      };
      this.concurrency = concurrency || Infinity;
      this.jobs = [];
      this.pending = 0;
    }
    add(job) {
      this.jobs.push(job);
      this[kRun]();
    }
    [kRun]() {
      if (this.pending === this.concurrency)
        return;
      if (this.jobs.length) {
        const job = this.jobs.shift();
        this.pending++;
        job(this[kDone]);
      }
    }
  }
  module2.exports = Limiter;
});

// node_modules/ws/lib/permessage-deflate.js
var require_permessage_deflate = __commonJS(function(exports2, module2) {
  var zlib = require("zlib");
  var bufferUtil = require_buffer_util();
  var Limiter = require_limiter();
  var { kStatusCode } = require_constants();
  var FastBuffer = Buffer[Symbol.species];
  var TRAILER = Buffer.from([0, 0, 255, 255]);
  var kPerMessageDeflate = Symbol("permessage-deflate");
  var kTotalLength = Symbol("total-length");
  var kCallback = Symbol("callback");
  var kBuffers = Symbol("buffers");
  var kError = Symbol("error");
  var zlibLimiter;

  class PerMessageDeflate {
    constructor(options) {
      this._options = options || {};
      this._threshold = this._options.threshold !== undefined ? this._options.threshold : 1024;
      this._maxPayload = this._options.maxPayload | 0;
      this._isServer = !!this._options.isServer;
      this._deflate = null;
      this._inflate = null;
      this.params = null;
      if (!zlibLimiter) {
        const concurrency = this._options.concurrencyLimit !== undefined ? this._options.concurrencyLimit : 10;
        zlibLimiter = new Limiter(concurrency);
      }
    }
    static get extensionName() {
      return "permessage-deflate";
    }
    offer() {
      const params = {};
      if (this._options.serverNoContextTakeover) {
        params.server_no_context_takeover = true;
      }
      if (this._options.clientNoContextTakeover) {
        params.client_no_context_takeover = true;
      }
      if (this._options.serverMaxWindowBits) {
        params.server_max_window_bits = this._options.serverMaxWindowBits;
      }
      if (this._options.clientMaxWindowBits) {
        params.client_max_window_bits = this._options.clientMaxWindowBits;
      } else if (this._options.clientMaxWindowBits == null) {
        params.client_max_window_bits = true;
      }
      return params;
    }
    accept(configurations) {
      configurations = this.normalizeParams(configurations);
      this.params = this._isServer ? this.acceptAsServer(configurations) : this.acceptAsClient(configurations);
      return this.params;
    }
    cleanup() {
      if (this._inflate) {
        this._inflate.close();
        this._inflate = null;
      }
      if (this._deflate) {
        const callback = this._deflate[kCallback];
        this._deflate.close();
        this._deflate = null;
        if (callback) {
          callback(new Error("The deflate stream was closed while data was being processed"));
        }
      }
    }
    acceptAsServer(offers) {
      const opts = this._options;
      const accepted = offers.find((params) => {
        if (opts.serverNoContextTakeover === false && params.server_no_context_takeover || params.server_max_window_bits && (opts.serverMaxWindowBits === false || typeof opts.serverMaxWindowBits === "number" && opts.serverMaxWindowBits > params.server_max_window_bits) || typeof opts.clientMaxWindowBits === "number" && (typeof params.client_max_window_bits === "number" ? opts.clientMaxWindowBits > params.client_max_window_bits : !params.client_max_window_bits)) {
          return false;
        }
        return true;
      });
      if (!accepted) {
        throw new Error("None of the extension offers can be accepted");
      }
      if (opts.serverNoContextTakeover) {
        accepted.server_no_context_takeover = true;
      }
      if (opts.clientNoContextTakeover) {
        accepted.client_no_context_takeover = true;
      }
      if (typeof opts.serverMaxWindowBits === "number") {
        accepted.server_max_window_bits = opts.serverMaxWindowBits;
      }
      if (typeof opts.clientMaxWindowBits === "number") {
        accepted.client_max_window_bits = opts.clientMaxWindowBits;
      } else if (accepted.client_max_window_bits === true || opts.clientMaxWindowBits === false) {
        delete accepted.client_max_window_bits;
      }
      return accepted;
    }
    acceptAsClient(response) {
      const params = response[0];
      if (this._options.clientNoContextTakeover === false && params.client_no_context_takeover) {
        throw new Error('Unexpected parameter "client_no_context_takeover"');
      }
      if (!params.client_max_window_bits) {
        if (typeof this._options.clientMaxWindowBits === "number") {
          params.client_max_window_bits = this._options.clientMaxWindowBits;
        }
      } else if (this._options.clientMaxWindowBits === false || typeof this._options.clientMaxWindowBits === "number" && params.client_max_window_bits > this._options.clientMaxWindowBits) {
        throw new Error('Unexpected or invalid parameter "client_max_window_bits"');
      }
      return params;
    }
    normalizeParams(configurations) {
      configurations.forEach((params) => {
        Object.keys(params).forEach((key) => {
          let value = params[key];
          if (value.length > 1) {
            throw new Error(`Parameter "${key}" must have only a single value`);
          }
          value = value[0];
          if (key === "client_max_window_bits") {
            if (value !== true) {
              const num = +value;
              if (!Number.isInteger(num) || num < 8 || num > 15) {
                throw new TypeError(`Invalid value for parameter "${key}": ${value}`);
              }
              value = num;
            } else if (!this._isServer) {
              throw new TypeError(`Invalid value for parameter "${key}": ${value}`);
            }
          } else if (key === "server_max_window_bits") {
            const num = +value;
            if (!Number.isInteger(num) || num < 8 || num > 15) {
              throw new TypeError(`Invalid value for parameter "${key}": ${value}`);
            }
            value = num;
          } else if (key === "client_no_context_takeover" || key === "server_no_context_takeover") {
            if (value !== true) {
              throw new TypeError(`Invalid value for parameter "${key}": ${value}`);
            }
          } else {
            throw new Error(`Unknown parameter "${key}"`);
          }
          params[key] = value;
        });
      });
      return configurations;
    }
    decompress(data, fin, callback) {
      zlibLimiter.add((done) => {
        this._decompress(data, fin, (err, result) => {
          done();
          callback(err, result);
        });
      });
    }
    compress(data, fin, callback) {
      zlibLimiter.add((done) => {
        this._compress(data, fin, (err, result) => {
          done();
          callback(err, result);
        });
      });
    }
    _decompress(data, fin, callback) {
      const endpoint = this._isServer ? "client" : "server";
      if (!this._inflate) {
        const key = `${endpoint}_max_window_bits`;
        const windowBits = typeof this.params[key] !== "number" ? zlib.Z_DEFAULT_WINDOWBITS : this.params[key];
        this._inflate = zlib.createInflateRaw({
          ...this._options.zlibInflateOptions,
          windowBits
        });
        this._inflate[kPerMessageDeflate] = this;
        this._inflate[kTotalLength] = 0;
        this._inflate[kBuffers] = [];
        this._inflate.on("error", inflateOnError);
        this._inflate.on("data", inflateOnData);
      }
      this._inflate[kCallback] = callback;
      this._inflate.write(data);
      if (fin)
        this._inflate.write(TRAILER);
      this._inflate.flush(() => {
        const err = this._inflate[kError];
        if (err) {
          this._inflate.close();
          this._inflate = null;
          callback(err);
          return;
        }
        const data = bufferUtil.concat(this._inflate[kBuffers], this._inflate[kTotalLength]);
        if (this._inflate._readableState.endEmitted) {
          this._inflate.close();
          this._inflate = null;
        } else {
          this._inflate[kTotalLength] = 0;
          this._inflate[kBuffers] = [];
          if (fin && this.params[`${endpoint}_no_context_takeover`]) {
            this._inflate.reset();
          }
        }
        callback(null, data);
      });
    }
    _compress(data, fin, callback) {
      const endpoint = this._isServer ? "server" : "client";
      if (!this._deflate) {
        const key = `${endpoint}_max_window_bits`;
        const windowBits = typeof this.params[key] !== "number" ? zlib.Z_DEFAULT_WINDOWBITS : this.params[key];
        this._deflate = zlib.createDeflateRaw({
          ...this._options.zlibDeflateOptions,
          windowBits
        });
        this._deflate[kTotalLength] = 0;
        this._deflate[kBuffers] = [];
        this._deflate.on("data", deflateOnData);
      }
      this._deflate[kCallback] = callback;
      this._deflate.write(data);
      this._deflate.flush(zlib.Z_SYNC_FLUSH, () => {
        if (!this._deflate) {
          return;
        }
        let data = bufferUtil.concat(this._deflate[kBuffers], this._deflate[kTotalLength]);
        if (fin) {
          data = new FastBuffer(data.buffer, data.byteOffset, data.length - 4);
        }
        this._deflate[kCallback] = null;
        this._deflate[kTotalLength] = 0;
        this._deflate[kBuffers] = [];
        if (fin && this.params[`${endpoint}_no_context_takeover`]) {
          this._deflate.reset();
        }
        callback(null, data);
      });
    }
  }
  module2.exports = PerMessageDeflate;
  function deflateOnData(chunk) {
    this[kBuffers].push(chunk);
    this[kTotalLength] += chunk.length;
  }
  function inflateOnData(chunk) {
    this[kTotalLength] += chunk.length;
    if (this[kPerMessageDeflate]._maxPayload < 1 || this[kTotalLength] <= this[kPerMessageDeflate]._maxPayload) {
      this[kBuffers].push(chunk);
      return;
    }
    this[kError] = new RangeError("Max payload size exceeded");
    this[kError].code = "WS_ERR_UNSUPPORTED_MESSAGE_LENGTH";
    this[kError][kStatusCode] = 1009;
    this.removeListener("data", inflateOnData);
    this.reset();
  }
  function inflateOnError(err) {
    this[kPerMessageDeflate]._inflate = null;
    if (this[kError]) {
      this[kCallback](this[kError]);
      return;
    }
    err[kStatusCode] = 1007;
    this[kCallback](err);
  }
});

// node_modules/ws/lib/validation.js
var require_validation = __commonJS(function(exports2, module2) {
  var { isUtf8 } = require("buffer");
  var { hasBlob } = require_constants();
  var tokenChars = [
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    1,
    0,
    1,
    1,
    1,
    1,
    1,
    0,
    0,
    1,
    1,
    0,
    1,
    1,
    0,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    0,
    0,
    0,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    0,
    1,
    0,
    1,
    0
  ];
  function isValidStatusCode(code) {
    return code >= 1000 && code <= 1014 && code !== 1004 && code !== 1005 && code !== 1006 || code >= 3000 && code <= 4999;
  }
  function _isValidUTF8(buf) {
    const len = buf.length;
    let i = 0;
    while (i < len) {
      if ((buf[i] & 128) === 0) {
        i++;
      } else if ((buf[i] & 224) === 192) {
        if (i + 1 === len || (buf[i + 1] & 192) !== 128 || (buf[i] & 254) === 192) {
          return false;
        }
        i += 2;
      } else if ((buf[i] & 240) === 224) {
        if (i + 2 >= len || (buf[i + 1] & 192) !== 128 || (buf[i + 2] & 192) !== 128 || buf[i] === 224 && (buf[i + 1] & 224) === 128 || buf[i] === 237 && (buf[i + 1] & 224) === 160) {
          return false;
        }
        i += 3;
      } else if ((buf[i] & 248) === 240) {
        if (i + 3 >= len || (buf[i + 1] & 192) !== 128 || (buf[i + 2] & 192) !== 128 || (buf[i + 3] & 192) !== 128 || buf[i] === 240 && (buf[i + 1] & 240) === 128 || buf[i] === 244 && buf[i + 1] > 143 || buf[i] > 244) {
          return false;
        }
        i += 4;
      } else {
        return false;
      }
    }
    return true;
  }
  function isBlob(value) {
    return hasBlob && typeof value === "object" && typeof value.arrayBuffer === "function" && typeof value.type === "string" && typeof value.stream === "function" && (value[Symbol.toStringTag] === "Blob" || value[Symbol.toStringTag] === "File");
  }
  module2.exports = {
    isBlob,
    isValidStatusCode,
    isValidUTF8: _isValidUTF8,
    tokenChars
  };
  if (isUtf8) {
    module2.exports.isValidUTF8 = function(buf) {
      return buf.length < 24 ? _isValidUTF8(buf) : isUtf8(buf);
    };
  } else if (!process.env.WS_NO_UTF_8_VALIDATE) {
    try {
      const isValidUTF8 = (()=>{throw new Error("Cannot require module "+"utf-8-validate");})();
      module2.exports.isValidUTF8 = function(buf) {
        return buf.length < 32 ? _isValidUTF8(buf) : isValidUTF8(buf);
      };
    } catch (e) {}
  }
});

// node_modules/ws/lib/receiver.js
var require_receiver = __commonJS(function(exports2, module2) {
  var { Writable } = require("stream");
  var PerMessageDeflate = require_permessage_deflate();
  var {
    BINARY_TYPES,
    EMPTY_BUFFER,
    kStatusCode,
    kWebSocket
  } = require_constants();
  var { concat, toArrayBuffer, unmask } = require_buffer_util();
  var { isValidStatusCode, isValidUTF8 } = require_validation();
  var FastBuffer = Buffer[Symbol.species];
  var GET_INFO = 0;
  var GET_PAYLOAD_LENGTH_16 = 1;
  var GET_PAYLOAD_LENGTH_64 = 2;
  var GET_MASK = 3;
  var GET_DATA = 4;
  var INFLATING = 5;
  var DEFER_EVENT = 6;

  class Receiver extends Writable {
    constructor(options = {}) {
      super();
      this._allowSynchronousEvents = options.allowSynchronousEvents !== undefined ? options.allowSynchronousEvents : true;
      this._binaryType = options.binaryType || BINARY_TYPES[0];
      this._extensions = options.extensions || {};
      this._isServer = !!options.isServer;
      this._maxBufferedChunks = options.maxBufferedChunks | 0;
      this._maxFragments = options.maxFragments | 0;
      this._maxPayload = options.maxPayload | 0;
      this._skipUTF8Validation = !!options.skipUTF8Validation;
      this[kWebSocket] = undefined;
      this._bufferedBytes = 0;
      this._buffers = [];
      this._compressed = false;
      this._payloadLength = 0;
      this._mask = undefined;
      this._fragmented = 0;
      this._masked = false;
      this._fin = false;
      this._opcode = 0;
      this._totalPayloadLength = 0;
      this._messageLength = 0;
      this._numFragments = 0;
      this._fragments = [];
      this._errored = false;
      this._loop = false;
      this._state = GET_INFO;
    }
    _write(chunk, encoding, cb) {
      if (this._opcode === 8 && this._state == GET_INFO)
        return cb();
      if (this._maxBufferedChunks > 0 && this._buffers.length >= this._maxBufferedChunks) {
        cb(this.createError(RangeError, "Too many buffered chunks", false, 1008, "WS_ERR_TOO_MANY_BUFFERED_PARTS"));
        return;
      }
      this._bufferedBytes += chunk.length;
      this._buffers.push(chunk);
      this.startLoop(cb);
    }
    consume(n) {
      this._bufferedBytes -= n;
      if (n === this._buffers[0].length)
        return this._buffers.shift();
      if (n < this._buffers[0].length) {
        const buf = this._buffers[0];
        this._buffers[0] = new FastBuffer(buf.buffer, buf.byteOffset + n, buf.length - n);
        return new FastBuffer(buf.buffer, buf.byteOffset, n);
      }
      const dst = Buffer.allocUnsafe(n);
      do {
        const buf = this._buffers[0];
        const offset = dst.length - n;
        if (n >= buf.length) {
          dst.set(this._buffers.shift(), offset);
        } else {
          dst.set(new Uint8Array(buf.buffer, buf.byteOffset, n), offset);
          this._buffers[0] = new FastBuffer(buf.buffer, buf.byteOffset + n, buf.length - n);
        }
        n -= buf.length;
      } while (n > 0);
      return dst;
    }
    startLoop(cb) {
      this._loop = true;
      do {
        switch (this._state) {
          case GET_INFO:
            this.getInfo(cb);
            break;
          case GET_PAYLOAD_LENGTH_16:
            this.getPayloadLength16(cb);
            break;
          case GET_PAYLOAD_LENGTH_64:
            this.getPayloadLength64(cb);
            break;
          case GET_MASK:
            this.getMask();
            break;
          case GET_DATA:
            this.getData(cb);
            break;
          case INFLATING:
          case DEFER_EVENT:
            this._loop = false;
            return;
        }
      } while (this._loop);
      if (!this._errored)
        cb();
    }
    getInfo(cb) {
      if (this._bufferedBytes < 2) {
        this._loop = false;
        return;
      }
      const buf = this.consume(2);
      if ((buf[0] & 48) !== 0) {
        const error = this.createError(RangeError, "RSV2 and RSV3 must be clear", true, 1002, "WS_ERR_UNEXPECTED_RSV_2_3");
        cb(error);
        return;
      }
      const compressed = (buf[0] & 64) === 64;
      if (compressed && !this._extensions[PerMessageDeflate.extensionName]) {
        const error = this.createError(RangeError, "RSV1 must be clear", true, 1002, "WS_ERR_UNEXPECTED_RSV_1");
        cb(error);
        return;
      }
      this._fin = (buf[0] & 128) === 128;
      this._opcode = buf[0] & 15;
      this._payloadLength = buf[1] & 127;
      if (this._opcode === 0) {
        if (compressed) {
          const error = this.createError(RangeError, "RSV1 must be clear", true, 1002, "WS_ERR_UNEXPECTED_RSV_1");
          cb(error);
          return;
        }
        if (!this._fragmented) {
          const error = this.createError(RangeError, "invalid opcode 0", true, 1002, "WS_ERR_INVALID_OPCODE");
          cb(error);
          return;
        }
        this._opcode = this._fragmented;
      } else if (this._opcode === 1 || this._opcode === 2) {
        if (this._fragmented) {
          const error = this.createError(RangeError, `invalid opcode ${this._opcode}`, true, 1002, "WS_ERR_INVALID_OPCODE");
          cb(error);
          return;
        }
        this._compressed = compressed;
      } else if (this._opcode > 7 && this._opcode < 11) {
        if (!this._fin) {
          const error = this.createError(RangeError, "FIN must be set", true, 1002, "WS_ERR_EXPECTED_FIN");
          cb(error);
          return;
        }
        if (compressed) {
          const error = this.createError(RangeError, "RSV1 must be clear", true, 1002, "WS_ERR_UNEXPECTED_RSV_1");
          cb(error);
          return;
        }
        if (this._payloadLength > 125 || this._opcode === 8 && this._payloadLength === 1) {
          const error = this.createError(RangeError, `invalid payload length ${this._payloadLength}`, true, 1002, "WS_ERR_INVALID_CONTROL_PAYLOAD_LENGTH");
          cb(error);
          return;
        }
      } else {
        const error = this.createError(RangeError, `invalid opcode ${this._opcode}`, true, 1002, "WS_ERR_INVALID_OPCODE");
        cb(error);
        return;
      }
      if (!this._fin && !this._fragmented)
        this._fragmented = this._opcode;
      this._masked = (buf[1] & 128) === 128;
      if (this._isServer) {
        if (!this._masked) {
          const error = this.createError(RangeError, "MASK must be set", true, 1002, "WS_ERR_EXPECTED_MASK");
          cb(error);
          return;
        }
      } else if (this._masked) {
        const error = this.createError(RangeError, "MASK must be clear", true, 1002, "WS_ERR_UNEXPECTED_MASK");
        cb(error);
        return;
      }
      if (this._payloadLength === 126)
        this._state = GET_PAYLOAD_LENGTH_16;
      else if (this._payloadLength === 127)
        this._state = GET_PAYLOAD_LENGTH_64;
      else
        this.haveLength(cb);
    }
    getPayloadLength16(cb) {
      if (this._bufferedBytes < 2) {
        this._loop = false;
        return;
      }
      this._payloadLength = this.consume(2).readUInt16BE(0);
      this.haveLength(cb);
    }
    getPayloadLength64(cb) {
      if (this._bufferedBytes < 8) {
        this._loop = false;
        return;
      }
      const buf = this.consume(8);
      const num = buf.readUInt32BE(0);
      if (num > Math.pow(2, 53 - 32) - 1) {
        const error = this.createError(RangeError, "Unsupported WebSocket frame: payload length > 2^53 - 1", false, 1009, "WS_ERR_UNSUPPORTED_DATA_PAYLOAD_LENGTH");
        cb(error);
        return;
      }
      this._payloadLength = num * Math.pow(2, 32) + buf.readUInt32BE(4);
      this.haveLength(cb);
    }
    haveLength(cb) {
      if (this._payloadLength && this._opcode < 8) {
        this._totalPayloadLength += this._payloadLength;
        if (this._totalPayloadLength > this._maxPayload && this._maxPayload > 0) {
          const error = this.createError(RangeError, "Max payload size exceeded", false, 1009, "WS_ERR_UNSUPPORTED_MESSAGE_LENGTH");
          cb(error);
          return;
        }
      }
      if (this._masked)
        this._state = GET_MASK;
      else
        this._state = GET_DATA;
    }
    getMask() {
      if (this._bufferedBytes < 4) {
        this._loop = false;
        return;
      }
      this._mask = this.consume(4);
      this._state = GET_DATA;
    }
    getData(cb) {
      let data = EMPTY_BUFFER;
      if (this._payloadLength) {
        if (this._bufferedBytes < this._payloadLength) {
          this._loop = false;
          return;
        }
        data = this.consume(this._payloadLength);
        if (this._masked && (this._mask[0] | this._mask[1] | this._mask[2] | this._mask[3]) !== 0) {
          unmask(data, this._mask);
        }
      }
      if (this._opcode > 7) {
        this.controlMessage(data, cb);
        return;
      }
      if (this._maxFragments > 0 && ++this._numFragments > this._maxFragments) {
        const error = this.createError(RangeError, "Too many message fragments", false, 1008, "WS_ERR_TOO_MANY_BUFFERED_PARTS");
        cb(error);
        return;
      }
      if (this._compressed) {
        this._state = INFLATING;
        this.decompress(data, cb);
        return;
      }
      if (data.length) {
        this._messageLength = this._totalPayloadLength;
        this._fragments.push(data);
      }
      this.dataMessage(cb);
    }
    decompress(data, cb) {
      const perMessageDeflate = this._extensions[PerMessageDeflate.extensionName];
      perMessageDeflate.decompress(data, this._fin, (err, buf) => {
        if (err)
          return cb(err);
        if (buf.length) {
          this._messageLength += buf.length;
          if (this._messageLength > this._maxPayload && this._maxPayload > 0) {
            const error = this.createError(RangeError, "Max payload size exceeded", false, 1009, "WS_ERR_UNSUPPORTED_MESSAGE_LENGTH");
            cb(error);
            return;
          }
          this._fragments.push(buf);
        }
        this.dataMessage(cb);
        if (this._state === GET_INFO)
          this.startLoop(cb);
      });
    }
    dataMessage(cb) {
      if (!this._fin) {
        this._state = GET_INFO;
        return;
      }
      const messageLength = this._messageLength;
      const fragments = this._fragments;
      this._totalPayloadLength = 0;
      this._messageLength = 0;
      this._fragmented = 0;
      this._numFragments = 0;
      this._fragments = [];
      if (this._opcode === 2) {
        let data;
        if (this._binaryType === "nodebuffer") {
          data = concat(fragments, messageLength);
        } else if (this._binaryType === "arraybuffer") {
          data = toArrayBuffer(concat(fragments, messageLength));
        } else if (this._binaryType === "blob") {
          data = new Blob(fragments);
        } else {
          data = fragments;
        }
        if (this._allowSynchronousEvents) {
          this.emit("message", data, true);
          this._state = GET_INFO;
        } else {
          this._state = DEFER_EVENT;
          setImmediate(() => {
            this.emit("message", data, true);
            this._state = GET_INFO;
            this.startLoop(cb);
          });
        }
      } else {
        const buf = concat(fragments, messageLength);
        if (!this._skipUTF8Validation && !isValidUTF8(buf)) {
          const error = this.createError(Error, "invalid UTF-8 sequence", true, 1007, "WS_ERR_INVALID_UTF8");
          cb(error);
          return;
        }
        if (this._state === INFLATING || this._allowSynchronousEvents) {
          this.emit("message", buf, false);
          this._state = GET_INFO;
        } else {
          this._state = DEFER_EVENT;
          setImmediate(() => {
            this.emit("message", buf, false);
            this._state = GET_INFO;
            this.startLoop(cb);
          });
        }
      }
    }
    controlMessage(data, cb) {
      if (this._opcode === 8) {
        if (data.length === 0) {
          this._loop = false;
          this.emit("conclude", 1005, EMPTY_BUFFER);
          this.end();
        } else {
          const code = data.readUInt16BE(0);
          if (!isValidStatusCode(code)) {
            const error = this.createError(RangeError, `invalid status code ${code}`, true, 1002, "WS_ERR_INVALID_CLOSE_CODE");
            cb(error);
            return;
          }
          const buf = new FastBuffer(data.buffer, data.byteOffset + 2, data.length - 2);
          if (!this._skipUTF8Validation && !isValidUTF8(buf)) {
            const error = this.createError(Error, "invalid UTF-8 sequence", true, 1007, "WS_ERR_INVALID_UTF8");
            cb(error);
            return;
          }
          this._loop = false;
          this.emit("conclude", code, buf);
          this.end();
        }
        this._state = GET_INFO;
        return;
      }
      if (this._allowSynchronousEvents) {
        this.emit(this._opcode === 9 ? "ping" : "pong", data);
        this._state = GET_INFO;
      } else {
        this._state = DEFER_EVENT;
        setImmediate(() => {
          this.emit(this._opcode === 9 ? "ping" : "pong", data);
          this._state = GET_INFO;
          this.startLoop(cb);
        });
      }
    }
    createError(ErrorCtor, message, prefix, statusCode, errorCode) {
      this._loop = false;
      this._errored = true;
      const err = new ErrorCtor(prefix ? `Invalid WebSocket frame: ${message}` : message);
      Error.captureStackTrace(err, this.createError);
      err.code = errorCode;
      err[kStatusCode] = statusCode;
      return err;
    }
  }
  module2.exports = Receiver;
});

// node_modules/ws/lib/sender.js
var require_sender = __commonJS(function(exports2, module2) {
  var { Duplex } = require("stream");
  var { randomFillSync } = require("crypto");
  var {
    types: { isUint8Array }
  } = require("util");
  var PerMessageDeflate = require_permessage_deflate();
  var { EMPTY_BUFFER, kWebSocket, NOOP } = require_constants();
  var { isBlob, isValidStatusCode } = require_validation();
  var { mask: applyMask, toBuffer } = require_buffer_util();
  var kByteLength = Symbol("kByteLength");
  var maskBuffer = Buffer.alloc(4);
  var RANDOM_POOL_SIZE = 8 * 1024;
  var randomPool;
  var randomPoolPointer = RANDOM_POOL_SIZE;
  var DEFAULT = 0;
  var DEFLATING = 1;
  var GET_BLOB_DATA = 2;

  class Sender {
    constructor(socket, extensions, generateMask) {
      this._extensions = extensions || {};
      if (generateMask) {
        this._generateMask = generateMask;
        this._maskBuffer = Buffer.alloc(4);
      }
      this._socket = socket;
      this._firstFragment = true;
      this._compress = false;
      this._bufferedBytes = 0;
      this._queue = [];
      this._state = DEFAULT;
      this.onerror = NOOP;
      this[kWebSocket] = undefined;
    }
    static frame(data, options) {
      let mask;
      let merge = false;
      let offset = 2;
      let skipMasking = false;
      if (options.mask) {
        mask = options.maskBuffer || maskBuffer;
        if (options.generateMask) {
          options.generateMask(mask);
        } else {
          if (randomPoolPointer === RANDOM_POOL_SIZE) {
            if (randomPool === undefined) {
              randomPool = Buffer.alloc(RANDOM_POOL_SIZE);
            }
            randomFillSync(randomPool, 0, RANDOM_POOL_SIZE);
            randomPoolPointer = 0;
          }
          mask[0] = randomPool[randomPoolPointer++];
          mask[1] = randomPool[randomPoolPointer++];
          mask[2] = randomPool[randomPoolPointer++];
          mask[3] = randomPool[randomPoolPointer++];
        }
        skipMasking = (mask[0] | mask[1] | mask[2] | mask[3]) === 0;
        offset = 6;
      }
      let dataLength;
      if (typeof data === "string") {
        if ((!options.mask || skipMasking) && options[kByteLength] !== undefined) {
          dataLength = options[kByteLength];
        } else {
          data = Buffer.from(data);
          dataLength = data.length;
        }
      } else {
        dataLength = data.length;
        merge = options.mask && options.readOnly && !skipMasking;
      }
      let payloadLength = dataLength;
      if (dataLength >= 65536) {
        offset += 8;
        payloadLength = 127;
      } else if (dataLength > 125) {
        offset += 2;
        payloadLength = 126;
      }
      const target = Buffer.allocUnsafe(merge ? dataLength + offset : offset);
      target[0] = options.fin ? options.opcode | 128 : options.opcode;
      if (options.rsv1)
        target[0] |= 64;
      target[1] = payloadLength;
      if (payloadLength === 126) {
        target.writeUInt16BE(dataLength, 2);
      } else if (payloadLength === 127) {
        target[2] = target[3] = 0;
        target.writeUIntBE(dataLength, 4, 6);
      }
      if (!options.mask)
        return [target, data];
      target[1] |= 128;
      target[offset - 4] = mask[0];
      target[offset - 3] = mask[1];
      target[offset - 2] = mask[2];
      target[offset - 1] = mask[3];
      if (skipMasking)
        return [target, data];
      if (merge) {
        applyMask(data, mask, target, offset, dataLength);
        return [target];
      }
      applyMask(data, mask, data, 0, dataLength);
      return [target, data];
    }
    close(code, data, mask, cb) {
      let buf;
      if (code === undefined) {
        buf = EMPTY_BUFFER;
      } else if (typeof code !== "number" || !isValidStatusCode(code)) {
        throw new TypeError("First argument must be a valid error code number");
      } else if (data === undefined || !data.length) {
        buf = Buffer.allocUnsafe(2);
        buf.writeUInt16BE(code, 0);
      } else {
        const length = Buffer.byteLength(data);
        if (length > 123) {
          throw new RangeError("The message must not be greater than 123 bytes");
        }
        buf = Buffer.allocUnsafe(2 + length);
        buf.writeUInt16BE(code, 0);
        if (typeof data === "string") {
          buf.write(data, 2);
        } else if (isUint8Array(data)) {
          buf.set(data, 2);
        } else {
          throw new TypeError("Second argument must be a string or a Uint8Array");
        }
      }
      const options = {
        [kByteLength]: buf.length,
        fin: true,
        generateMask: this._generateMask,
        mask,
        maskBuffer: this._maskBuffer,
        opcode: 8,
        readOnly: false,
        rsv1: false
      };
      if (this._state !== DEFAULT) {
        this.enqueue([this.dispatch, buf, false, options, cb]);
      } else {
        this.sendFrame(Sender.frame(buf, options), cb);
      }
    }
    ping(data, mask, cb) {
      let byteLength;
      let readOnly;
      if (typeof data === "string") {
        byteLength = Buffer.byteLength(data);
        readOnly = false;
      } else if (isBlob(data)) {
        byteLength = data.size;
        readOnly = false;
      } else {
        data = toBuffer(data);
        byteLength = data.length;
        readOnly = toBuffer.readOnly;
      }
      if (byteLength > 125) {
        throw new RangeError("The data size must not be greater than 125 bytes");
      }
      const options = {
        [kByteLength]: byteLength,
        fin: true,
        generateMask: this._generateMask,
        mask,
        maskBuffer: this._maskBuffer,
        opcode: 9,
        readOnly,
        rsv1: false
      };
      if (isBlob(data)) {
        if (this._state !== DEFAULT) {
          this.enqueue([this.getBlobData, data, false, options, cb]);
        } else {
          this.getBlobData(data, false, options, cb);
        }
      } else if (this._state !== DEFAULT) {
        this.enqueue([this.dispatch, data, false, options, cb]);
      } else {
        this.sendFrame(Sender.frame(data, options), cb);
      }
    }
    pong(data, mask, cb) {
      let byteLength;
      let readOnly;
      if (typeof data === "string") {
        byteLength = Buffer.byteLength(data);
        readOnly = false;
      } else if (isBlob(data)) {
        byteLength = data.size;
        readOnly = false;
      } else {
        data = toBuffer(data);
        byteLength = data.length;
        readOnly = toBuffer.readOnly;
      }
      if (byteLength > 125) {
        throw new RangeError("The data size must not be greater than 125 bytes");
      }
      const options = {
        [kByteLength]: byteLength,
        fin: true,
        generateMask: this._generateMask,
        mask,
        maskBuffer: this._maskBuffer,
        opcode: 10,
        readOnly,
        rsv1: false
      };
      if (isBlob(data)) {
        if (this._state !== DEFAULT) {
          this.enqueue([this.getBlobData, data, false, options, cb]);
        } else {
          this.getBlobData(data, false, options, cb);
        }
      } else if (this._state !== DEFAULT) {
        this.enqueue([this.dispatch, data, false, options, cb]);
      } else {
        this.sendFrame(Sender.frame(data, options), cb);
      }
    }
    send(data, options, cb) {
      const perMessageDeflate = this._extensions[PerMessageDeflate.extensionName];
      let opcode = options.binary ? 2 : 1;
      let rsv1 = options.compress;
      let byteLength;
      let readOnly;
      if (typeof data === "string") {
        byteLength = Buffer.byteLength(data);
        readOnly = false;
      } else if (isBlob(data)) {
        byteLength = data.size;
        readOnly = false;
      } else {
        data = toBuffer(data);
        byteLength = data.length;
        readOnly = toBuffer.readOnly;
      }
      if (this._firstFragment) {
        this._firstFragment = false;
        if (rsv1 && perMessageDeflate && perMessageDeflate.params[perMessageDeflate._isServer ? "server_no_context_takeover" : "client_no_context_takeover"]) {
          rsv1 = byteLength >= perMessageDeflate._threshold;
        }
        this._compress = rsv1;
      } else {
        rsv1 = false;
        opcode = 0;
      }
      if (options.fin)
        this._firstFragment = true;
      const opts = {
        [kByteLength]: byteLength,
        fin: options.fin,
        generateMask: this._generateMask,
        mask: options.mask,
        maskBuffer: this._maskBuffer,
        opcode,
        readOnly,
        rsv1
      };
      if (isBlob(data)) {
        if (this._state !== DEFAULT) {
          this.enqueue([this.getBlobData, data, this._compress, opts, cb]);
        } else {
          this.getBlobData(data, this._compress, opts, cb);
        }
      } else if (this._state !== DEFAULT) {
        this.enqueue([this.dispatch, data, this._compress, opts, cb]);
      } else {
        this.dispatch(data, this._compress, opts, cb);
      }
    }
    getBlobData(blob, compress, options, cb) {
      this._bufferedBytes += options[kByteLength];
      this._state = GET_BLOB_DATA;
      blob.arrayBuffer().then((arrayBuffer) => {
        if (this._socket.destroyed) {
          const err = new Error("The socket was closed while the blob was being read");
          process.nextTick(callCallbacks, this, err, cb);
          return;
        }
        this._bufferedBytes -= options[kByteLength];
        const data = toBuffer(arrayBuffer);
        if (!compress) {
          this._state = DEFAULT;
          this.sendFrame(Sender.frame(data, options), cb);
          this.dequeue();
        } else {
          this.dispatch(data, compress, options, cb);
        }
      }).catch((err) => {
        process.nextTick(onError, this, err, cb);
      });
    }
    dispatch(data, compress, options, cb) {
      if (!compress) {
        this.sendFrame(Sender.frame(data, options), cb);
        return;
      }
      const perMessageDeflate = this._extensions[PerMessageDeflate.extensionName];
      this._bufferedBytes += options[kByteLength];
      this._state = DEFLATING;
      perMessageDeflate.compress(data, options.fin, (_, buf) => {
        if (this._socket.destroyed) {
          const err = new Error("The socket was closed while data was being compressed");
          callCallbacks(this, err, cb);
          return;
        }
        this._bufferedBytes -= options[kByteLength];
        this._state = DEFAULT;
        options.readOnly = false;
        this.sendFrame(Sender.frame(buf, options), cb);
        this.dequeue();
      });
    }
    dequeue() {
      while (this._state === DEFAULT && this._queue.length) {
        const params = this._queue.shift();
        this._bufferedBytes -= params[3][kByteLength];
        Reflect.apply(params[0], this, params.slice(1));
      }
    }
    enqueue(params) {
      this._bufferedBytes += params[3][kByteLength];
      this._queue.push(params);
    }
    sendFrame(list, cb) {
      if (list.length === 2) {
        this._socket.cork();
        this._socket.write(list[0]);
        this._socket.write(list[1], cb);
        this._socket.uncork();
      } else {
        this._socket.write(list[0], cb);
      }
    }
  }
  module2.exports = Sender;
  function callCallbacks(sender, err, cb) {
    if (typeof cb === "function")
      cb(err);
    for (let i = 0;i < sender._queue.length; i++) {
      const params = sender._queue[i];
      const callback = params[params.length - 1];
      if (typeof callback === "function")
        callback(err);
    }
  }
  function onError(sender, err, cb) {
    callCallbacks(sender, err, cb);
    sender.onerror(err);
  }
});

// node_modules/ws/lib/event-target.js
var require_event_target = __commonJS(function(exports2, module2) {
  var { kForOnEventAttribute, kListener } = require_constants();
  var kCode = Symbol("kCode");
  var kData = Symbol("kData");
  var kError = Symbol("kError");
  var kMessage = Symbol("kMessage");
  var kReason = Symbol("kReason");
  var kTarget = Symbol("kTarget");
  var kType = Symbol("kType");
  var kWasClean = Symbol("kWasClean");

  class Event {
    constructor(type) {
      this[kTarget] = null;
      this[kType] = type;
    }
    get target() {
      return this[kTarget];
    }
    get type() {
      return this[kType];
    }
  }
  Object.defineProperty(Event.prototype, "target", { enumerable: true });
  Object.defineProperty(Event.prototype, "type", { enumerable: true });

  class CloseEvent extends Event {
    constructor(type, options = {}) {
      super(type);
      this[kCode] = options.code === undefined ? 0 : options.code;
      this[kReason] = options.reason === undefined ? "" : options.reason;
      this[kWasClean] = options.wasClean === undefined ? false : options.wasClean;
    }
    get code() {
      return this[kCode];
    }
    get reason() {
      return this[kReason];
    }
    get wasClean() {
      return this[kWasClean];
    }
  }
  Object.defineProperty(CloseEvent.prototype, "code", { enumerable: true });
  Object.defineProperty(CloseEvent.prototype, "reason", { enumerable: true });
  Object.defineProperty(CloseEvent.prototype, "wasClean", { enumerable: true });

  class ErrorEvent extends Event {
    constructor(type, options = {}) {
      super(type);
      this[kError] = options.error === undefined ? null : options.error;
      this[kMessage] = options.message === undefined ? "" : options.message;
    }
    get error() {
      return this[kError];
    }
    get message() {
      return this[kMessage];
    }
  }
  Object.defineProperty(ErrorEvent.prototype, "error", { enumerable: true });
  Object.defineProperty(ErrorEvent.prototype, "message", { enumerable: true });

  class MessageEvent extends Event {
    constructor(type, options = {}) {
      super(type);
      this[kData] = options.data === undefined ? null : options.data;
    }
    get data() {
      return this[kData];
    }
  }
  Object.defineProperty(MessageEvent.prototype, "data", { enumerable: true });
  var EventTarget = {
    addEventListener(type, handler, options = {}) {
      for (const listener of this.listeners(type)) {
        if (!options[kForOnEventAttribute] && listener[kListener] === handler && !listener[kForOnEventAttribute]) {
          return;
        }
      }
      let wrapper;
      if (type === "message") {
        wrapper = function onMessage(data, isBinary) {
          const event = new MessageEvent("message", {
            data: isBinary ? data : data.toString()
          });
          event[kTarget] = this;
          callListener(handler, this, event);
        };
      } else if (type === "close") {
        wrapper = function onClose(code, message) {
          const event = new CloseEvent("close", {
            code,
            reason: message.toString(),
            wasClean: this._closeFrameReceived && this._closeFrameSent
          });
          event[kTarget] = this;
          callListener(handler, this, event);
        };
      } else if (type === "error") {
        wrapper = function onError(error) {
          const event = new ErrorEvent("error", {
            error,
            message: error.message
          });
          event[kTarget] = this;
          callListener(handler, this, event);
        };
      } else if (type === "open") {
        wrapper = function onOpen() {
          const event = new Event("open");
          event[kTarget] = this;
          callListener(handler, this, event);
        };
      } else {
        return;
      }
      wrapper[kForOnEventAttribute] = !!options[kForOnEventAttribute];
      wrapper[kListener] = handler;
      if (options.once) {
        this.once(type, wrapper);
      } else {
        this.on(type, wrapper);
      }
    },
    removeEventListener(type, handler) {
      for (const listener of this.listeners(type)) {
        if (listener[kListener] === handler && !listener[kForOnEventAttribute]) {
          this.removeListener(type, listener);
          break;
        }
      }
    }
  };
  module2.exports = {
    CloseEvent,
    ErrorEvent,
    Event,
    EventTarget,
    MessageEvent
  };
  function callListener(listener, thisArg, event) {
    if (typeof listener === "object" && listener.handleEvent) {
      listener.handleEvent.call(listener, event);
    } else {
      listener.call(thisArg, event);
    }
  }
});

// node_modules/ws/lib/extension.js
var require_extension = __commonJS(function(exports2, module2) {
  var { tokenChars } = require_validation();
  function push(dest, name, elem) {
    if (dest[name] === undefined)
      dest[name] = [elem];
    else
      dest[name].push(elem);
  }
  function parse(header) {
    const offers = Object.create(null);
    let params = Object.create(null);
    let mustUnescape = false;
    let isEscaping = false;
    let inQuotes = false;
    let extensionName;
    let paramName;
    let start = -1;
    let code = -1;
    let end = -1;
    let i = 0;
    for (;i < header.length; i++) {
      code = header.charCodeAt(i);
      if (extensionName === undefined) {
        if (end === -1 && tokenChars[code] === 1) {
          if (start === -1)
            start = i;
        } else if (i !== 0 && (code === 32 || code === 9)) {
          if (end === -1 && start !== -1)
            end = i;
        } else if (code === 59 || code === 44) {
          if (start === -1) {
            throw new SyntaxError(`Unexpected character at index ${i}`);
          }
          if (end === -1)
            end = i;
          const name = header.slice(start, end);
          if (code === 44) {
            push(offers, name, params);
            params = Object.create(null);
          } else {
            extensionName = name;
          }
          start = end = -1;
        } else {
          throw new SyntaxError(`Unexpected character at index ${i}`);
        }
      } else if (paramName === undefined) {
        if (end === -1 && tokenChars[code] === 1) {
          if (start === -1)
            start = i;
        } else if (code === 32 || code === 9) {
          if (end === -1 && start !== -1)
            end = i;
        } else if (code === 59 || code === 44) {
          if (start === -1) {
            throw new SyntaxError(`Unexpected character at index ${i}`);
          }
          if (end === -1)
            end = i;
          push(params, header.slice(start, end), true);
          if (code === 44) {
            push(offers, extensionName, params);
            params = Object.create(null);
            extensionName = undefined;
          }
          start = end = -1;
        } else if (code === 61 && start !== -1 && end === -1) {
          paramName = header.slice(start, i);
          start = end = -1;
        } else {
          throw new SyntaxError(`Unexpected character at index ${i}`);
        }
      } else {
        if (isEscaping) {
          if (tokenChars[code] !== 1) {
            throw new SyntaxError(`Unexpected character at index ${i}`);
          }
          if (start === -1)
            start = i;
          else if (!mustUnescape)
            mustUnescape = true;
          isEscaping = false;
        } else if (inQuotes) {
          if (tokenChars[code] === 1) {
            if (start === -1)
              start = i;
          } else if (code === 34 && start !== -1) {
            inQuotes = false;
            end = i;
          } else if (code === 92) {
            isEscaping = true;
          } else {
            throw new SyntaxError(`Unexpected character at index ${i}`);
          }
        } else if (code === 34 && header.charCodeAt(i - 1) === 61) {
          inQuotes = true;
        } else if (end === -1 && tokenChars[code] === 1) {
          if (start === -1)
            start = i;
        } else if (start !== -1 && (code === 32 || code === 9)) {
          if (end === -1)
            end = i;
        } else if (code === 59 || code === 44) {
          if (start === -1) {
            throw new SyntaxError(`Unexpected character at index ${i}`);
          }
          if (end === -1)
            end = i;
          let value = header.slice(start, end);
          if (mustUnescape) {
            value = value.replace(/\\/g, "");
            mustUnescape = false;
          }
          push(params, paramName, value);
          if (code === 44) {
            push(offers, extensionName, params);
            params = Object.create(null);
            extensionName = undefined;
          }
          paramName = undefined;
          start = end = -1;
        } else {
          throw new SyntaxError(`Unexpected character at index ${i}`);
        }
      }
    }
    if (start === -1 || inQuotes || code === 32 || code === 9) {
      throw new SyntaxError("Unexpected end of input");
    }
    if (end === -1)
      end = i;
    const token = header.slice(start, end);
    if (extensionName === undefined) {
      push(offers, token, params);
    } else {
      if (paramName === undefined) {
        push(params, token, true);
      } else if (mustUnescape) {
        push(params, paramName, token.replace(/\\/g, ""));
      } else {
        push(params, paramName, token);
      }
      push(offers, extensionName, params);
    }
    return offers;
  }
  function format(extensions) {
    return Object.keys(extensions).map((extension) => {
      let configurations = extensions[extension];
      if (!Array.isArray(configurations))
        configurations = [configurations];
      return configurations.map((params) => {
        return [extension].concat(Object.keys(params).map((k) => {
          let values = params[k];
          if (!Array.isArray(values))
            values = [values];
          return values.map((v) => v === true ? k : `${k}=${v}`).join("; ");
        })).join("; ");
      }).join(", ");
    }).join(", ");
  }
  module2.exports = { format, parse };
});

// node_modules/ws/lib/websocket.js
var require_websocket = __commonJS(function(exports2, module2) {
  var EventEmitter = require("events");
  var https = require("https");
  var http = require("http");
  var net = require("net");
  var tls = require("tls");
  var { randomBytes, createHash } = require("crypto");
  var { Duplex, Readable } = require("stream");
  var { URL: URL2 } = require("url");
  var PerMessageDeflate = require_permessage_deflate();
  var Receiver = require_receiver();
  var Sender = require_sender();
  var { isBlob } = require_validation();
  var {
    BINARY_TYPES,
    CLOSE_TIMEOUT,
    EMPTY_BUFFER,
    GUID,
    kForOnEventAttribute,
    kListener,
    kStatusCode,
    kWebSocket,
    NOOP
  } = require_constants();
  var {
    EventTarget: { addEventListener, removeEventListener }
  } = require_event_target();
  var { format, parse } = require_extension();
  var { toBuffer } = require_buffer_util();
  var kAborted = Symbol("kAborted");
  var protocolVersions = [8, 13];
  var readyStates = ["CONNECTING", "OPEN", "CLOSING", "CLOSED"];
  var subprotocolRegex = /^[!#$%&'*+\-.0-9A-Z^_`|a-z~]+$/;

  class WebSocket extends EventEmitter {
    constructor(address, protocols, options) {
      super();
      this._binaryType = BINARY_TYPES[0];
      this._closeCode = 1006;
      this._closeFrameReceived = false;
      this._closeFrameSent = false;
      this._closeMessage = EMPTY_BUFFER;
      this._closeTimer = null;
      this._errorEmitted = false;
      this._extensions = {};
      this._paused = false;
      this._protocol = "";
      this._readyState = WebSocket.CONNECTING;
      this._receiver = null;
      this._sender = null;
      this._socket = null;
      if (address !== null) {
        this._bufferedAmount = 0;
        this._isServer = false;
        this._redirects = 0;
        if (protocols === undefined) {
          protocols = [];
        } else if (!Array.isArray(protocols)) {
          if (typeof protocols === "object" && protocols !== null) {
            options = protocols;
            protocols = [];
          } else {
            protocols = [protocols];
          }
        }
        initAsClient(this, address, protocols, options);
      } else {
        this._autoPong = options.autoPong;
        this._closeTimeout = options.closeTimeout;
        this._isServer = true;
      }
    }
    get binaryType() {
      return this._binaryType;
    }
    set binaryType(type) {
      if (!BINARY_TYPES.includes(type))
        return;
      this._binaryType = type;
      if (this._receiver)
        this._receiver._binaryType = type;
    }
    get bufferedAmount() {
      if (!this._socket)
        return this._bufferedAmount;
      return this._socket._writableState.length + this._sender._bufferedBytes;
    }
    get extensions() {
      return Object.keys(this._extensions).join();
    }
    get isPaused() {
      return this._paused;
    }
    get onclose() {
      return null;
    }
    get onerror() {
      return null;
    }
    get onopen() {
      return null;
    }
    get onmessage() {
      return null;
    }
    get protocol() {
      return this._protocol;
    }
    get readyState() {
      return this._readyState;
    }
    get url() {
      return this._url;
    }
    setSocket(socket, head, options) {
      const receiver = new Receiver({
        allowSynchronousEvents: options.allowSynchronousEvents,
        binaryType: this.binaryType,
        extensions: this._extensions,
        isServer: this._isServer,
        maxBufferedChunks: options.maxBufferedChunks,
        maxFragments: options.maxFragments,
        maxPayload: options.maxPayload,
        skipUTF8Validation: options.skipUTF8Validation
      });
      const sender = new Sender(socket, this._extensions, options.generateMask);
      this._receiver = receiver;
      this._sender = sender;
      this._socket = socket;
      receiver[kWebSocket] = this;
      sender[kWebSocket] = this;
      socket[kWebSocket] = this;
      receiver.on("conclude", receiverOnConclude);
      receiver.on("drain", receiverOnDrain);
      receiver.on("error", receiverOnError);
      receiver.on("message", receiverOnMessage);
      receiver.on("ping", receiverOnPing);
      receiver.on("pong", receiverOnPong);
      sender.onerror = senderOnError;
      if (socket.setTimeout)
        socket.setTimeout(0);
      if (socket.setNoDelay)
        socket.setNoDelay();
      if (head.length > 0)
        socket.unshift(head);
      socket.on("close", socketOnClose);
      socket.on("data", socketOnData);
      socket.on("end", socketOnEnd);
      socket.on("error", socketOnError);
      this._readyState = WebSocket.OPEN;
      this.emit("open");
    }
    emitClose() {
      if (!this._socket) {
        this._readyState = WebSocket.CLOSED;
        this.emit("close", this._closeCode, this._closeMessage);
        return;
      }
      if (this._extensions[PerMessageDeflate.extensionName]) {
        this._extensions[PerMessageDeflate.extensionName].cleanup();
      }
      this._receiver.removeAllListeners();
      this._readyState = WebSocket.CLOSED;
      this.emit("close", this._closeCode, this._closeMessage);
    }
    close(code, data) {
      if (this.readyState === WebSocket.CLOSED)
        return;
      if (this.readyState === WebSocket.CONNECTING) {
        const msg = "WebSocket was closed before the connection was established";
        abortHandshake(this, this._req, msg);
        return;
      }
      if (this.readyState === WebSocket.CLOSING) {
        if (this._closeFrameSent && (this._closeFrameReceived || this._receiver._writableState.errorEmitted)) {
          this._socket.end();
        }
        return;
      }
      this._readyState = WebSocket.CLOSING;
      this._sender.close(code, data, !this._isServer, (err) => {
        if (err)
          return;
        this._closeFrameSent = true;
        if (this._closeFrameReceived || this._receiver._writableState.errorEmitted) {
          this._socket.end();
        }
      });
      setCloseTimer(this);
    }
    pause() {
      if (this.readyState === WebSocket.CONNECTING || this.readyState === WebSocket.CLOSED) {
        return;
      }
      this._paused = true;
      this._socket.pause();
    }
    ping(data, mask, cb) {
      if (this.readyState === WebSocket.CONNECTING) {
        throw new Error("WebSocket is not open: readyState 0 (CONNECTING)");
      }
      if (typeof data === "function") {
        cb = data;
        data = mask = undefined;
      } else if (typeof mask === "function") {
        cb = mask;
        mask = undefined;
      }
      if (typeof data === "number")
        data = data.toString();
      if (this.readyState !== WebSocket.OPEN) {
        sendAfterClose(this, data, cb);
        return;
      }
      if (mask === undefined)
        mask = !this._isServer;
      this._sender.ping(data || EMPTY_BUFFER, mask, cb);
    }
    pong(data, mask, cb) {
      if (this.readyState === WebSocket.CONNECTING) {
        throw new Error("WebSocket is not open: readyState 0 (CONNECTING)");
      }
      if (typeof data === "function") {
        cb = data;
        data = mask = undefined;
      } else if (typeof mask === "function") {
        cb = mask;
        mask = undefined;
      }
      if (typeof data === "number")
        data = data.toString();
      if (this.readyState !== WebSocket.OPEN) {
        sendAfterClose(this, data, cb);
        return;
      }
      if (mask === undefined)
        mask = !this._isServer;
      this._sender.pong(data || EMPTY_BUFFER, mask, cb);
    }
    resume() {
      if (this.readyState === WebSocket.CONNECTING || this.readyState === WebSocket.CLOSED) {
        return;
      }
      this._paused = false;
      if (!this._receiver._writableState.needDrain)
        this._socket.resume();
    }
    send(data, options, cb) {
      if (this.readyState === WebSocket.CONNECTING) {
        throw new Error("WebSocket is not open: readyState 0 (CONNECTING)");
      }
      if (typeof options === "function") {
        cb = options;
        options = {};
      }
      if (typeof data === "number")
        data = data.toString();
      if (this.readyState !== WebSocket.OPEN) {
        sendAfterClose(this, data, cb);
        return;
      }
      const opts = {
        binary: typeof data !== "string",
        mask: !this._isServer,
        compress: true,
        fin: true,
        ...options
      };
      if (!this._extensions[PerMessageDeflate.extensionName]) {
        opts.compress = false;
      }
      this._sender.send(data || EMPTY_BUFFER, opts, cb);
    }
    terminate() {
      if (this.readyState === WebSocket.CLOSED)
        return;
      if (this.readyState === WebSocket.CONNECTING) {
        const msg = "WebSocket was closed before the connection was established";
        abortHandshake(this, this._req, msg);
        return;
      }
      if (this._socket) {
        this._readyState = WebSocket.CLOSING;
        this._socket.destroy();
      }
    }
  }
  Object.defineProperty(WebSocket, "CONNECTING", {
    enumerable: true,
    value: readyStates.indexOf("CONNECTING")
  });
  Object.defineProperty(WebSocket.prototype, "CONNECTING", {
    enumerable: true,
    value: readyStates.indexOf("CONNECTING")
  });
  Object.defineProperty(WebSocket, "OPEN", {
    enumerable: true,
    value: readyStates.indexOf("OPEN")
  });
  Object.defineProperty(WebSocket.prototype, "OPEN", {
    enumerable: true,
    value: readyStates.indexOf("OPEN")
  });
  Object.defineProperty(WebSocket, "CLOSING", {
    enumerable: true,
    value: readyStates.indexOf("CLOSING")
  });
  Object.defineProperty(WebSocket.prototype, "CLOSING", {
    enumerable: true,
    value: readyStates.indexOf("CLOSING")
  });
  Object.defineProperty(WebSocket, "CLOSED", {
    enumerable: true,
    value: readyStates.indexOf("CLOSED")
  });
  Object.defineProperty(WebSocket.prototype, "CLOSED", {
    enumerable: true,
    value: readyStates.indexOf("CLOSED")
  });
  [
    "binaryType",
    "bufferedAmount",
    "extensions",
    "isPaused",
    "protocol",
    "readyState",
    "url"
  ].forEach((property) => {
    Object.defineProperty(WebSocket.prototype, property, { enumerable: true });
  });
  ["open", "error", "close", "message"].forEach((method) => {
    Object.defineProperty(WebSocket.prototype, `on${method}`, {
      enumerable: true,
      get() {
        for (const listener of this.listeners(method)) {
          if (listener[kForOnEventAttribute])
            return listener[kListener];
        }
        return null;
      },
      set(handler) {
        for (const listener of this.listeners(method)) {
          if (listener[kForOnEventAttribute]) {
            this.removeListener(method, listener);
            break;
          }
        }
        if (typeof handler !== "function")
          return;
        this.addEventListener(method, handler, {
          [kForOnEventAttribute]: true
        });
      }
    });
  });
  WebSocket.prototype.addEventListener = addEventListener;
  WebSocket.prototype.removeEventListener = removeEventListener;
  module2.exports = WebSocket;
  function initAsClient(websocket, address, protocols, options) {
    const opts = {
      allowSynchronousEvents: true,
      autoPong: true,
      closeTimeout: CLOSE_TIMEOUT,
      protocolVersion: protocolVersions[1],
      maxBufferedChunks: 256 * 1024,
      maxFragments: 16 * 1024,
      maxPayload: 100 * 1024 * 1024,
      skipUTF8Validation: false,
      perMessageDeflate: true,
      followRedirects: false,
      maxRedirects: 10,
      ...options,
      socketPath: undefined,
      hostname: undefined,
      protocol: undefined,
      timeout: undefined,
      method: "GET",
      host: undefined,
      path: undefined,
      port: undefined
    };
    websocket._autoPong = opts.autoPong;
    websocket._closeTimeout = opts.closeTimeout;
    if (!protocolVersions.includes(opts.protocolVersion)) {
      throw new RangeError(`Unsupported protocol version: ${opts.protocolVersion} ` + `(supported versions: ${protocolVersions.join(", ")})`);
    }
    let parsedUrl;
    if (address instanceof URL2) {
      parsedUrl = address;
    } else {
      try {
        parsedUrl = new URL2(address);
      } catch {
        throw new SyntaxError(`Invalid URL: ${address}`);
      }
    }
    if (parsedUrl.protocol === "http:") {
      parsedUrl.protocol = "ws:";
    } else if (parsedUrl.protocol === "https:") {
      parsedUrl.protocol = "wss:";
    }
    websocket._url = parsedUrl.href;
    const isSecure = parsedUrl.protocol === "wss:";
    const isIpcUrl = parsedUrl.protocol === "ws+unix:";
    let invalidUrlMessage;
    if (parsedUrl.protocol !== "ws:" && !isSecure && !isIpcUrl) {
      invalidUrlMessage = `The URL's protocol must be one of "ws:", "wss:", ` + '"http:", "https:", or "ws+unix:"';
    } else if (isIpcUrl && !parsedUrl.pathname) {
      invalidUrlMessage = "The URL's pathname is empty";
    } else if (parsedUrl.hash) {
      invalidUrlMessage = "The URL contains a fragment identifier";
    }
    if (invalidUrlMessage) {
      const err = new SyntaxError(invalidUrlMessage);
      if (websocket._redirects === 0) {
        throw err;
      } else {
        emitErrorAndClose(websocket, err);
        return;
      }
    }
    const defaultPort = isSecure ? 443 : 80;
    const key = randomBytes(16).toString("base64");
    const request3 = isSecure ? https.request : http.request;
    const protocolSet = new Set;
    let perMessageDeflate;
    opts.createConnection = opts.createConnection || (isSecure ? tlsConnect : netConnect);
    opts.defaultPort = opts.defaultPort || defaultPort;
    opts.port = parsedUrl.port || defaultPort;
    opts.host = parsedUrl.hostname.startsWith("[") ? parsedUrl.hostname.slice(1, -1) : parsedUrl.hostname;
    opts.headers = {
      ...opts.headers,
      "Sec-WebSocket-Version": opts.protocolVersion,
      "Sec-WebSocket-Key": key,
      Connection: "Upgrade",
      Upgrade: "websocket"
    };
    opts.path = parsedUrl.pathname + parsedUrl.search;
    opts.timeout = opts.handshakeTimeout;
    if (opts.perMessageDeflate) {
      perMessageDeflate = new PerMessageDeflate({
        ...opts.perMessageDeflate,
        isServer: false,
        maxPayload: opts.maxPayload
      });
      opts.headers["Sec-WebSocket-Extensions"] = format({
        [PerMessageDeflate.extensionName]: perMessageDeflate.offer()
      });
    }
    if (protocols.length) {
      for (const protocol of protocols) {
        if (typeof protocol !== "string" || !subprotocolRegex.test(protocol) || protocolSet.has(protocol)) {
          throw new SyntaxError("An invalid or duplicated subprotocol was specified");
        }
        protocolSet.add(protocol);
      }
      opts.headers["Sec-WebSocket-Protocol"] = protocols.join(",");
    }
    if (opts.origin) {
      if (opts.protocolVersion < 13) {
        opts.headers["Sec-WebSocket-Origin"] = opts.origin;
      } else {
        opts.headers.Origin = opts.origin;
      }
    }
    if (parsedUrl.username || parsedUrl.password) {
      opts.auth = `${parsedUrl.username}:${parsedUrl.password}`;
    }
    if (isIpcUrl) {
      const parts = opts.path.split(":");
      opts.socketPath = parts[0];
      opts.path = parts[1];
    }
    let req;
    if (opts.followRedirects) {
      if (websocket._redirects === 0) {
        websocket._originalIpc = isIpcUrl;
        websocket._originalSecure = isSecure;
        websocket._originalHostOrSocketPath = isIpcUrl ? opts.socketPath : parsedUrl.host;
        const headers = options && options.headers;
        options = { ...options, headers: {} };
        if (headers) {
          for (const [key, value] of Object.entries(headers)) {
            options.headers[key.toLowerCase()] = value;
          }
        }
      } else if (websocket.listenerCount("redirect") === 0) {
        const isSameHost = isIpcUrl ? websocket._originalIpc ? opts.socketPath === websocket._originalHostOrSocketPath : false : websocket._originalIpc ? false : parsedUrl.host === websocket._originalHostOrSocketPath;
        if (!isSameHost || websocket._originalSecure && !isSecure) {
          delete opts.headers.authorization;
          delete opts.headers.cookie;
          if (!isSameHost)
            delete opts.headers.host;
          opts.auth = undefined;
        }
      }
      if (opts.auth && !options.headers.authorization) {
        options.headers.authorization = "Basic " + Buffer.from(opts.auth).toString("base64");
      }
      req = websocket._req = request3(opts);
      if (websocket._redirects) {
        websocket.emit("redirect", websocket.url, req);
      }
    } else {
      req = websocket._req = request3(opts);
    }
    if (opts.timeout) {
      req.on("timeout", () => {
        abortHandshake(websocket, req, "Opening handshake has timed out");
      });
    }
    req.on("error", (err) => {
      if (req === null || req[kAborted])
        return;
      req = websocket._req = null;
      emitErrorAndClose(websocket, err);
    });
    req.on("response", (res) => {
      const location = res.headers.location;
      const statusCode = res.statusCode;
      if (location && opts.followRedirects && statusCode >= 300 && statusCode < 400) {
        if (++websocket._redirects > opts.maxRedirects) {
          abortHandshake(websocket, req, "Maximum redirects exceeded");
          return;
        }
        req.abort();
        let addr;
        try {
          addr = new URL2(location, address);
        } catch (e) {
          const err = new SyntaxError(`Invalid URL: ${location}`);
          emitErrorAndClose(websocket, err);
          return;
        }
        initAsClient(websocket, addr, protocols, options);
      } else if (!websocket.emit("unexpected-response", req, res)) {
        abortHandshake(websocket, req, `Unexpected server response: ${res.statusCode}`);
      }
    });
    req.on("upgrade", (res, socket, head) => {
      websocket.emit("upgrade", res);
      if (websocket.readyState !== WebSocket.CONNECTING)
        return;
      req = websocket._req = null;
      const upgrade = res.headers.upgrade;
      if (upgrade === undefined || upgrade.toLowerCase() !== "websocket") {
        abortHandshake(websocket, socket, "Invalid Upgrade header");
        return;
      }
      const digest = createHash("sha1").update(key + GUID).digest("base64");
      if (res.headers["sec-websocket-accept"] !== digest) {
        abortHandshake(websocket, socket, "Invalid Sec-WebSocket-Accept header");
        return;
      }
      const serverProt = res.headers["sec-websocket-protocol"];
      let protError;
      if (serverProt !== undefined) {
        if (!protocolSet.size) {
          protError = "Server sent a subprotocol but none was requested";
        } else if (!protocolSet.has(serverProt)) {
          protError = "Server sent an invalid subprotocol";
        }
      } else if (protocolSet.size) {
        protError = "Server sent no subprotocol";
      }
      if (protError) {
        abortHandshake(websocket, socket, protError);
        return;
      }
      if (serverProt)
        websocket._protocol = serverProt;
      const secWebSocketExtensions = res.headers["sec-websocket-extensions"];
      if (secWebSocketExtensions !== undefined) {
        if (!perMessageDeflate) {
          const message = "Server sent a Sec-WebSocket-Extensions header but no extension " + "was requested";
          abortHandshake(websocket, socket, message);
          return;
        }
        let extensions;
        try {
          extensions = parse(secWebSocketExtensions);
        } catch (err) {
          const message = "Invalid Sec-WebSocket-Extensions header";
          abortHandshake(websocket, socket, message);
          return;
        }
        const extensionNames = Object.keys(extensions);
        if (extensionNames.length !== 1 || extensionNames[0] !== PerMessageDeflate.extensionName) {
          const message = "Server indicated an extension that was not requested";
          abortHandshake(websocket, socket, message);
          return;
        }
        try {
          perMessageDeflate.accept(extensions[PerMessageDeflate.extensionName]);
        } catch (err) {
          const message = "Invalid Sec-WebSocket-Extensions header";
          abortHandshake(websocket, socket, message);
          return;
        }
        websocket._extensions[PerMessageDeflate.extensionName] = perMessageDeflate;
      }
      websocket.setSocket(socket, head, {
        allowSynchronousEvents: opts.allowSynchronousEvents,
        generateMask: opts.generateMask,
        maxBufferedChunks: opts.maxBufferedChunks,
        maxFragments: opts.maxFragments,
        maxPayload: opts.maxPayload,
        skipUTF8Validation: opts.skipUTF8Validation
      });
    });
    if (opts.finishRequest) {
      opts.finishRequest(req, websocket);
    } else {
      req.end();
    }
  }
  function emitErrorAndClose(websocket, err) {
    websocket._readyState = WebSocket.CLOSING;
    websocket._errorEmitted = true;
    websocket.emit("error", err);
    websocket.emitClose();
  }
  function netConnect(options) {
    options.path = options.socketPath;
    return net.connect(options);
  }
  function tlsConnect(options) {
    options.path = undefined;
    if (!options.servername && options.servername !== "") {
      options.servername = net.isIP(options.host) ? "" : options.host;
    }
    return tls.connect(options);
  }
  function abortHandshake(websocket, stream, message) {
    websocket._readyState = WebSocket.CLOSING;
    const err = new Error(message);
    Error.captureStackTrace(err, abortHandshake);
    if (stream.setHeader) {
      stream[kAborted] = true;
      stream.abort();
      if (stream.socket && !stream.socket.destroyed) {
        stream.socket.destroy();
      }
      process.nextTick(emitErrorAndClose, websocket, err);
    } else {
      stream.destroy(err);
      stream.once("error", websocket.emit.bind(websocket, "error"));
      stream.once("close", websocket.emitClose.bind(websocket));
    }
  }
  function sendAfterClose(websocket, data, cb) {
    if (data) {
      const length = isBlob(data) ? data.size : toBuffer(data).length;
      if (websocket._socket)
        websocket._sender._bufferedBytes += length;
      else
        websocket._bufferedAmount += length;
    }
    if (cb) {
      const err = new Error(`WebSocket is not open: readyState ${websocket.readyState} ` + `(${readyStates[websocket.readyState]})`);
      process.nextTick(cb, err);
    }
  }
  function receiverOnConclude(code, reason) {
    const websocket = this[kWebSocket];
    websocket._closeFrameReceived = true;
    websocket._closeMessage = reason;
    websocket._closeCode = code;
    if (websocket._socket[kWebSocket] === undefined)
      return;
    websocket._socket.removeListener("data", socketOnData);
    process.nextTick(resume, websocket._socket);
    if (code === 1005)
      websocket.close();
    else
      websocket.close(code, reason);
  }
  function receiverOnDrain() {
    const websocket = this[kWebSocket];
    if (!websocket.isPaused)
      websocket._socket.resume();
  }
  function receiverOnError(err) {
    const websocket = this[kWebSocket];
    if (websocket._socket[kWebSocket] !== undefined) {
      websocket._socket.removeListener("data", socketOnData);
      process.nextTick(resume, websocket._socket);
      websocket.close(err[kStatusCode]);
    }
    if (!websocket._errorEmitted) {
      websocket._errorEmitted = true;
      websocket.emit("error", err);
    }
  }
  function receiverOnFinish() {
    this[kWebSocket].emitClose();
  }
  function receiverOnMessage(data, isBinary) {
    this[kWebSocket].emit("message", data, isBinary);
  }
  function receiverOnPing(data) {
    const websocket = this[kWebSocket];
    if (websocket._autoPong)
      websocket.pong(data, !this._isServer, NOOP);
    websocket.emit("ping", data);
  }
  function receiverOnPong(data) {
    this[kWebSocket].emit("pong", data);
  }
  function resume(stream) {
    stream.resume();
  }
  function senderOnError(err) {
    const websocket = this[kWebSocket];
    if (websocket.readyState === WebSocket.CLOSED)
      return;
    if (websocket.readyState === WebSocket.OPEN) {
      websocket._readyState = WebSocket.CLOSING;
      setCloseTimer(websocket);
    }
    this._socket.end();
    if (!websocket._errorEmitted) {
      websocket._errorEmitted = true;
      websocket.emit("error", err);
    }
  }
  function setCloseTimer(websocket) {
    websocket._closeTimer = setTimeout(websocket._socket.destroy.bind(websocket._socket), websocket._closeTimeout);
  }
  function socketOnClose() {
    const websocket = this[kWebSocket];
    this.removeListener("close", socketOnClose);
    this.removeListener("data", socketOnData);
    this.removeListener("end", socketOnEnd);
    websocket._readyState = WebSocket.CLOSING;
    if (!this._readableState.endEmitted && !websocket._closeFrameReceived && !websocket._receiver._writableState.errorEmitted && this._readableState.length !== 0) {
      const chunk = this.read(this._readableState.length);
      websocket._receiver.write(chunk);
    }
    websocket._receiver.end();
    this[kWebSocket] = undefined;
    clearTimeout(websocket._closeTimer);
    if (websocket._receiver._writableState.finished || websocket._receiver._writableState.errorEmitted) {
      websocket.emitClose();
    } else {
      websocket._receiver.on("error", receiverOnFinish);
      websocket._receiver.on("finish", receiverOnFinish);
    }
  }
  function socketOnData(chunk) {
    if (!this[kWebSocket]._receiver.write(chunk)) {
      this.pause();
    }
  }
  function socketOnEnd() {
    const websocket = this[kWebSocket];
    websocket._readyState = WebSocket.CLOSING;
    websocket._receiver.end();
    this.end();
  }
  function socketOnError() {
    const websocket = this[kWebSocket];
    this.removeListener("error", socketOnError);
    this.on("error", NOOP);
    if (websocket) {
      websocket._readyState = WebSocket.CLOSING;
      this.destroy();
    }
  }
});

// node_modules/ws/lib/stream.js
var require_stream = __commonJS(function(exports2, module2) {
  var WebSocket = require_websocket();
  var { Duplex } = require("stream");
  function emitClose(stream) {
    stream.emit("close");
  }
  function duplexOnEnd() {
    if (!this.destroyed && this._writableState.finished) {
      this.destroy();
    }
  }
  function duplexOnError(err) {
    this.removeListener("error", duplexOnError);
    this.destroy();
    if (this.listenerCount("error") === 0) {
      this.emit("error", err);
    }
  }
  function createWebSocketStream(ws, options) {
    let terminateOnDestroy = true;
    const duplex = new Duplex({
      ...options,
      autoDestroy: false,
      emitClose: false,
      objectMode: false,
      writableObjectMode: false
    });
    ws.on("message", function message(msg, isBinary) {
      const data = !isBinary && duplex._readableState.objectMode ? msg.toString() : msg;
      if (!duplex.push(data))
        ws.pause();
    });
    ws.once("error", function error(err) {
      if (duplex.destroyed)
        return;
      terminateOnDestroy = false;
      duplex.destroy(err);
    });
    ws.once("close", function close() {
      if (duplex.destroyed)
        return;
      duplex.push(null);
    });
    duplex._destroy = function(err, callback) {
      if (ws.readyState === ws.CLOSED) {
        callback(err);
        process.nextTick(emitClose, duplex);
        return;
      }
      let called = false;
      ws.once("error", function error(err) {
        called = true;
        callback(err);
      });
      ws.once("close", function close() {
        if (!called)
          callback(err);
        process.nextTick(emitClose, duplex);
      });
      if (terminateOnDestroy)
        ws.terminate();
    };
    duplex._final = function(callback) {
      if (ws.readyState === ws.CONNECTING) {
        ws.once("open", function open() {
          duplex._final(callback);
        });
        return;
      }
      if (ws._socket === null)
        return;
      if (ws._socket._writableState.finished) {
        callback();
        if (duplex._readableState.endEmitted)
          duplex.destroy();
      } else {
        ws._socket.once("finish", function finish() {
          callback();
        });
        ws.close();
      }
    };
    duplex._read = function() {
      if (ws.isPaused)
        ws.resume();
    };
    duplex._write = function(chunk, encoding, callback) {
      if (ws.readyState === ws.CONNECTING) {
        ws.once("open", function open() {
          duplex._write(chunk, encoding, callback);
        });
        return;
      }
      ws.send(chunk, callback);
    };
    duplex.on("end", duplexOnEnd);
    duplex.on("error", duplexOnError);
    return duplex;
  }
  module2.exports = createWebSocketStream;
});

// node_modules/ws/lib/subprotocol.js
var require_subprotocol = __commonJS(function(exports2, module2) {
  var { tokenChars } = require_validation();
  function parse(header) {
    const protocols = new Set;
    let start = -1;
    let end = -1;
    let i = 0;
    for (i;i < header.length; i++) {
      const code = header.charCodeAt(i);
      if (end === -1 && tokenChars[code] === 1) {
        if (start === -1)
          start = i;
      } else if (i !== 0 && (code === 32 || code === 9)) {
        if (end === -1 && start !== -1)
          end = i;
      } else if (code === 44) {
        if (start === -1) {
          throw new SyntaxError(`Unexpected character at index ${i}`);
        }
        if (end === -1)
          end = i;
        const protocol = header.slice(start, end);
        if (protocols.has(protocol)) {
          throw new SyntaxError(`The "${protocol}" subprotocol is duplicated`);
        }
        protocols.add(protocol);
        start = end = -1;
      } else {
        throw new SyntaxError(`Unexpected character at index ${i}`);
      }
    }
    if (start === -1 || end !== -1) {
      throw new SyntaxError("Unexpected end of input");
    }
    const protocol = header.slice(start, i);
    if (protocols.has(protocol)) {
      throw new SyntaxError(`The "${protocol}" subprotocol is duplicated`);
    }
    protocols.add(protocol);
    return protocols;
  }
  module2.exports = { parse };
});

// node_modules/ws/lib/websocket-server.js
var require_websocket_server = __commonJS(function(exports2, module2) {
  var EventEmitter = require("events");
  var http = require("http");
  var { Duplex } = require("stream");
  var { createHash } = require("crypto");
  var extension = require_extension();
  var PerMessageDeflate = require_permessage_deflate();
  var subprotocol = require_subprotocol();
  var WebSocket = require_websocket();
  var { CLOSE_TIMEOUT, GUID, kWebSocket } = require_constants();
  var keyRegex = /^[+/0-9A-Za-z]{22}==$/;
  var RUNNING = 0;
  var CLOSING = 1;
  var CLOSED = 2;

  class WebSocketServer extends EventEmitter {
    constructor(options, callback) {
      super();
      options = {
        allowSynchronousEvents: true,
        autoPong: true,
        maxBufferedChunks: 256 * 1024,
        maxFragments: 16 * 1024,
        maxPayload: 100 * 1024 * 1024,
        skipUTF8Validation: false,
        perMessageDeflate: false,
        handleProtocols: null,
        clientTracking: true,
        closeTimeout: CLOSE_TIMEOUT,
        verifyClient: null,
        noServer: false,
        backlog: null,
        server: null,
        host: null,
        path: null,
        port: null,
        WebSocket,
        ...options
      };
      if (options.port == null && !options.server && !options.noServer || options.port != null && (options.server || options.noServer) || options.server && options.noServer) {
        throw new TypeError('One and only one of the "port", "server", or "noServer" options ' + "must be specified");
      }
      if (options.port != null) {
        this._server = http.createServer((req, res) => {
          const body = http.STATUS_CODES[426];
          res.writeHead(426, {
            "Content-Length": body.length,
            "Content-Type": "text/plain"
          });
          res.end(body);
        });
        this._server.listen(options.port, options.host, options.backlog, callback);
      } else if (options.server) {
        this._server = options.server;
      }
      if (this._server) {
        const emitConnection = this.emit.bind(this, "connection");
        this._removeListeners = addListeners(this._server, {
          listening: this.emit.bind(this, "listening"),
          error: this.emit.bind(this, "error"),
          upgrade: (req, socket, head) => {
            this.handleUpgrade(req, socket, head, emitConnection);
          }
        });
      }
      if (options.perMessageDeflate === true)
        options.perMessageDeflate = {};
      if (options.clientTracking) {
        this.clients = new Set;
        this._shouldEmitClose = false;
      }
      this.options = options;
      this._state = RUNNING;
    }
    address() {
      if (this.options.noServer) {
        throw new Error('The server is operating in "noServer" mode');
      }
      if (!this._server)
        return null;
      return this._server.address();
    }
    close(cb) {
      if (this._state === CLOSED) {
        if (cb) {
          this.once("close", () => {
            cb(new Error("The server is not running"));
          });
        }
        process.nextTick(emitClose, this);
        return;
      }
      if (cb)
        this.once("close", cb);
      if (this._state === CLOSING)
        return;
      this._state = CLOSING;
      if (this.options.noServer || this.options.server) {
        if (this._server) {
          this._removeListeners();
          this._removeListeners = this._server = null;
        }
        if (this.clients) {
          if (!this.clients.size) {
            process.nextTick(emitClose, this);
          } else {
            this._shouldEmitClose = true;
          }
        } else {
          process.nextTick(emitClose, this);
        }
      } else {
        const server = this._server;
        this._removeListeners();
        this._removeListeners = this._server = null;
        server.close(() => {
          emitClose(this);
        });
      }
    }
    shouldHandle(req) {
      if (this.options.path) {
        const index = req.url.indexOf("?");
        const pathname = index !== -1 ? req.url.slice(0, index) : req.url;
        if (pathname !== this.options.path)
          return false;
      }
      return true;
    }
    handleUpgrade(req, socket, head, cb) {
      socket.on("error", socketOnError);
      const key = req.headers["sec-websocket-key"];
      const upgrade = req.headers.upgrade;
      const version = +req.headers["sec-websocket-version"];
      if (req.method !== "GET") {
        const message = "Invalid HTTP method";
        abortHandshakeOrEmitwsClientError(this, req, socket, 405, message);
        return;
      }
      if (upgrade === undefined || upgrade.toLowerCase() !== "websocket") {
        const message = "Invalid Upgrade header";
        abortHandshakeOrEmitwsClientError(this, req, socket, 400, message);
        return;
      }
      if (key === undefined || !keyRegex.test(key)) {
        const message = "Missing or invalid Sec-WebSocket-Key header";
        abortHandshakeOrEmitwsClientError(this, req, socket, 400, message);
        return;
      }
      if (version !== 13 && version !== 8) {
        const message = "Missing or invalid Sec-WebSocket-Version header";
        abortHandshakeOrEmitwsClientError(this, req, socket, 400, message, {
          "Sec-WebSocket-Version": "13, 8"
        });
        return;
      }
      if (!this.shouldHandle(req)) {
        abortHandshake(socket, 400);
        return;
      }
      const secWebSocketProtocol = req.headers["sec-websocket-protocol"];
      let protocols = new Set;
      if (secWebSocketProtocol !== undefined) {
        try {
          protocols = subprotocol.parse(secWebSocketProtocol);
        } catch (err) {
          const message = "Invalid Sec-WebSocket-Protocol header";
          abortHandshakeOrEmitwsClientError(this, req, socket, 400, message);
          return;
        }
      }
      const secWebSocketExtensions = req.headers["sec-websocket-extensions"];
      const extensions = {};
      if (this.options.perMessageDeflate && secWebSocketExtensions !== undefined) {
        const perMessageDeflate = new PerMessageDeflate({
          ...this.options.perMessageDeflate,
          isServer: true,
          maxPayload: this.options.maxPayload
        });
        try {
          const offers = extension.parse(secWebSocketExtensions);
          if (offers[PerMessageDeflate.extensionName]) {
            perMessageDeflate.accept(offers[PerMessageDeflate.extensionName]);
            extensions[PerMessageDeflate.extensionName] = perMessageDeflate;
          }
        } catch (err) {
          const message = "Invalid or unacceptable Sec-WebSocket-Extensions header";
          abortHandshakeOrEmitwsClientError(this, req, socket, 400, message);
          return;
        }
      }
      if (this.options.verifyClient) {
        const info = {
          origin: req.headers[`${version === 8 ? "sec-websocket-origin" : "origin"}`],
          secure: !!(req.socket.authorized || req.socket.encrypted),
          req
        };
        if (this.options.verifyClient.length === 2) {
          this.options.verifyClient(info, (verified, code, message, headers) => {
            if (!verified) {
              return abortHandshake(socket, code || 401, message, headers);
            }
            this.completeUpgrade(extensions, key, protocols, req, socket, head, cb);
          });
          return;
        }
        if (!this.options.verifyClient(info))
          return abortHandshake(socket, 401);
      }
      this.completeUpgrade(extensions, key, protocols, req, socket, head, cb);
    }
    completeUpgrade(extensions, key, protocols, req, socket, head, cb) {
      if (!socket.readable || !socket.writable)
        return socket.destroy();
      if (socket[kWebSocket]) {
        throw new Error("server.handleUpgrade() was called more than once with the same " + "socket, possibly due to a misconfiguration");
      }
      if (this._state > RUNNING)
        return abortHandshake(socket, 503);
      const digest = createHash("sha1").update(key + GUID).digest("base64");
      const headers = [
        "HTTP/1.1 101 Switching Protocols",
        "Upgrade: websocket",
        "Connection: Upgrade",
        `Sec-WebSocket-Accept: ${digest}`
      ];
      const ws = new this.options.WebSocket(null, undefined, this.options);
      if (protocols.size) {
        const protocol = this.options.handleProtocols ? this.options.handleProtocols(protocols, req) : protocols.values().next().value;
        if (protocol) {
          headers.push(`Sec-WebSocket-Protocol: ${protocol}`);
          ws._protocol = protocol;
        }
      }
      if (extensions[PerMessageDeflate.extensionName]) {
        const params = extensions[PerMessageDeflate.extensionName].params;
        const value = extension.format({
          [PerMessageDeflate.extensionName]: [params]
        });
        headers.push(`Sec-WebSocket-Extensions: ${value}`);
        ws._extensions = extensions;
      }
      this.emit("headers", headers, req);
      socket.write(headers.concat(`\r
`).join(`\r
`));
      socket.removeListener("error", socketOnError);
      ws.setSocket(socket, head, {
        allowSynchronousEvents: this.options.allowSynchronousEvents,
        maxBufferedChunks: this.options.maxBufferedChunks,
        maxFragments: this.options.maxFragments,
        maxPayload: this.options.maxPayload,
        skipUTF8Validation: this.options.skipUTF8Validation
      });
      if (this.clients) {
        this.clients.add(ws);
        ws.on("close", () => {
          this.clients.delete(ws);
          if (this._shouldEmitClose && !this.clients.size) {
            process.nextTick(emitClose, this);
          }
        });
      }
      cb(ws, req);
    }
  }
  module2.exports = WebSocketServer;
  function addListeners(server, map) {
    for (const event of Object.keys(map))
      server.on(event, map[event]);
    return function removeListeners() {
      for (const event of Object.keys(map)) {
        server.removeListener(event, map[event]);
      }
    };
  }
  function emitClose(server) {
    server._state = CLOSED;
    server.emit("close");
  }
  function socketOnError() {
    this.destroy();
  }
  function abortHandshake(socket, code, message, headers) {
    message = message || http.STATUS_CODES[code];
    headers = {
      Connection: "close",
      "Content-Type": "text/html",
      "Content-Length": Buffer.byteLength(message),
      ...headers
    };
    socket.once("finish", socket.destroy);
    socket.end(`HTTP/1.1 ${code} ${http.STATUS_CODES[code]}\r
` + Object.keys(headers).map((h) => `${h}: ${headers[h]}`).join(`\r
`) + `\r
\r
` + message);
  }
  function abortHandshakeOrEmitwsClientError(server, req, socket, code, message, headers) {
    if (server.listenerCount("wsClientError")) {
      const err = new Error(message);
      Error.captureStackTrace(err, abortHandshakeOrEmitwsClientError);
      server.emit("wsClientError", err, socket, req);
    } else {
      abortHandshake(socket, code, message, headers);
    }
  }
});

// node_modules/ws/wrapper.mjs
var exports_wrapper = {};
__export(exports_wrapper, {
  default: () => wrapper_default
});
var import_stream2, import_extension, import_permessage_deflate, import_receiver, import_sender, import_subprotocol, import_websocket, import_websocket_server, wrapper_default;
var init_wrapper = __esm(() => {
  import_stream2 = __toESM(require_stream(), 1);
  import_extension = __toESM(require_extension(), 1);
  import_permessage_deflate = __toESM(require_permessage_deflate(), 1);
  import_receiver = __toESM(require_receiver(), 1);
  import_sender = __toESM(require_sender(), 1);
  import_subprotocol = __toESM(require_subprotocol(), 1);
  import_websocket = __toESM(require_websocket(), 1);
  import_websocket_server = __toESM(require_websocket_server(), 1);
  wrapper_default = import_websocket.default;
});

// src/index.ts
var exports_src = {};
__export(exports_src, {
  BaseChannel: () => BaseChannel,
  CONFIG: () => CONFIG,
  CalendarChannelAdapter: () => CalendarChannelAdapter,
  ChannelHub: () => ChannelHub,
  CommandRouter: () => CommandRouter,
  DiscordChannelAdapter: () => DiscordChannelAdapter,
  EmailChannelAdapter: () => EmailChannelAdapter,
  GitHubChannelAdapter: () => GitHubChannelAdapter,
  GroupManager: () => GroupManager,
  HumanHandoffManager: () => HumanHandoffManager,
  IdempotencyCache: () => IdempotencyCache,
  IdentityStitcher: () => IdentityStitcher,
  MediaTranscoder: () => MediaTranscoder,
  MessengerChannelAdapter: () => MessengerChannelAdapter,
  MessengerPersonalAdapter: () => MessengerPersonalAdapter,
  SharedTokenBucketLimiter: () => SharedTokenBucketLimiter,
  SlackChannelAdapter: () => SlackChannelAdapter,
  SmartStreamer: () => SmartStreamer,
  TelegramChannelAdapter: () => TelegramChannelAdapter,
  TikTokBusinessAdapter: () => TikTokBusinessAdapter,
  TokenBucketLimiter: () => TokenBucketLimiter,
  TwilioChannelAdapter: () => TwilioChannelAdapter,
  VideoEngine: () => VideoEngine,
  WebResearch: () => WebResearch,
  WebhookBridge: () => WebhookBridge,
  WebhookGenericAdapter: () => WebhookGenericAdapter,
  ZaloChannelAdapter: () => ZaloChannelAdapter,
  ZaloOABot: () => ZaloOABot,
  ZaloPersonalBot: () => ZaloPersonalBot,
  ZaloReactions: () => ZaloReactions,
  ZaloThreadType: () => ZaloThreadType,
  createMessageContext: () => createMessageContext,
  getChannelHubMcpTools: () => getChannelHubMcpTools,
  handleChannelHubMcpCall: () => handleChannelHubMcpCall,
  initOABot: () => initOABot,
  initPersonalBot: () => initPersonalBot
});
module.exports = __toCommonJS(exports_src);
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
var import_node_path2 = __toESM(require("node:path"), 1);
var import_dotenv = __toESM(require_main(), 1);
import_dotenv.default.config();
var CONFIG = {
  PERSONAL: {
    CRED_PATH: process.env.ZALO_CRED_PATH || import_node_path2.default.resolve("./credentials.json"),
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
var import_node_fs2 = __toESM(require("node:fs"), 1);
async function initPersonalBot() {
  if (!import_node_fs2.default.existsSync(CONFIG.PERSONAL.CRED_PATH)) {
    throw new Error(`Missing ${CONFIG.PERSONAL.CRED_PATH}. Run 'bun run login:personal' to scan QR code.`);
  }
  const { Zalo } = await import("zca-js");
  const creds = JSON.parse(import_node_fs2.default.readFileSync(CONFIG.PERSONAL.CRED_PATH, "utf-8"));
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
// src/channels/telegram/adapter.ts
class TelegramChannelAdapter extends BaseChannel {
  name = "telegram";
  capabilities = {
    inbound: true,
    outbound: true,
    media: ["image", "video", "file", "audio", "animation", "sticker"],
    reactions: true,
    editing: true,
    typing: true,
    mode: "polling"
  };
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
  async connect(signal) {
    this.assertNotAborted(signal);
    if (!this.config.botToken) {
      throw new Error("Telegram botToken is required.");
    }
    await this.callApi("getMe", {}, signal);
    this.setConnected(true);
    if (this.config.autoStart !== false) {
      this.startPolling();
    }
  }
  async disconnect(signal) {
    this.assertNotAborted(signal);
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
  async callApi(method, body, signal) {
    const url = `${this.apiRoot}/bot${this.config.botToken}/${method}`;
    let res;
    try {
      res = await fetch(url, {
        method: "POST",
        signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
    } catch (err) {
      const safeMsg = err.message ? err.message.replace(this.config.botToken, "[REDACTED]") : String(err);
      throw new Error(`Telegram network error (${method}): ${safeMsg}`);
    }
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Telegram API ${method} failed: ${res.status} ${errText.replace(this.config.botToken, "[REDACTED]")}`);
    }
    const data = await res.json();
    if (!data.ok) {
      throw new Error(`Telegram API ${method} error: ${data.description}`);
    }
    return data.result;
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
    if (options?.actions && options.actions.length > 0) {
      payload.reply_markup = this.buildInlineKeyboard(options.actions);
    }
    const res = await this.callApi("sendMessage", payload, options?.signal);
    return {
      messageId: String(res.message_id),
      chatId,
      timestamp: res.date * 1000
    };
  }
  buildInlineKeyboard(actions) {
    const keyboard = actions.map((act) => {
      if (act.type === "link") {
        return [{ text: act.label, url: act.url }];
      }
      return [{ text: act.label, callback_data: act.payload }];
    });
    return { inline_keyboard: keyboard };
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
    const res = await this.callApi(method, payload, options?.signal);
    return {
      messageId: String(res.message_id),
      chatId,
      timestamp: (res.date || Date.now()) * 1000
    };
  }
  async addReaction(chatId, messageId, emoji, options) {
    await this.callApi("setMessageReaction", {
      chat_id: chatId,
      message_id: Number(messageId),
      reaction: [{ type: "emoji", emoji }]
    }, options?.signal);
  }
  async sendTyping(chatId, options) {
    await this.callApi("sendChatAction", {
      chat_id: chatId,
      action: "typing"
    }, options?.signal);
  }
  async editText(chatId, messageId, text, options) {
    const res = await this.callApi("editMessageText", {
      chat_id: chatId,
      message_id: Number(messageId),
      text
    }, options?.signal);
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
  capabilities = {
    inbound: true,
    outbound: true,
    media: ["image", "video", "file", "audio", "animation", "sticker"],
    reactions: true,
    editing: true,
    typing: true,
    mode: "gateway"
  };
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
    await this.callApi("GET", "/users/@me", undefined, signal);
    this.setConnected(true);
    if (this.config.autoStart !== false) {
      this.connectGateway();
    }
  }
  async connectGateway() {
    const WS = globalThis.WebSocket || (await Promise.resolve().then(() => (init_wrapper(), exports_wrapper))).default;
    const ws = new WS("wss://gateway.discord.gg/?v=10&encoding=json");
    this.ws = ws;
    ws.onmessage = async (event) => {
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
            await this.dispatchMessage(msg);
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
  async callApi(method, path, body, signal) {
    const res = await fetch(`${this.apiBase}${path}`, {
      method,
      signal,
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
    if (options?.actions && options.actions.length > 0) {
      payload.components = [
        {
          type: 1,
          components: options.actions.map((act) => {
            if (act.type === "link") {
              return { type: 2, style: 5, label: act.label, url: act.url };
            }
            return { type: 2, style: 1, label: act.label, custom_id: act.payload };
          })
        }
      ];
    }
    const res = await this.callApi("POST", `/channels/${chatId}/messages`, payload, options?.signal);
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
    const res = await this.callApi("POST", `/channels/${chatId}/messages`, payload, options?.signal);
    return {
      messageId: String(res.id),
      chatId,
      timestamp: Date.parse(res.timestamp) || Date.now()
    };
  }
  async addReaction(chatId, messageId, emoji, options) {
    const encoded = encodeURIComponent(emoji);
    await this.callApi("PUT", `/channels/${chatId}/messages/${messageId}/reactions/${encoded}/@me`, undefined, options?.signal);
  }
  async sendTyping(chatId, options) {
    await this.callApi("POST", `/channels/${chatId}/typing`, undefined, options?.signal);
  }
  async editText(chatId, messageId, text, options) {
    const res = await this.callApi("PATCH", `/channels/${chatId}/messages/${messageId}`, {
      content: text
    }, options?.signal);
    return {
      messageId: String(res.id || messageId),
      chatId,
      timestamp: Date.now()
    };
  }
}
// src/channels/slack/adapter.ts
var import_node_crypto = require("node:crypto");
class SlackChannelAdapter extends BaseChannel {
  name = "slack";
  capabilities = {
    inbound: true,
    outbound: true,
    media: ["image", "video", "file", "audio"],
    reactions: true,
    editing: true,
    typing: false,
    mode: "webhook"
  };
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
    await this.callApi("auth.test", {}, signal);
    if (this.config.appToken) {
      const res = await fetch("https://slack.com/api/apps.connections.open", {
        method: "POST",
        signal,
        headers: { Authorization: `Bearer ${this.config.appToken}` }
      });
      const data = await res.json();
      if (data.ok && data.url) {
        const WS = globalThis.WebSocket || (await Promise.resolve().then(() => (init_wrapper(), exports_wrapper))).default;
        this.ws = new WS(data.url);
        this.ws.onopen = () => this.emit("status", { status: "connected" });
        this.ws.onmessage = async (e) => {
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
                await this.dispatchMessage(msg);
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
  verifySignature(rawBody, signatureHeader, timestampHeader) {
    if (!signatureHeader || !timestampHeader || !this.config.signingSecret)
      return false;
    const ts = parseInt(timestampHeader, 10);
    const now = Math.floor(Date.now() / 1000);
    if (isNaN(ts) || Math.abs(now - ts) > 300)
      return false;
    const bodyStr = typeof rawBody === "string" ? rawBody : rawBody.toString("utf8");
    const sigBaseString = `v0:${timestampHeader}:${bodyStr}`;
    const expected = "v0=" + import_node_crypto.createHmac("sha256", this.config.signingSecret).update(sigBaseString, "utf8").digest("hex");
    const a = Buffer.from(expected);
    const b = Buffer.from(signatureHeader);
    if (a.length !== b.length)
      return false;
    return import_node_crypto.timingSafeEqual(a, b);
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
  async callApi(method, body, signal) {
    const res = await fetch(`${this.apiBase}/${method}`, {
      method: "POST",
      signal,
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
    const res = await this.callApi("chat.postMessage", payload, options?.signal);
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
    const res = await this.callApi("chat.postMessage", payload, options?.signal);
    return {
      messageId: String(res.ts),
      chatId,
      timestamp: parseFloat(res.ts) * 1000
    };
  }
  async addReaction(chatId, messageId, emoji, options) {
    const cleanName = emoji.replace(/:/g, "");
    await this.callApi("reactions.add", {
      channel: chatId,
      timestamp: messageId,
      name: cleanName
    }, options?.signal);
  }
  async sendTyping(chatId) {}
  async editText(chatId, messageId, text, options) {
    const res = await this.callApi("chat.update", {
      channel: chatId,
      ts: messageId,
      text
    }, options?.signal);
    return {
      messageId: String(res.ts || messageId),
      chatId,
      timestamp: Date.now()
    };
  }
}
// src/channels/messenger/adapter.ts
var import_node_http = __toESM(require("node:http"), 1);
var import_node_crypto2 = require("node:crypto");
class MessengerChannelAdapter extends BaseChannel {
  name = "messenger";
  capabilities = {
    inbound: true,
    outbound: true,
    media: ["image", "video", "file", "audio", "animation", "sticker"],
    reactions: true,
    editing: false,
    typing: true,
    mode: "webhook"
  };
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
      signal,
      headers: { Authorization: `Bearer ${this.config.pageAccessToken}` }
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Failed to authenticate with Messenger Graph API: ${err}`);
    }
    if (this.config.checkPermissionsOnConnect !== false) {
      try {
        const perms = await this.getPermissions(signal);
        const hasMessaging = perms.some((p) => (p.permission === "pages_messaging" || p.permission === "messages") && p.status === "granted");
        if (!hasMessaging) {
          console.warn("[MessengerChannelAdapter] ⚠️ Warning: Token is missing 'pages_messaging' permission. Messages may fail to send/receive.");
        }
      } catch (err) {
        console.warn(`[MessengerChannelAdapter] Unable to inspect token permissions: ${err.message}`);
      }
    }
    if (this.config.autoSubscribePage) {
      await this.subscribePage(this.config.subscribedFields, signal);
    }
    if (this.config.port) {
      const path = this.config.webhookPath || "/webhook";
      this.server = import_node_http.default.createServer(async (req, res) => {
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
          req.on("end", async () => {
            if (this.config.appSecret) {
              const signature = req.headers["x-hub-signature-256"];
              if (!this.verifySignature(body, signature)) {
                res.writeHead(401).end("Invalid Signature");
                return;
              }
            }
            try {
              const data = JSON.parse(body);
              const msgs = this.normalizeEvent(data);
              for (const m of msgs) {
                await this.dispatchMessage(m);
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
    if (mode !== "subscribe" || !this.config.verifyToken)
      return null;
    const a = Buffer.from(token);
    const b = Buffer.from(this.config.verifyToken);
    if (a.length !== b.length)
      return null;
    return import_node_crypto2.timingSafeEqual(a, b) ? challenge : null;
  }
  verifySignature(rawBody, signatureHeader) {
    if (!signatureHeader || !this.config.appSecret)
      return false;
    const parts = signatureHeader.split("=");
    if (parts.length !== 2 || parts[0] !== "sha256")
      return false;
    const expected = import_node_crypto2.createHmac("sha256", this.config.appSecret).update(typeof rawBody === "string" ? Buffer.from(rawBody) : rawBody).digest("hex");
    const a = Buffer.from(expected);
    const b = Buffer.from(parts[1]);
    if (a.length !== b.length)
      return false;
    return import_node_crypto2.timingSafeEqual(a, b);
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
        if (event.message?.is_echo)
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
    if (options?.messagingType) {
      payload.messaging_type = options.messagingType;
    }
    if (options?.tag) {
      payload.messaging_type = "MESSAGE_TAG";
      payload.tag = options.tag;
    }
    const res = await this.callApi("POST", "/me/messages", payload, options?.signal);
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
      if (options?.messagingType)
        payload.messaging_type = options.messagingType;
      if (options?.tag) {
        payload.messaging_type = "MESSAGE_TAG";
        payload.tag = options.tag;
      }
      const res = await this.callApi("POST", "/me/messages", payload, options?.signal);
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
      const res = await this.callApi("POST", "/me/messages", payload, options?.signal);
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
        signal: options?.signal,
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
          const res = await this.callApi("POST", "/me/messages", payload, options?.signal);
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
      signal: options?.signal,
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
  async sendTyping(chatId, options) {
    await this.callApi("POST", "/me/messages", {
      recipient: { id: chatId },
      sender_action: "typing_on"
    }, options?.signal);
  }
  async getPermissions(signal) {
    const res = await this.callApi("GET", "/me/permissions", undefined, signal);
    return res.data || [];
  }
  async subscribePage(fields = ["messages", "messaging_postbacks"], signal) {
    try {
      const res = await this.callApi("POST", "/me/subscribed_apps", { subscribed_fields: fields }, signal);
      return Boolean(res.success);
    } catch (err) {
      console.error("[MessengerChannelAdapter] Failed to subscribe page:", err.message);
      return false;
    }
  }
  async setMessengerProfile(payload, signal) {
    try {
      const res = await this.callApi("POST", "/me/messenger_profile", payload, signal);
      return res.result === "success";
    } catch (err) {
      console.error("[MessengerChannelAdapter] Failed to set messenger profile:", err.message);
      return false;
    }
  }
  async callApi(method, path, body, signal) {
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
// src/channels/messenger/personal.ts
var import_node_fs3 = __toESM(require("node:fs"), 1);
var import_node_path3 = __toESM(require("node:path"), 1);
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
    const userDataDir = this._config.userDataDir || import_node_path3.default.resolve(process.cwd(), ".messenger-profile");
    this._browserContext = await chromium.launchPersistentContext(userDataDir, {
      headless: this._config.headless,
      args: [
        "--disable-blink-features=AutomationControlled",
        "--disable-notifications",
        "--no-sandbox"
      ],
      viewport: { width: 1280, height: 800 }
    });
    const credPath = this._config.credentialsPath || import_node_path3.default.resolve(process.cwd(), "messenger.credentials.json");
    if (import_node_fs3.default.existsSync(credPath)) {
      try {
        const raw = import_node_fs3.default.readFileSync(credPath, "utf-8");
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
// src/channels/tiktok/adapter.ts
var import_node_crypto3 = require("node:crypto");
class TikTokBusinessAdapter extends BaseChannel {
  name = "tiktok";
  capabilities = {
    inbound: true,
    outbound: true,
    media: ["image"],
    reactions: false,
    editing: false,
    typing: false,
    mode: "webhook"
  };
  config;
  apiRoot;
  maxAgeSec;
  constructor(config) {
    super();
    if (!config.appId)
      throw new Error("TikTokBusinessAdapter: appId is required");
    if (!config.clientSecret)
      throw new Error("TikTokBusinessAdapter: clientSecret is required");
    if (!config.accessToken)
      throw new Error("TikTokBusinessAdapter: accessToken is required");
    this.config = config;
    this.apiRoot = (config.apiRoot || "https://business-api.tiktok.com").replace(/\/$/, "");
    this.maxAgeSec = config.maxWebhookAgeSeconds ?? 300;
  }
  async connect(signal) {
    this.assertNotAborted(signal);
    this.setConnected(true);
  }
  async disconnect(signal) {
    this.assertNotAborted(signal);
    this.setConnected(false);
  }
  verifySignature(rawBody, signatureHeader) {
    if (!signatureHeader)
      return false;
    const params = new Map;
    for (const part of signatureHeader.split(",")) {
      const idx = part.indexOf("=");
      if (idx !== -1) {
        params.set(part.slice(0, idx).trim(), part.slice(idx + 1).trim());
      }
    }
    const timestampStr = params.get("t");
    const receivedSig = params.get("s");
    if (!timestampStr || !receivedSig)
      return false;
    const timestampSec = Number(timestampStr);
    if (isNaN(timestampSec))
      return false;
    const nowSec = Math.floor(Date.now() / 1000);
    if (Math.abs(nowSec - timestampSec) > this.maxAgeSec) {
      return false;
    }
    const bodyStr = typeof rawBody === "string" ? rawBody : rawBody.toString("utf8");
    const message = `${timestampStr}.${bodyStr}`;
    const expectedHex = import_node_crypto3.createHmac("sha256", this.config.clientSecret).update(message, "utf8").digest("hex");
    const expectedBuf = Buffer.from(expectedHex, "utf8");
    const receivedBuf = Buffer.from(receivedSig, "utf8");
    if (expectedBuf.length !== receivedBuf.length)
      return false;
    return import_node_crypto3.timingSafeEqual(expectedBuf, receivedBuf);
  }
  async handleWebhook(rawBody, signatureHeader) {
    if (!this.verifySignature(rawBody, signatureHeader)) {
      return false;
    }
    try {
      const bodyStr = typeof rawBody === "string" ? rawBody : rawBody.toString("utf8");
      const envelope = JSON.parse(bodyStr);
      if (envelope.event !== "message.receive") {
        return true;
      }
      const rawMsg = JSON.parse(envelope.content);
      const unified = this.normalizeMessage(rawMsg);
      if (unified) {
        await this.dispatchMessage(unified);
      }
      return true;
    } catch (err) {
      this.emit("error", new Error(`TikTokBusinessAdapter webhook parse error: ${err.message}`));
      return false;
    }
  }
  normalizeMessage(msg) {
    if (!msg || !msg.message_id || !msg.conversation_id)
      return null;
    const unified = {
      id: String(msg.message_id),
      channel: "tiktok",
      sender: {
        id: String(msg.sender_open_id),
        name: msg.sender_display_name || undefined,
        isBot: false
      },
      chat: {
        id: String(msg.conversation_id),
        type: "dm"
      },
      content: {
        text: msg.text || "",
        attachments: msg.image_url ? [
          {
            type: "image",
            url: msg.image_url
          }
        ] : undefined
      },
      raw: msg,
      timestamp: (msg.create_time || Math.floor(Date.now() / 1000)) * 1000
    };
    return unified;
  }
  async sendText(conversationId, text, options) {
    this.assertNotAborted(options?.signal);
    const payload = {
      conversation_id: conversationId,
      message_type: "TEXT",
      content: { text }
    };
    return this.postMessage(conversationId, payload, options?.signal);
  }
  async sendMedia(conversationId, media, options) {
    this.assertNotAborted(options?.signal);
    if (media.type !== "image") {
      throw new Error(`TikTokBusinessAdapter: media type "${media.type}" is not supported. Only "image" is supported by TikTok Business API.`);
    }
    const mediaId = typeof media.source === "string" ? media.source : media.source.toString();
    const payload = {
      conversation_id: conversationId,
      message_type: "IMAGE",
      content: { media_id: mediaId }
    };
    return this.postMessage(conversationId, payload, options?.signal);
  }
  async postMessage(conversationId, payload, signal) {
    const url = `${this.apiRoot}/open_api/v1.3/business/message/send/`;
    const res = await fetch(url, {
      method: "POST",
      signal,
      headers: {
        "Content-Type": "application/json",
        "Access-Token": this.config.accessToken
      },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`TikTok API error: HTTP ${res.status} [REDACTED]`);
    }
    const data = await res.json();
    if (data.code !== 0) {
      throw new Error(`TikTok API error code ${data.code}: ${data.message || "Unknown error"}`);
    }
    return {
      messageId: String(data.data?.message_id || Date.now()),
      chatId: conversationId,
      timestamp: Date.now()
    };
  }
}
// src/channels/twilio/adapter.ts
var import_node_crypto4 = require("node:crypto");
class TwilioChannelAdapter extends BaseChannel {
  name = "twilio";
  capabilities = {
    inbound: true,
    outbound: true,
    media: ["image", "video", "audio", "file"],
    reactions: false,
    editing: false,
    typing: false,
    mode: "webhook"
  };
  config;
  apiRoot;
  constructor(config) {
    super();
    if (!config.accountSid)
      throw new Error("TwilioChannelAdapter: accountSid required");
    if (!config.authToken)
      throw new Error("TwilioChannelAdapter: authToken required");
    if (!config.fromNumber)
      throw new Error("TwilioChannelAdapter: fromNumber required");
    this.config = config;
    this.apiRoot = config.apiRoot || "https://api.twilio.com";
  }
  async connect(signal) {
    this.assertNotAborted(signal);
    this.setConnected(true);
  }
  async disconnect(signal) {
    this.assertNotAborted(signal);
    this.setConnected(false);
  }
  verifySignature(signatureHeader, url, postData) {
    if (!signatureHeader)
      return false;
    const sortedKeys = Object.keys(postData).sort();
    let dataStr = url;
    for (const k of sortedKeys) {
      dataStr += k + postData[k];
    }
    const expectedB64 = import_node_crypto4.createHmac("sha1", this.config.authToken).update(dataStr, "utf8").digest("base64");
    const expectedBuf = Buffer.from(expectedB64, "utf8");
    const receivedBuf = Buffer.from(signatureHeader, "utf8");
    if (expectedBuf.length !== receivedBuf.length)
      return false;
    return import_node_crypto4.timingSafeEqual(expectedBuf, receivedBuf);
  }
  async handleWebhook(postData, signatureHeader, exactUrl) {
    if (exactUrl && signatureHeader) {
      const isValid = this.verifySignature(signatureHeader, exactUrl, postData);
      if (!isValid)
        return false;
    }
    const unified = this.normalizeMessage(postData);
    if (unified) {
      await this.dispatchMessage(unified);
    }
    return true;
  }
  normalizeMessage(msg) {
    if (!msg || !msg.MessageSid)
      return null;
    let channelAlias = "sms";
    if (msg.From.startsWith("whatsapp:"))
      channelAlias = "whatsapp";
    const attachments = [];
    const numMedia = parseInt(msg.NumMedia || "0", 10);
    for (let i = 0;i < numMedia; i++) {
      const url = msg[`MediaUrl${i}`];
      const mime = msg[`MediaContentType${i}`];
      if (url) {
        let type = "file";
        if (mime?.startsWith("image/"))
          type = "image";
        else if (mime?.startsWith("video/"))
          type = "video";
        else if (mime?.startsWith("audio/"))
          type = "audio";
        attachments.push({ type, url, mimeType: mime });
      }
    }
    return {
      id: msg.MessageSid,
      channel: this.name,
      sender: {
        id: msg.From
      },
      chat: {
        id: msg.From,
        type: "dm"
      },
      content: {
        text: msg.Body || "",
        attachments: attachments.length > 0 ? attachments : undefined
      },
      raw: msg,
      timestamp: Date.now(),
      metadata: { twilioChannel: channelAlias }
    };
  }
  async sendText(chatId, text, options) {
    const params = new URLSearchParams;
    params.append("To", chatId);
    params.append("From", this.config.fromNumber);
    params.append("Body", text);
    return this.postTwilioMessage(params, options?.signal);
  }
  async sendMedia(chatId, media, options) {
    const params = new URLSearchParams;
    params.append("To", chatId);
    params.append("From", this.config.fromNumber);
    if (media.caption) {
      params.append("Body", media.caption);
    }
    if (typeof media.source !== "string" || !media.source.startsWith("http")) {
      throw new Error("TwilioChannelAdapter: media.source must be a public HTTP URL.");
    }
    params.append("MediaUrl", media.source);
    return this.postTwilioMessage(params, options?.signal);
  }
  async postTwilioMessage(params, signal) {
    const url = `${this.apiRoot}/2010-04-01/Accounts/${this.config.accountSid}/Messages.json`;
    const authBuf = Buffer.from(`${this.config.accountSid}:${this.config.authToken}`).toString("base64");
    const res = await fetch(url, {
      method: "POST",
      signal,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${authBuf}`
      },
      body: params
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Twilio API failed: HTTP ${res.status} [REDACTED]`);
    }
    const data = await res.json();
    return {
      messageId: data.sid,
      chatId: data.to,
      timestamp: Date.now()
    };
  }
}
// src/channels/email/adapter.ts
class EmailChannelAdapter extends BaseChannel {
  name = "email";
  config;
  constructor(config) {
    super();
    if (!config.apiKey)
      throw new Error("EmailAdapter requires apiKey");
    if (!config.fromAddress)
      throw new Error("EmailAdapter requires fromAddress");
    this.config = {
      provider: "resend",
      ...config
    };
  }
  async connect(signal) {
    if (signal?.aborted)
      throw new Error("Connection aborted");
    if (this.config.provider === "resend") {
      const base = this.config.apiBaseUrl || "https://api.resend.com";
      const res = await fetch(`${base}/api-keys`, {
        signal,
        headers: { Authorization: `Bearer ${this.config.apiKey}` }
      });
      if (res.status === 401) {
        throw new Error("Invalid Resend API Key provided to EmailChannelAdapter");
      }
    }
    this.setConnected(true);
  }
  async disconnect() {
    this.setConnected(false);
  }
  async sendText(chatId, text, options) {
    if (options?.signal?.aborted)
      throw new Error("Send aborted");
    const subject = options?.subject || this.config.defaultSubject || "Message from AI Agent";
    const recipient = chatId;
    if (this.config.provider === "resend") {
      const base = this.config.apiBaseUrl || "https://api.resend.com";
      const body = {
        from: this.config.fromAddress,
        to: [recipient],
        subject,
        text
      };
      if (options?.html)
        body.html = options.html;
      if (options?.cc)
        body.cc = options.cc;
      if (options?.bcc)
        body.bcc = options.bcc;
      if (options?.replyTo)
        body.reply_to = options.replyTo;
      const res = await fetch(`${base}/emails`, {
        method: "POST",
        signal: options?.signal,
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      });
      if (!res.ok) {
        const err = await res.text();
        throw new Error(`Resend API failed (${res.status}): ${err}`);
      }
      const data = await res.json();
      return {
        messageId: data.id || `email_${Date.now()}`,
        chatId: recipient,
        timestamp: Date.now()
      };
    } else {
      const base = this.config.apiBaseUrl || "https://api.sendgrid.com/v3";
      const body = {
        personalizations: [{ to: [{ email: recipient }] }],
        from: { email: this.config.fromAddress },
        subject,
        content: [{ type: "text/plain", value: text }]
      };
      if (options?.html) {
        body.content.push({ type: "text/html", value: options.html });
      }
      const res = await fetch(`${base}/mail/send`, {
        method: "POST",
        signal: options?.signal,
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      });
      if (!res.ok) {
        const err = await res.text();
        throw new Error(`SendGrid API failed (${res.status}): ${err}`);
      }
      return {
        messageId: res.headers.get("x-message-id") || `sg_${Date.now()}`,
        chatId: recipient,
        timestamp: Date.now()
      };
    }
  }
  async sendMedia(chatId, media, options) {
    if (options?.signal?.aborted)
      throw new Error("Send aborted");
    let base64Content = "";
    if (typeof media.source === "string") {
      base64Content = Buffer.from(media.source).toString("base64");
    } else if (media.source instanceof Uint8Array || Buffer.isBuffer(media.source)) {
      base64Content = Buffer.from(media.source).toString("base64");
    }
    const filename = media.filename || "attachment.dat";
    const subject = options?.subject || this.config.defaultSubject || `Attachment: ${filename}`;
    if (this.config.provider === "resend") {
      const base = this.config.apiBaseUrl || "https://api.resend.com";
      const body = {
        from: this.config.fromAddress,
        to: [chatId],
        subject,
        text: media.caption || `Attached file: ${filename}`,
        attachments: [
          {
            filename,
            content: base64Content
          }
        ]
      };
      const res = await fetch(`${base}/emails`, {
        method: "POST",
        signal: options?.signal,
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      });
      if (!res.ok) {
        const err = await res.text();
        throw new Error(`Resend sendMedia failed (${res.status}): ${err}`);
      }
      const data = await res.json();
      return {
        messageId: data.id || `email_${Date.now()}`,
        chatId,
        timestamp: Date.now()
      };
    } else {
      const base = this.config.apiBaseUrl || "https://api.sendgrid.com/v3";
      const body = {
        personalizations: [{ to: [{ email: chatId }] }],
        from: { email: this.config.fromAddress },
        subject,
        content: [{ type: "text/plain", value: media.caption || `Attached file: ${filename}` }],
        attachments: [
          {
            content: base64Content,
            filename,
            type: media.mimeType || "application/octet-stream",
            disposition: "attachment"
          }
        ]
      };
      const res = await fetch(`${base}/mail/send`, {
        method: "POST",
        signal: options?.signal,
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      });
      if (!res.ok) {
        const err = await res.text();
        throw new Error(`SendGrid sendMedia failed (${res.status}): ${err}`);
      }
      return {
        messageId: res.headers.get("x-message-id") || `sg_${Date.now()}`,
        chatId,
        timestamp: Date.now()
      };
    }
  }
  handleInboundWebhook(rawPayload) {
    const from = rawPayload.from || rawPayload.envelope?.from || "unknown@domain.com";
    const text = rawPayload.text || rawPayload.body || rawPayload.subject || "";
    const id = rawPayload.id || `inbound_email_${Date.now()}`;
    const unified = {
      id,
      channel: "email",
      chat: {
        id: from,
        type: "dm"
      },
      sender: {
        id: from,
        name: rawPayload.sender_name || from
      },
      content: {
        text
      },
      timestamp: Date.now(),
      raw: rawPayload
    };
    this.dispatchMessage(unified);
    return unified;
  }
}
// src/channels/github/adapter.ts
var import_node_crypto5 = require("node:crypto");
class GitHubChannelAdapter extends BaseChannel {
  name = "github";
  config;
  apiUrl;
  constructor(config) {
    super();
    if (!config.token)
      throw new Error("GitHubAdapterConfig.token is required");
    this.config = config;
    this.apiUrl = (config.apiUrl || "https://api.github.com").replace(/\/+$/, "");
  }
  async connect(_signal) {
    const res = await fetch(`${this.apiUrl}/user`, {
      headers: this.headers(),
      signal: _signal
    });
    if (!res.ok)
      throw new Error(`GitHub auth failed: ${res.status}`);
    this.setConnected(true);
  }
  async disconnect() {
    this.setConnected(false);
  }
  verifyWebhookSignature(payload, signatureHeader) {
    if (!this.config.webhookSecret || !signatureHeader)
      return false;
    const expected = "sha256=" + import_node_crypto5.createHmac("sha256", this.config.webhookSecret).update(payload).digest("hex");
    const a = Buffer.from(expected);
    const b = Buffer.from(signatureHeader);
    if (a.length !== b.length)
      return false;
    return import_node_crypto5.timingSafeEqual(a, b);
  }
  normalizeWebhookEvent(event, payload) {
    const action = payload.action || "";
    const sender = payload.sender || {};
    const repo = payload.repository || {};
    const base = {
      channel: "github",
      sender: { id: String(sender.id || ""), name: sender.login || "" },
      chat: { id: `${repo.full_name || "unknown"}`, type: "group" },
      timestamp: Date.now(),
      raw: payload
    };
    switch (event) {
      case "issues": {
        const issue = payload.issue;
        if (!issue)
          return null;
        return {
          ...base,
          id: `issue-${issue.id}-${action}`,
          content: { text: `[Issue ${action}] #${issue.number} ${issue.title}

${issue.body || ""}`.trim() }
        };
      }
      case "issue_comment": {
        const comment = payload.comment;
        if (!comment)
          return null;
        return {
          ...base,
          id: `comment-${comment.id}`,
          content: { text: `[Comment on #${payload.issue?.number}] ${comment.body || ""}`.trim() }
        };
      }
      case "pull_request": {
        const pr = payload.pull_request;
        if (!pr)
          return null;
        return {
          ...base,
          id: `pr-${pr.id}-${action}`,
          content: { text: `[PR ${action}] #${pr.number} ${pr.title}

${pr.body || ""}`.trim() }
        };
      }
      case "pull_request_review": {
        const review = payload.review;
        if (!review)
          return null;
        return {
          ...base,
          id: `review-${review.id}`,
          content: { text: `[Review ${review.state}] on PR #${payload.pull_request?.number}

${review.body || ""}`.trim() }
        };
      }
      case "pull_request_review_comment": {
        const comment = payload.comment;
        if (!comment)
          return null;
        return {
          ...base,
          id: `pr-comment-${comment.id}`,
          content: { text: `[Review comment on PR #${payload.pull_request?.number}] ${comment.body || ""}`.trim() }
        };
      }
      case "discussion": {
        const disc = payload.discussion;
        if (!disc)
          return null;
        return {
          ...base,
          id: `discussion-${disc.id}-${action}`,
          content: { text: `[Discussion ${action}] ${disc.title}

${disc.body || ""}`.trim() }
        };
      }
      case "discussion_comment": {
        const comment = payload.comment;
        if (!comment)
          return null;
        return {
          ...base,
          id: `disc-comment-${comment.id}`,
          content: { text: `[Discussion comment] ${comment.body || ""}`.trim() }
        };
      }
      case "push": {
        const commits = payload.commits || [];
        const summary = commits.map((c) => `• ${c.message}`).join(`
`);
        return {
          ...base,
          id: `push-${payload.after?.slice(0, 7) || Date.now()}`,
          content: { text: `[Push to ${payload.ref}] ${commits.length} commit(s)
${summary}`.trim() }
        };
      }
      default:
        return null;
    }
  }
  async sendText(chatId, text, options) {
    const { owner, repo, number } = this.parseChatId(chatId);
    const res = await fetch(`${this.apiUrl}/repos/${owner}/${repo}/issues/${number}/comments`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({ body: text }),
      signal: options?.signal
    });
    if (!res.ok)
      throw new Error(`GitHub API error: ${res.status} ${await res.text()}`);
    const data = await res.json();
    return { messageId: String(data.id), chatId, timestamp: Date.now() };
  }
  async sendMedia(_chatId, _media, _options) {
    throw new Error("Use sendText with markdown image syntax: ![alt](url)");
  }
  async createIssue(repoFullName, title, body, labels, signal) {
    const [owner, repo] = repoFullName.split("/");
    const res = await fetch(`${this.apiUrl}/repos/${owner}/${repo}/issues`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({ title, body, labels }),
      signal
    });
    if (!res.ok)
      throw new Error(`GitHub API error: ${res.status} ${await res.text()}`);
    const data = await res.json();
    return { number: data.number, id: data.id, url: data.html_url };
  }
  headers() {
    return {
      Authorization: `Bearer ${this.config.token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28"
    };
  }
  parseChatId(chatId) {
    const match = chatId.match(/^([^/]+)\/([^#]+)#(\d+)$/);
    if (!match)
      throw new Error(`Invalid GitHub chatId format "${chatId}". Expected "owner/repo#number".`);
    return { owner: match[1], repo: match[2], number: match[3] };
  }
}
// src/channels/calendar/adapter.ts
class CalendarChannelAdapter extends BaseChannel {
  name = "calendar";
  config;
  apiUrl;
  calendarId;
  constructor(config) {
    super();
    if (!config.accessToken)
      throw new Error("CalendarAdapterConfig.accessToken is required");
    this.config = config;
    this.apiUrl = (config.apiUrl || "https://www.googleapis.com/calendar/v3").replace(/\/+$/, "");
    this.calendarId = config.defaultCalendarId || "primary";
  }
  async connect(_signal) {
    const res = await fetch(`${this.apiUrl}/users/me/calendarList?maxResults=1`, {
      headers: this.headers(),
      signal: _signal
    });
    if (!res.ok)
      throw new Error(`Calendar auth failed: ${res.status}`);
    this.setConnected(true);
  }
  async disconnect() {
    this.setConnected(false);
  }
  async sendText(chatId, text, options) {
    const calId = chatId || this.calendarId;
    const res = await fetch(`${this.apiUrl}/calendars/${encodeURIComponent(calId)}/events/quickAdd?text=${encodeURIComponent(text)}`, {
      method: "POST",
      headers: this.headers(),
      signal: options?.signal
    });
    if (!res.ok)
      throw new Error(`Calendar QuickAdd failed: ${res.status} ${await res.text()}`);
    const data = await res.json();
    return { messageId: String(data.id), chatId: calId, timestamp: Date.now() };
  }
  async sendMedia(chatId, media, options) {
    const calId = chatId || this.calendarId;
    let payloadStr;
    if (Buffer.isBuffer(media.source) || media.source instanceof Uint8Array) {
      payloadStr = Buffer.from(media.source).toString("utf8");
    } else if (typeof media.source === "string") {
      if (media.source.startsWith("data:")) {
        payloadStr = Buffer.from(media.source.split(",")[1], "base64").toString("utf8");
      } else {
        payloadStr = media.source;
      }
    } else {
      throw new Error("CalendarAdapter sendMedia requires a JSON buffer or string representing a CalendarEventPayload.");
    }
    const res = await fetch(`${this.apiUrl}/calendars/${encodeURIComponent(calId)}/events`, {
      method: "POST",
      headers: this.headers(),
      body: payloadStr,
      signal: options?.signal
    });
    if (!res.ok)
      throw new Error(`Calendar CreateEvent failed: ${res.status} ${await res.text()}`);
    const data = await res.json();
    return { messageId: String(data.id), chatId: calId, timestamp: Date.now() };
  }
  headers() {
    return {
      Authorization: `Bearer ${this.config.accessToken}`,
      "Content-Type": "application/json"
    };
  }
}
// src/channels/webhook-generic/adapter.ts
var import_node_crypto6 = require("node:crypto");
class WebhookGenericAdapter extends BaseChannel {
  name;
  config;
  constructor(config) {
    super();
    if (!config.serviceName)
      throw new Error("WebhookGenericAdapterConfig.serviceName is required");
    this.name = config.serviceName;
    this.config = config;
  }
  async connect(_signal) {
    this.setConnected(true);
  }
  async disconnect() {
    this.setConnected(false);
  }
  verifySignature(payload, headerValue) {
    if (!this.config.webhookSecret)
      return true;
    if (!headerValue)
      return false;
    const prefix = this.config.signaturePrefix || "";
    let cleanHeader = headerValue;
    if (prefix && cleanHeader.startsWith(prefix)) {
      cleanHeader = cleanHeader.slice(prefix.length);
    }
    const expected = import_node_crypto6.createHmac("sha256", this.config.webhookSecret).update(payload).digest("hex");
    const a = Buffer.from(expected);
    const b = Buffer.from(cleanHeader);
    if (a.length !== b.length)
      return false;
    return import_node_crypto6.timingSafeEqual(a, b);
  }
  getByPath(obj, path) {
    if (!path)
      return;
    return path.split(".").reduce((acc, part) => acc && acc[part] !== undefined ? acc[part] : undefined, obj);
  }
  normalizePayload(payload) {
    const fm = this.config.fieldMap || {};
    const messageId = String(this.getByPath(payload, fm.messageId) || payload.id || `wh-${Date.now()}`);
    const senderId = String(this.getByPath(payload, fm.senderId) || payload.sender || payload.user || "webhook");
    const senderName = String(this.getByPath(payload, fm.senderName) || senderId);
    const chatId = String(this.getByPath(payload, fm.chatId) || payload.channel || payload.room || "default");
    const text = String(this.getByPath(payload, fm.text) || payload.message || payload.text || JSON.stringify(payload));
    return {
      channel: this.name,
      id: messageId,
      sender: { id: senderId, name: senderName },
      chat: { id: chatId, type: "group" },
      content: { text },
      timestamp: Date.now(),
      raw: payload
    };
  }
  async sendText(chatId, text, _options) {
    if (this.config.sendHandler) {
      return await this.config.sendHandler(chatId, text);
    }
    return {
      messageId: `sent-${Date.now()}`,
      chatId,
      timestamp: Date.now()
    };
  }
  async sendMedia(chatId, _media, _options) {
    throw new Error(`sendMedia is not implemented for generic webhook service "${this.name}".`);
  }
}
// src/bridges/mcp/index.ts
var _groupManager = new GroupManager;
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
    },
    {
      name: "channelhub_send_email",
      description: "Send an email (via Resend, SendGrid, or registered Email channel) with full support for HTML, Subject, CC, and BCC.",
      parameters: {
        type: "object",
        required: ["to", "subject", "text"],
        properties: {
          to: {
            type: "string",
            description: "Recipient email address"
          },
          subject: {
            type: "string",
            description: "Email subject line"
          },
          text: {
            type: "string",
            description: "Plain text body of the email"
          },
          html: {
            type: "string",
            description: "Optional rich HTML body"
          },
          cc: {
            type: "array",
            items: { type: "string" },
            description: "Optional list of CC email addresses"
          },
          bcc: {
            type: "array",
            items: { type: "string" },
            description: "Optional list of BCC email addresses"
          },
          replyTo: {
            type: "string",
            description: "Optional reply-to email address"
          }
        }
      }
    },
    {
      name: "channelhub_github_comment",
      description: "Post a comment on a GitHub issue or PR. chatId format: owner/repo#number",
      parameters: {
        type: "object",
        required: ["chatId", "text"],
        properties: {
          chatId: {
            type: "string",
            description: 'Target in "owner/repo#number" format, e.g. "theowlops/channelhub#42"'
          },
          text: {
            type: "string",
            description: "Comment body (markdown supported)"
          }
        }
      }
    },
    {
      name: "channelhub_github_create_issue",
      description: "Create a new GitHub issue on a repository.",
      parameters: {
        type: "object",
        required: ["repo", "title"],
        properties: {
          repo: {
            type: "string",
            description: 'Repository in "owner/repo" format'
          },
          title: {
            type: "string",
            description: "Issue title"
          },
          body: {
            type: "string",
            description: "Issue body (markdown)"
          },
          labels: {
            type: "array",
            items: { type: "string" },
            description: "Labels to apply"
          }
        }
      }
    },
    {
      name: "channelhub_calendar_quick_add",
      description: "Create a Google Calendar event using natural language, e.g. 'Meeting with Ryan tomorrow at 2pm'.",
      parameters: {
        type: "object",
        required: ["text"],
        properties: {
          calendarId: {
            type: "string",
            description: 'Calendar ID (defaults to "primary")'
          },
          text: {
            type: "string",
            description: "Natural language event description"
          }
        }
      }
    },
    {
      name: "channelhub_web_search",
      description: "Search the web for real-time information (free, 0-config via DuckDuckGo HTML). Can optionally extract deep markdown content for the top results.",
      parameters: {
        type: "object",
        required: ["query"],
        properties: {
          query: { type: "string", description: "Search query" },
          limit: { type: "number", description: "Max results (default: 5)" },
          deepExtract: { type: "boolean", description: "If true, extracts full readable markdown for top 3 results using Jina Reader (takes longer but provides exact context)" },
          provider: { type: "string", description: "duckduckgo (default), tavily, or brave" },
          apiKey: { type: "string", description: "API key for tavily/brave if not using duckduckgo" }
        }
      }
    },
    {
      name: "channelhub_web_extract",
      description: "Extract full readable markdown content from any web URL (bypasses JS rendering and most paywalls via Jina Reader).",
      parameters: {
        type: "object",
        required: ["url"],
        properties: {
          url: { type: "string", description: "Target URL" }
        }
      }
    },
    {
      name: "channelhub_video_create_short",
      description: "Convert any video into TikTok/Shorts (9:16 vertical) format using professional blurred background backdrop, cropping, or padding via local FFmpeg.",
      parameters: {
        type: "object",
        required: ["input", "output"],
        properties: {
          input: { type: "string", description: "Path to input video" },
          output: { type: "string", description: "Path to save vertical video" },
          mode: { type: "string", description: "blur-backdrop (default), crop-center, or fit-pad" }
        }
      }
    },
    {
      name: "channelhub_video_burn_subtitles",
      description: "Burn subtitles (SRT/VTT string or file path) directly onto video frames using local FFmpeg.",
      parameters: {
        type: "object",
        required: ["input", "output", "subtitles"],
        properties: {
          input: { type: "string", description: "Path to input video" },
          output: { type: "string", description: "Path to save output video" },
          subtitles: { type: "string", description: "Subtitles text (SRT/VTT) or absolute path to a .srt file" }
        }
      }
    },
    {
      name: "channelhub_video_add_watermark",
      description: "Add a logo/image watermark to the video.",
      parameters: {
        type: "object",
        required: ["input", "watermark", "output"],
        properties: {
          input: { type: "string", description: "Path to input video" },
          watermark: { type: "string", description: "Path to image logo" },
          output: { type: "string", description: "Path to save output video" },
          position: { type: "string", description: "top-right, top-left, bottom-right, bottom-left, center" },
          opacity: { type: "number", description: "0.1 to 1.0 (default 0.9)" }
        }
      }
    },
    {
      name: "channelhub_messenger_get_threads",
      description: "Scrapes recent conversations and group chats from personal Messenger to retrieve thread IDs and names for the bot.",
      parameters: {
        type: "object",
        properties: {
          limit: { type: "number", description: "Maximum number of threads to fetch (default: 30)" }
        }
      }
    },
    {
      name: "channelhub_messenger_get_history",
      description: "Scrapes recent message history from a specific Messenger thread ID.",
      parameters: {
        type: "object",
        required: ["threadId"],
        properties: {
          threadId: { type: "string", description: "The thread or conversation ID" },
          limit: { type: "number", description: "Max messages to retrieve (default: 20)" }
        }
      }
    },
    {
      name: "channelhub_messenger_get_members",
      description: "Scrapes visible group members or participant information for a specific Messenger group thread.",
      parameters: {
        type: "object",
        required: ["threadId"],
        properties: {
          threadId: { type: "string", description: "The group thread ID" }
        }
      }
    },
    {
      name: "channelhub_messenger_get_user_profile",
      description: "Retrieves user or thread details including name, avatar URL, and ID from Messenger.",
      parameters: {
        type: "object",
        required: ["userId"],
        properties: {
          userId: { type: "string", description: "The Facebook user ID or thread ID" }
        }
      }
    },
    {
      name: "channelhub_group_recap",
      description: "Summarize recent group discussion into key topics, decisions, and action items.",
      parameters: {
        type: "object",
        required: ["messages"],
        properties: {
          messages: {
            type: "array",
            description: "Array of message objects: [{ sender?: string, text: string }]"
          }
        }
      }
    },
    {
      name: "channelhub_group_check_spam",
      description: "Inspect a message for spam, flood, blacklisted links, or repetitive text.",
      parameters: {
        type: "object",
        required: ["senderId", "text"],
        properties: {
          senderId: { type: "string", description: "Unique identifier of the message author" },
          text: { type: "string", description: "Message content" },
          disallowLinks: { type: "boolean", description: "Flag to completely forbid URLs" }
        }
      }
    },
    {
      name: "channelhub_group_welcome_challenge",
      description: "Generate a welcome message and captcha math challenge for a newly joined group member.",
      parameters: {
        type: "object",
        required: ["chatId", "memberId", "memberName"],
        properties: {
          chatId: { type: "string", description: "Group conversation ID" },
          memberId: { type: "string", description: "ID of the joining member" },
          memberName: { type: "string", description: "Display name of the member" },
          groupRules: { type: "string", description: "Optional group rules text" }
        }
      }
    },
    {
      name: "channelhub_group_verify_challenge",
      description: "Verify a member's answer to the gatekeeper captcha challenge.",
      parameters: {
        type: "object",
        required: ["chatId", "memberId", "answer"],
        properties: {
          chatId: { type: "string", description: "Group conversation ID" },
          memberId: { type: "string", description: "ID of the member" },
          answer: { type: "string", description: "Member's answer to the math captcha" }
        }
      }
    },
    {
      name: "channelhub_group_leaderboard",
      description: "Get the most active members leaderboard for a group chat.",
      parameters: {
        type: "object",
        required: ["chatId"],
        properties: {
          chatId: { type: "string", description: "Group conversation ID" },
          limit: { type: "number", description: "Max rankings to return (default: 10)" }
        }
      }
    },
    {
      name: "channelhub_messenger_recall_message",
      description: "Recall / unsend a message sent by the bot on Messenger.",
      parameters: {
        type: "object",
        properties: {
          chatId: { type: "string", description: "Conversation ID or thread ID" },
          messageId: { type: "string", description: "Message ID (for Page Graph API) or omitted (for Personal DOM)" }
        }
      }
    },
    {
      name: "channelhub_group_check_profanity",
      description: "Check if text contains toxic words or profanity.",
      parameters: {
        type: "object",
        required: ["text"],
        properties: {
          text: { type: "string", description: "Message content to inspect" },
          badWords: { type: "array", description: "Optional custom list of prohibited words" }
        }
      }
    },
    {
      name: "channelhub_group_issue_warning",
      description: "Issue a warning strike to a member. Recommends kick if reaching strike limit (default: 3).",
      parameters: {
        type: "object",
        required: ["chatId", "userId", "reason"],
        properties: {
          chatId: { type: "string", description: "Group conversation ID" },
          userId: { type: "string", description: "ID of the offending member" },
          reason: { type: "string", description: "Reason for the warning" },
          maxStrikes: { type: "number", description: "Maximum strikes before kick (default: 3)" }
        }
      }
    },
    {
      name: "channelhub_group_create_poll",
      description: "Create an interactive voting poll for the group.",
      parameters: {
        type: "object",
        required: ["chatId", "creatorId", "question", "options"],
        properties: {
          chatId: { type: "string", description: "Group conversation ID" },
          creatorId: { type: "string", description: "User ID creating the poll" },
          question: { type: "string", description: "Poll question" },
          options: { type: "array", description: "Array of choice options (string[])" }
        }
      }
    },
    {
      name: "channelhub_group_cast_vote",
      description: "Cast a vote in an active group poll.",
      parameters: {
        type: "object",
        required: ["pollId", "voterId", "optionIndex"],
        properties: {
          pollId: { type: "string", description: "Poll ID" },
          voterId: { type: "string", description: "ID of the voter" },
          optionIndex: { type: "number", description: "0-based index of chosen option" }
        }
      }
    },
    {
      name: "channelhub_group_get_poll_results",
      description: "Get real-time vote results and percentages for a group poll.",
      parameters: {
        type: "object",
        required: ["pollId"],
        properties: {
          pollId: { type: "string", description: "Poll ID" }
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
      case "channelhub_send_email": {
        const ch = hub.getChannel("email");
        if (!ch)
          throw new Error("Email channel adapter not registered in ChannelHub. Register EmailChannelAdapter first.");
        const res = await ch.sendText(args.to, args.text, {
          subject: args.subject,
          html: args.html,
          cc: args.cc,
          bcc: args.bcc,
          replyTo: args.replyTo
        });
        return {
          content: [{ type: "text", text: JSON.stringify(res, null, 2) }]
        };
      }
      case "channelhub_github_comment": {
        const ch = hub.getChannel("github");
        if (!ch)
          throw new Error("GitHub channel adapter not registered.");
        const res = await ch.sendText(args.chatId, args.text);
        return {
          content: [{ type: "text", text: JSON.stringify(res, null, 2) }]
        };
      }
      case "channelhub_github_create_issue": {
        const ch = hub.getChannel("github");
        if (!ch || !ch.createIssue)
          throw new Error("GitHub channel adapter not registered.");
        const res = await ch.createIssue(args.repo, args.title, args.body, args.labels);
        return {
          content: [{ type: "text", text: JSON.stringify(res, null, 2) }]
        };
      }
      case "channelhub_calendar_quick_add": {
        const ch = hub.getChannel("calendar");
        if (!ch)
          throw new Error("Calendar channel adapter not registered.");
        const res = await ch.sendText(args.calendarId || "primary", args.text);
        return {
          content: [{ type: "text", text: JSON.stringify(res, null, 2) }]
        };
      }
      case "channelhub_web_search": {
        const res = await WebResearch.search(args.query, {
          limit: args.limit,
          deepExtract: args.deepExtract,
          provider: args.provider,
          apiKey: args.apiKey
        });
        return {
          content: [{ type: "text", text: JSON.stringify(res, null, 2) }]
        };
      }
      case "channelhub_web_extract": {
        const res = await WebResearch.extract(args.url);
        return {
          content: [{ type: "text", text: res.content }]
        };
      }
      case "channelhub_video_create_short": {
        const res = await VideoEngine.createShort({
          input: args.input,
          output: args.output,
          mode: args.mode
        });
        return {
          content: [{ type: "text", text: JSON.stringify(res, null, 2) }]
        };
      }
      case "channelhub_video_burn_subtitles": {
        const res = await VideoEngine.burnSubtitles({
          input: args.input,
          output: args.output,
          subtitles: args.subtitles
        });
        return {
          content: [{ type: "text", text: JSON.stringify(res, null, 2) }]
        };
      }
      case "channelhub_video_add_watermark": {
        const res = await VideoEngine.addWatermark({
          input: args.input,
          watermark: args.watermark,
          output: args.output,
          position: args.position,
          opacity: args.opacity
        });
        return {
          content: [{ type: "text", text: JSON.stringify(res, null, 2) }]
        };
      }
      case "channelhub_messenger_get_threads": {
        const adapter = hub.getChannel("messenger");
        if (!adapter || typeof adapter.getThreads !== "function") {
          throw new Error("Messenger personal adapter is not registered or does not support getThreads");
        }
        const threads = await adapter.getThreads(args.limit || 30);
        return {
          content: [{ type: "text", text: JSON.stringify(threads, null, 2) }]
        };
      }
      case "channelhub_messenger_get_history": {
        const adapter = hub.getChannel("messenger");
        if (!adapter || typeof adapter.getThreadHistory !== "function") {
          throw new Error("Messenger personal adapter is not registered or does not support getThreadHistory");
        }
        const history = await adapter.getThreadHistory(args.threadId, args.limit || 20);
        return {
          content: [{ type: "text", text: JSON.stringify(history, null, 2) }]
        };
      }
      case "channelhub_messenger_get_members": {
        const adapter = hub.getChannel("messenger");
        if (!adapter || typeof adapter.getGroupMembers !== "function") {
          throw new Error("Messenger personal adapter is not registered or does not support getGroupMembers");
        }
        const members = await adapter.getGroupMembers(args.threadId);
        return {
          content: [{ type: "text", text: JSON.stringify(members, null, 2) }]
        };
      }
      case "channelhub_messenger_get_user_profile": {
        const adapter = hub.getChannel("messenger");
        if (!adapter || typeof adapter.getUserProfile !== "function") {
          throw new Error("Messenger personal adapter is not registered or does not support getUserProfile");
        }
        const profile = await adapter.getUserProfile(args.userId);
        return {
          content: [{ type: "text", text: JSON.stringify(profile, null, 2) }]
        };
      }
      case "channelhub_group_recap": {
        const recap = _groupManager.generateRecap(args.messages || []);
        return {
          content: [{ type: "text", text: JSON.stringify(recap, null, 2) }]
        };
      }
      case "channelhub_group_check_spam": {
        const result = _groupManager.checkSpam(args.senderId, args.text, {
          disallowLinks: args.disallowLinks
        });
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
        };
      }
      case "channelhub_group_welcome_challenge": {
        const challenge = _groupManager.registerNewMember(args.chatId, { id: args.memberId, name: args.memberName }, args.groupRules);
        return {
          content: [{ type: "text", text: JSON.stringify(challenge, null, 2) }]
        };
      }
      case "channelhub_group_verify_challenge": {
        const valid = _groupManager.verifyMember(args.chatId, args.memberId, args.answer);
        return {
          content: [{ type: "text", text: JSON.stringify({ success: valid }, null, 2) }]
        };
      }
      case "channelhub_group_leaderboard": {
        const leaderboard = _groupManager.getLeaderboard(args.chatId, args.limit || 10);
        return {
          content: [{ type: "text", text: JSON.stringify(leaderboard, null, 2) }]
        };
      }
      case "channelhub_messenger_recall_message": {
        const adapter = hub.getChannel("messenger");
        if (!adapter || typeof adapter.recallMessage !== "function") {
          throw new Error("Messenger adapter is not registered or does not support recallMessage");
        }
        const success = await adapter.recallMessage(args.chatId, args.messageId);
        return {
          content: [{ type: "text", text: JSON.stringify({ success }, null, 2) }]
        };
      }
      case "channelhub_group_check_profanity": {
        const res = _groupManager.checkProfanity(args.text, args.badWords);
        return {
          content: [{ type: "text", text: JSON.stringify(res, null, 2) }]
        };
      }
      case "channelhub_group_issue_warning": {
        const res = _groupManager.issueWarning(args.chatId, args.userId, args.reason, args.maxStrikes);
        return {
          content: [{ type: "text", text: JSON.stringify(res, null, 2) }]
        };
      }
      case "channelhub_group_create_poll": {
        const poll = _groupManager.createPoll(args.chatId, args.creatorId, args.question, args.options);
        return {
          content: [{ type: "text", text: JSON.stringify(poll, null, 2) }]
        };
      }
      case "channelhub_group_cast_vote": {
        const success = _groupManager.castVote(args.pollId, args.voterId, args.optionIndex);
        return {
          content: [{ type: "text", text: JSON.stringify({ success }, null, 2) }]
        };
      }
      case "channelhub_group_get_poll_results": {
        const results = _groupManager.getPollResults(args.pollId);
        return {
          content: [{ type: "text", text: JSON.stringify(results, null, 2) }]
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
// src/bridges/webhook/index.ts
var import_node_http2 = require("node:http");
var import_node_crypto7 = require("node:crypto");

class WebhookBridge {
  hub;
  config;
  server = null;
  sseClients = new Set;
  constructor(hub, config = {}) {
    this.hub = hub;
    this.config = {
      port: config.port ?? 8788,
      host: config.host ?? "127.0.0.1",
      pathPrefix: config.pathPrefix ?? "",
      apiKey: config.apiKey ?? process.env.CHANNELHUB_API_KEY ?? "",
      maxBodySize: config.maxBodySize ?? 1024 * 1024
    };
    hub.onMessage(async (ctx) => {
      this.broadcastSse(ctx.message);
    });
  }
  async start() {
    this.server = import_node_http2.createServer((req, res) => this.handle(req, res));
    await new Promise((resolve) => {
      this.server.listen(this.config.port, this.config.host, () => resolve());
    });
  }
  async stop() {
    for (const client of this.sseClients) {
      client.end();
    }
    this.sseClients.clear();
    if (this.server) {
      await new Promise((resolve, reject) => {
        this.server.close((err) => err ? reject(err) : resolve());
      });
      this.server = null;
    }
  }
  path(req) {
    const url = req.url || "/";
    const bare = url.split("?")[0];
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
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return false;
    }
    const token = authHeader.slice(7).trim();
    const tokenBuf = Buffer.from(token);
    const keyBuf = Buffer.from(this.config.apiKey);
    if (tokenBuf.length !== keyBuf.length)
      return false;
    return import_node_crypto7.timingSafeEqual(tokenBuf, keyBuf);
  }
  async handle(req, res) {
    const p = this.path(req);
    try {
      if (req.method === "GET" && p === "/health") {
        return this.json(res, 200, { ok: true });
      }
      if (!this.authenticate(req)) {
        return this.json(res, 401, { error: "Unauthorized: Invalid or missing API key" });
      }
      if (req.method === "GET" && p === "/channels") {
        return this.json(res, 200, { channels: this.hub.listChannels() });
      }
      if (req.method === "POST" && p === "/send") {
        const body = await this.readJson(req);
        const ch = this.hub.getChannel(body.channel);
        if (!ch)
          return this.json(res, 404, { error: `Channel '${body.channel}' not found` });
        const result = await ch.sendText(body.chatId, body.text, { replyToId: body.replyToId });
        return this.json(res, 200, result);
      }
      if (req.method === "POST" && p === "/react") {
        const body = await this.readJson(req);
        const ch = this.hub.getChannel(body.channel);
        if (!ch)
          return this.json(res, 404, { error: `Channel '${body.channel}' not found` });
        if (!ch.addReaction)
          return this.json(res, 400, { error: "Channel does not support reactions" });
        await ch.addReaction(body.chatId, body.messageId, body.emoji);
        return this.json(res, 200, { success: true });
      }
      if (req.method === "GET" && p === "/events") {
        if (this.sseClients.size >= 50) {
          return this.json(res, 429, { error: "Too many active SSE connections" });
        }
        return this.handleSse(res);
      }
      this.json(res, 404, { error: "Not found" });
    } catch (err) {
      const isPayloadTooLarge = err.message === "Payload too large";
      const status = isPayloadTooLarge ? 413 : 500;
      const safeError = isPayloadTooLarge ? "Payload too large. Request body exceeds configured limit." : "An internal server error occurred while processing the request.";
      this.json(res, status, { error: safeError });
    }
  }
  handleSse(res) {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive"
    });
    res.write(`data: ${JSON.stringify({ type: "connected" })}

`);
    this.sseClients.add(res);
    res.on("close", () => this.sseClients.delete(res));
  }
  broadcastSse(msg) {
    const { raw, ...safeMessage } = msg;
    const payload = `data: ${JSON.stringify(safeMessage)}

`;
    for (const client of this.sseClients) {
      client.write(payload);
    }
  }
  json(res, status, body) {
    const data = JSON.stringify(body);
    res.writeHead(status, {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(data)
    });
    res.end(data);
  }
  readJson(req) {
    return new Promise((resolve, reject) => {
      const chunks = [];
      let totalBytes = 0;
      req.on("data", (c) => {
        totalBytes += c.length;
        if (totalBytes > this.config.maxBodySize) {
          req.destroy(new Error("Payload too large"));
          return;
        }
        chunks.push(c);
      });
      req.on("end", () => {
        try {
          resolve(JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"));
        } catch (err) {
          reject(err);
        }
      });
      req.on("error", reject);
    });
  }
}
// src/commands/modules/general.ts
var heartCommand = {
  name: "heart",
  description: "React with heart to the message",
  execute: async ({ bot, msg, threadId, isGroup }) => {
    if (msg.msgId && msg.cliMsgId) {
      await bot.addReaction(threadId, msg.msgId, msg.cliMsgId, ZaloReactions.HEART, isGroup);
    }
  }
};
var hahaCommand = {
  name: "haha",
  description: "React with laugh to the message",
  execute: async ({ bot, msg, threadId, isGroup }) => {
    if (msg.msgId && msg.cliMsgId) {
      await bot.addReaction(threadId, msg.msgId, msg.cliMsgId, ZaloReactions.HAHA, isGroup);
    }
  }
};
var pingCommand = {
  name: "ping",
  description: "Check latency and bot health status",
  execute: async ({ bot, threadId, isGroup }) => {
    await bot.sendText(threadId, "Pong! ChannelHub module online ⚡", [], isGroup);
  }
};

// src/commands/modules/group.ts
var kickCommand = {
  name: "kick",
  description: "Kick member from group via @mention tag",
  groupOnly: true,
  execute: async ({ bot, msg, threadId }) => {
    if (!msg.mentions || msg.mentions.length === 0) {
      await bot.sendText(threadId, "Must tag user to kick: !kick @user", [], true);
      return;
    }
    for (const target of msg.mentions) {
      console.log(`[Mod] Kicking UID: ${target.uid} from group ${threadId}`);
      await bot.removeUserFromGroup(threadId, target.uid);
    }
    await bot.sendText(threadId, "Member kicked successfully.", [], true);
  }
};
var renameCommand = {
  name: "rename",
  description: "Rename chat group",
  groupOnly: true,
  execute: async ({ bot, args, threadId }) => {
    const newName = args.join(" ").trim();
    if (!newName) {
      await bot.sendText(threadId, "Usage: !rename <New Name>", [], true);
      return;
    }
    await bot.changeGroupName(threadId, newName);
    await bot.sendText(threadId, `Group renamed to: ${newName}`, [], true);
  }
};
var groupInfoCommand = {
  name: "groupinfo",
  description: "View detailed group chat information",
  groupOnly: true,
  execute: async ({ bot, threadId }) => {
    const info = await bot.getGroupInfo(threadId);
    const gData = info?.gridInfoMap?.[threadId];
    if (gData) {
      const text = `Name: ${gData.name}
Members: ${gData.totalMember}/${gData.maxMember}
Owner UID: ${gData.creatorId}`;
      await bot.sendText(threadId, text, [], true);
    }
  }
};

// src/commands/modules/reaction.ts
var EMOJI_TO_REACTION = {
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
  "\uD83D\uDE34": ZaloReactions.SLEEPY,
  heart: ZaloReactions.HEART,
  like: ZaloReactions.LIKE,
  haha: ZaloReactions.HAHA,
  wow: ZaloReactions.WOW,
  cry: ZaloReactions.CRY,
  angry: ZaloReactions.ANGRY
};
var reactCommand = {
  name: "react",
  aliases: ["emoji", "drop"],
  description: "React to message with emoji: !react ❤️ or quote a message and type !react \uD83D\uDE02",
  execute: async ({ bot, msg, args, threadId, isGroup }) => {
    const emojiInput = args[0] || "❤️";
    const reactionCode = EMOJI_TO_REACTION[emojiInput] || emojiInput;
    if (msg.quote && msg.quote.msgId && msg.quote.cliMsgId) {
      await bot.addReaction(threadId, msg.quote.msgId, msg.quote.cliMsgId, reactionCode, isGroup);
      return;
    }
    if (msg.msgId && msg.cliMsgId) {
      await bot.addReaction(threadId, msg.msgId, msg.cliMsgId, reactionCode, isGroup);
    }
  }
};

// src/commands/router.ts
class CommandRouter {
  commands = new Map;
  constructor() {
    this.register(pingCommand);
    this.register(heartCommand);
    this.register(hahaCommand);
    this.register(kickCommand);
    this.register(renameCommand);
    this.register(groupInfoCommand);
    this.register(reactCommand);
  }
  register(cmd) {
    this.commands.set(cmd.name.toLowerCase(), cmd);
    if (cmd.aliases) {
      for (const alias of cmd.aliases) {
        this.commands.set(alias.toLowerCase(), cmd);
      }
    }
  }
  async handleMessage(bot, msg) {
    const content = typeof msg.content === "string" ? msg.content.trim() : "";
    const prefix = CONFIG.PERSONAL.DEFAULT_PREFIX;
    if (!content.startsWith(prefix))
      return;
    const parts = content.slice(prefix.length).trim().split(/\s+/);
    const commandName = parts[0]?.toLowerCase();
    const args = parts.slice(1);
    const command = this.commands.get(commandName);
    if (!command)
      return;
    const isGroup = msg.type === 1;
    const threadId = msg.threadId;
    if (command.groupOnly && !isGroup) {
      await bot.sendText(threadId, "This command can only be used in group chats.", [], false);
      return;
    }
    const ctx = {
      bot,
      msg,
      args,
      isGroup,
      threadId
    };
    try {
      await command.execute(ctx);
    } catch (err) {
      console.error(`[Router Error] Command error ${commandName}:`, err);
      await bot.sendText(threadId, `Error executing command: ${err.message}`, [], isGroup);
    }
  }
}
