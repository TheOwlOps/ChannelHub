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

// src/channels/calendar/index.ts
var exports_calendar = {};
__export(exports_calendar, {
  CalendarChannelAdapter: () => CalendarChannelAdapter
});
module.exports = __toCommonJS(exports_calendar);

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
