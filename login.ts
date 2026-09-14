import { Zalo } from "zca-js";
import fs from "node:fs";
import path from "node:path";

const CRED_PATH = path.resolve("./credentials.json");

const zalo = new Zalo();

console.log("[Bun ZaloHub] Dang tao QR login... Quet ma bang app Zalo tren dien thoai:");
const api = await zalo.loginQR({}, (qr) => {
  console.log("[Bun ZaloHub] QR Path hoac Link:", qr);
});

const creds = api.getContext();
fs.writeFileSync(CRED_PATH, JSON.stringify(creds, null, 2));
console.log(`[Bun ZaloHub] Dang nhap thanh cong! Credentials da luu tai: ${CRED_PATH}`);
process.exit(0);
