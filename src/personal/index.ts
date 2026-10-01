import fs from "node:fs";
import { CONFIG } from "../config/env.js";
import { ZaloPersonalBot } from "./client.js";

export async function initPersonalBot(): Promise<{ bot: ZaloPersonalBot; api: any }> {
  if (!fs.existsSync(CONFIG.PERSONAL.CRED_PATH)) {
    throw new Error(`Missing ${CONFIG.PERSONAL.CRED_PATH}. Run 'bun run login:personal' to scan QR code.`);
  }

  const { Zalo } = await import("zca-js");
  const creds = JSON.parse(fs.readFileSync(CONFIG.PERSONAL.CRED_PATH, "utf-8"));
  const zalo = new Zalo();
  const api = await zalo.login(creds);

  const bot = new ZaloPersonalBot(api);
  const ownId = await bot.getOwnId();
  console.log(`[Personal Bot] Logged in successfully. Bot UID: ${ownId}`);

  return { bot, api };
}
