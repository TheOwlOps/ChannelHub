import { initPersonalBot } from "./personal/index.js";
import { initOABot } from "./oa/index.js";
import { CommandRouter } from "./commands/router.js";

async function bootstrap() {
  console.log("=========================================");
  console.log("🚀 KHỞI ĐỘNG HỆ THỐNG ZALOHUB (BUN RUNTIME)");
  console.log("=========================================");

  // 1. Khởi tạo Zalo OA Bot
  const oaBot = initOABot();
  console.log("✅ Zalo OA Module đã sẵn sàng.");

  // 2. Khởi tạo Zalo Personal Bot & Command Router
  try {
    const { bot: personalBot, api } = await initPersonalBot();
    const router = new CommandRouter();

    api.listener.on("message", async (msg: any) => {
      // Xử lý commands qua router tách biệt
      await router.handleMessage(personalBot, msg);
    });

    api.listener.start();
    console.log("✅ Zalo Personal Bot đang chạy và lắng nghe tin nhắn!");
  } catch (err: any) {
    console.warn("⚠️ Personal bot chưa khởi động (có thể chưa login):", err.message);
    console.log("👉 Chạy `bun run login:personal` để quét mã QR.");
  }
}

bootstrap().catch(console.error);
