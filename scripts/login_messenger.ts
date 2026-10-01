import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

interface MessengerCredentials {
  personal: {
    userId: string;
    appState: any[];
  };
  fanpages: Array<{
    id: string;
    name: string;
    accessToken?: string;
  }>;
  savedAt: string;
}

const OUT_PATH = path.resolve(process.cwd(), "messenger.credentials.json");

async function main() {
  console.log("==================================================");
  console.log("  ChannelHub - Facebook & Messenger Login Wizard");
  console.log("==================================================");
  console.log("1. Launching Chromium browser...");

  // Launch browser in visible (headful) mode so user can interact
  const browser = await chromium.launch({
    headless: false,
    args: ["--disable-notifications"],
  });

  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    viewport: { width: 1000, height: 750 },
  });

  const page = await context.newPage();
  console.log("2. Loading Facebook login page...");
  await page.goto("https://www.facebook.com/", { waitUntil: "domcontentloaded" });

  console.log("\n[INSTRUCTIONS]:");
  console.log("- Enter username and password in the browser window.");
  console.log("- Or scan QR code / approve authentication on mobile Facebook app.");
  console.log("- Waiting for authenticated login session...\n");

  let loggedInUserId = "";

  // Poll for login by checking c_user cookie
  while (true) {
    try {
      const cookies = await context.cookies();
      const cUserCookie = cookies.find((c) => c.name === "c_user");

      if (cUserCookie && cUserCookie.value) {
        loggedInUserId = cUserCookie.value;
        console.log(`[SUCCESS] Detected authenticated session for User ID: ${loggedInUserId}`);
        break;
      }
    } catch {
      // Browser might have been closed by user
    }
    await new Promise((r) => setTimeout(r, 1500));
  }

  console.log("3. Extracting AppState / Cookies for personal account...");
  const rawCookies = await context.cookies();
  const appState = rawCookies.map((c) => ({
    key: c.name,
    value: c.value,
    domain: c.domain,
    path: c.path,
    hostOnly: !c.domain.startsWith("."),
    creation: new Date().toISOString(),
    lastAccessed: new Date().toISOString(),
  }));

  console.log("4. Scanning managed Fanpages...");
  const fanpages: Array<{ id: string; name: string; accessToken?: string }> = [];

  try {
    // Navigate to pages list
    await page.goto("https://www.facebook.com/pages/?category=your_pages", {
      waitUntil: "domcontentloaded",
      timeout: 10000,
    });
    await page.waitForTimeout(3000);

    // Extract pages from DOM
    const pageElements = await page.$$eval("a[href*='/pages/']", (links) => {
      return links.map((l) => ({
        name: l.textContent?.trim() || "",
        href: l.getAttribute("href") || "",
      }));
    });

    for (const p of pageElements) {
      if (p.name && p.href) {
        fanpages.push({
          id: p.href,
          name: p.name,
        });
      }
    }
  } catch (err) {
    console.log("Could not auto-scan Fanpages from DOM, skipping step:", err);
  }

  const credentials: MessengerCredentials = {
    personal: {
      userId: loggedInUserId,
      appState,
    },
    fanpages,
    savedAt: new Date().toISOString(),
  };

  fs.writeFileSync(OUT_PATH, JSON.stringify(credentials, null, 2), "utf-8");
  console.log(`\n✅ Session credentials saved to: ${OUT_PATH}`);
  console.log("You can provide this session to the Messenger Channel Adapter.");

  await browser.close();
  process.exit(0);
}

main().catch((err) => {
  console.error("Login failed:", err);
  process.exit(1);
});
