// src/core/adapter.ts
import { EventEmitter } from "node:events";

class BaseChannel extends EventEmitter {
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
    }
  };
}
// src/core/hub.ts
class ChannelHub {
  _channels = new Map;
  _bus = new ChannelEventBus;
  _messageHandlers = [];
  register(channel) {
    if (this._channels.has(channel.name)) {
      throw new Error(`Channel '${channel.name}' is already registered in ChannelHub.`);
    }
    this._channels.set(channel.name, channel);
    channel.on("message", (msg) => {
      this._bus.emitMessage(msg);
      const ctx = createMessageContext(msg, channel);
      for (const handler of this._messageHandlers) {
        Promise.resolve(handler(ctx)).catch((err) => {
          this._bus.emitError(err);
        });
      }
    });
    channel.on("error", (err) => {
      this._bus.emitError(err);
    });
    return this;
  }
  getChannel(name) {
    return this._channels.get(name);
  }
  listChannels() {
    return Array.from(this._channels.keys());
  }
  onMessage(handler) {
    this._messageHandlers.push(handler);
    return this;
  }
  async start() {
    const promises = Array.from(this._channels.values()).map((ch) => ch.connect());
    await Promise.all(promises);
  }
  async stop() {
    const promises = Array.from(this._channels.values()).map((ch) => ch.disconnect());
    await Promise.all(promises);
  }
}
export {
  BaseChannel,
  ChannelEventBus,
  ChannelHub,
  createMessageContext
};
