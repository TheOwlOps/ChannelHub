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
  console.log("  ChannelHub - Trình Đăng Nhập Facebook & Messenger");
  console.log("==================================================");
  console.log("1. Đang mở trình duyệt Chromium...");

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
  console.log("2. Đang tải trang đăng nhập Facebook...");
  await page.goto("https://www.facebook.com/", { waitUntil: "domcontentloaded" });

  console.log("\n[HƯỚNG DẪN]:");
  console.log("- Nhập tài khoản, mật khẩu trên cửa sổ trình duyệt.");
  console.log("- Hoặc quét mã QR / phê duyệt xác thực trên ứng dụng Facebook di động.");
  console.log("- Hệ thống đang chờ phiên đăng nhập...\n");

  let loggedInUserId = "";

  // Poll for login by checking c_user cookie
  while (true) {
    try {
      const cookies = await context.cookies();
      const cUserCookie = cookies.find((c) => c.name === "c_user");

      if (cUserCookie && cUserCookie.value) {
        loggedInUserId = cUserCookie.value;
        console.log(`[SUCCESS] Phát hiện đăng nhập thành công cho User ID: ${loggedInUserId}`);
        break;
      }
    } catch {
      // Browser might have been closed by user
    }
    await new Promise((r) => setTimeout(r, 1500));
  }

  console.log("3. Đang trích xuất AppState / Cookies cho tài khoản cá nhân...");
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

  console.log("4. Đang quét danh sách Fanpage quản lý...");
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
    console.log("Không thể quét tự động Fanpage từ DOM, bỏ qua bước này:", err);
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
  console.log(`\n✅ Đã lưu phiên đăng nhập tại: ${OUT_PATH}`);
  console.log("Bạn có thể cấu hình Session này cho Messenger Channel Adapter.");

  await browser.close();
  process.exit(0);
}

main().catch((err) => {
  console.error("Lỗi đăng nhập:", err);
  process.exit(1);
});
