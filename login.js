import { Zalo } from "zca-js";
import fs from "fs";
import path from "path";

const CRED_PATH = path.resolve("./credentials.json");

const zalo = new Zalo();

console.log("[ZaloHub] Dang tao QR login... Quet ma bang app Zalo tren dien thoai:");
const api = await zalo.loginQR({}, (qr) => {
  console.log("[ZaloHub] QR Path hoac Link:", qr);
});

const creds = api.getContext();
fs.writeFileSync(CRED_PATH, JSON.stringify(creds, null, 2));
console.log(`[ZaloHub] Dang nhap thanh cong! Credentials da luu tai: ${CRED_PATH}`);
process.exit(0);
