#!/usr/bin/env bun
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const command = args[0] || "help";

switch (command) {
  case "login": {
    console.log("[ZaloHub CLI] Quet ma QR de dang nhap...");
    import("../scripts/login_personal.ts");
    break;
  }
  case "start": {
    console.log("[ZaloHub CLI] Khoi dong Bot...");
    import("../src/index.ts");
    break;
  }
  case "help":
  default: {
    console.log(`
ZaloHub CLI - SDK & Bot Manager

Usage:
  zalohub <command>

Commands:
  login      Quet ma QR dang nhap tai khoan ca nhan
  start      Khoi dong Bot service
  help       Xem huong dan
`);
    break;
  }
}
