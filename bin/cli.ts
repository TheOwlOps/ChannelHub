#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const command = args[0] || "help";

function printHelp() {
  console.log(`
ChannelHub CLI 🦉 - Multi-Channel Messaging Toolkit

Usage:
  channelhub <command> [options]

Commands:
  doctor              Diagnose environment, configuration and channel credentials
  start               Start ChannelHub agent/bot services
  login:zalo          Scan QR code to authenticate personal Zalo account
  login:messenger     Authenticate personal Facebook Messenger account via browser
  version             Display version information
  help                Display this help message
`);
}

async function runDoctor() {
  console.log("ChannelHub Diagnostics 🩺\n");
  console.log(`Node.js Runtime : ${process.version}`);
  console.log(`Platform        : ${process.platform} (${process.arch})`);
  console.log(`Working Directory: ${process.cwd()}\n`);

  // Check Zalo credentials
  const zaloCred = path.resolve(process.cwd(), "credentials.json");
  if (fs.existsSync(zaloCred)) {
    console.log("✅ Zalo Personal Credentials: Found (credentials.json)");
  } else {
    console.log("⚪ Zalo Personal Credentials: Not found (Run 'channelhub login:zalo')");
  }

  // Check Messenger credentials
  const msgCred = path.resolve(process.cwd(), "messenger.credentials.json");
  if (fs.existsSync(msgCred)) {
    console.log("✅ Messenger Credentials    : Found (messenger.credentials.json)");
  } else {
    console.log("⚪ Messenger Credentials    : Not found (Run 'channelhub login:messenger')");
  }

  // Check Environment Variables
  const envVars = [
    "TELEGRAM_BOT_TOKEN",
    "DISCORD_BOT_TOKEN",
    "SLACK_BOT_TOKEN",
    "MESSENGER_PAGE_TOKEN",
    "ZALO_OA_ACCESS_TOKEN",
    "TIKTOK_ACCESS_TOKEN",
    "TIKTOK_CLIENT_SECRET",
  ];
  console.log("\nConfigured Environment Variables:");
  for (const v of envVars) {
    if (process.env[v]) {
      console.log(`  - ${v}: Set (length ${process.env[v]!.length})`);
    } else {
      console.log(`  - ${v}: Not set`);
    }
  }
}

async function main() {
  switch (command) {
    case "doctor":
      await runDoctor();
      break;

    case "login:zalo":
    case "login": {
      console.log("[ChannelHub CLI] Initiating Zalo QR login...");
      try {
        const { Zalo } = await import("zca-js");
        const zalo = new Zalo();
        const api = await zalo.loginQR({}, (qr: any) => {
          console.log("[ChannelHub] Scan QR code to authenticate:", qr);
        });
        const creds = api.getContext();
        const outPath = path.resolve(process.cwd(), "credentials.json");
        fs.writeFileSync(outPath, JSON.stringify(creds, null, 2));
        console.log(`✅ Zalo authentication successful! Saved to: ${outPath}`);
      } catch (err: any) {
        console.error("Zalo login failed:", err.message || err);
        process.exit(1);
      }
      break;
    }

    case "login:messenger": {
      console.log("[ChannelHub CLI] Launching Messenger browser login...");
      try {
        const { chromium } = await import("playwright");
        const browser = await chromium.launch({ headless: false, args: ["--disable-notifications"] });
        const context = await browser.newContext();
        const page = await context.newPage();
        await page.goto("https://www.facebook.com/", { waitUntil: "domcontentloaded" });
        console.log("Waiting for user to log in on the browser window...");

        while (true) {
          const cookies = await context.cookies();
          const cUser = cookies.find((c: any) => c.name === "c_user");
          if (cUser && cUser.value) {
            const outPath = path.resolve(process.cwd(), "messenger.credentials.json");
            fs.writeFileSync(
              outPath,
              JSON.stringify({ userId: cUser.value, cookies, savedAt: new Date().toISOString() }, null, 2)
            );
            console.log(`✅ Messenger authenticated! User ID: ${cUser.value}. Saved to: ${outPath}`);
            await browser.close();
            break;
          }
          await new Promise((r) => setTimeout(r, 1500));
        }
      } catch (err: any) {
        console.error("Messenger login failed:", err.message || err);
        process.exit(1);
      }
      break;
    }

    case "start": {
      console.log("[ChannelHub CLI] Starting ChannelHub runtime...");
      try {
        const { ChannelHub } = await import("../src/core/hub.js");
        const hub = new ChannelHub();
        console.log("ChannelHub core initialized. Registering configured adapters...");
        await hub.startAll();
        console.log("ChannelHub is active and running.");
      } catch (err: any) {
        console.error("Failed to start ChannelHub:", err.message || err);
        process.exit(1);
      }
      break;
    }

    case "version":
    case "-v":
    case "--version": {
      const pkgPath = path.resolve(__dirname, "../../package.json");
      let ver = "1.5.0";
      if (fs.existsSync(pkgPath)) {
        try {
          ver = JSON.parse(fs.readFileSync(pkgPath, "utf8")).version || ver;
        } catch {}
      }
      console.log(`@theowlops/channelhub v${ver}`);
      break;
    }

    case "help":
    case "-h":
    case "--help":
    default:
      printHelp();
      break;
  }
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
