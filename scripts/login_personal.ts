import { Zalo } from "zca-js";
import fs from "node:fs";
import { CONFIG } from "../src/config/env.js";

const zalo = new Zalo();

console.log("[ZaloHub Login] Đang lấy mã QR login... Hãy dùng app Zalo quét mã:");
const api = await zalo.loginQR({}, (qr) => {
  console.log("[ZaloHub Login] QR Path / Data:", qr);
});

const creds = api.getContext();
fs.writeFileSync(CONFIG.PERSONAL.CRED_PATH, JSON.stringify(creds, null, 2));
console.log(`[ZaloHub Login] Đăng nhập thành công! Đã lưu tại: ${CONFIG.PERSONAL.CRED_PATH}`);
process.exit(0);
