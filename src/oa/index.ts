import { ZaloOABot } from "./client.js";

export * from "./client.js";

export function initOABot(): ZaloOABot {
  return new ZaloOABot();
}
