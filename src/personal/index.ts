import fs from "node:fs";
import { Zalo } from "zca-js";
import { CONFIG } from "../config/env.js";
import { ZaloPersonalBot } from "./client.js";

export async function initPersonalBot(): Promise<{ bot: ZaloPersonalBot; api: any }> {
  if (!fs.existsSync(CONFIG.PERSONAL.CRED_PATH)) {
    throw new Error(`Chưa có file ${CONFIG.PERSONAL.CRED_PATH}. Chạy 'bun run login:personal' để quét mã QR.`);
  }

  const creds = JSON.parse(fs.readFileSync(CONFIG.PERSONAL.CRED_PATH, "utf-8"));
  const zalo = new Zalo();
  const api = await zalo.login(creds);

  const bot = new ZaloPersonalBot(api);
  const ownId = await bot.getOwnId();
  console.log(`[Personal Bot] Đã đăng nhập. Bot UID: ${ownId}`);

  return { bot, api };
}
