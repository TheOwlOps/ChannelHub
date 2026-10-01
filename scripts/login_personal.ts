import { Zalo } from "zca-js";
import fs from "node:fs";
import { CONFIG } from "../src/config/env.js";

const zalo = new Zalo();

console.log("[ChannelHub Login] Fetching QR code... Please scan with Zalo app:");
const api = await zalo.loginQR({}, (qr) => {
  console.log("[ChannelHub Login] QR Path / Data:", qr);
});

const creds = api.getContext();
fs.writeFileSync(CONFIG.PERSONAL.CRED_PATH, JSON.stringify(creds, null, 2));
console.log(`[ChannelHub Login] Authenticated successfully! Saved to: ${CONFIG.PERSONAL.CRED_PATH}`);
process.exit(0);
