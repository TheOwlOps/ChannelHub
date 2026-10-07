<div align="center">
  <img src="./assets/banner.svg" alt="ChannelHub Banner" width="100%" />
</div>

<div align="center">
  <img src="https://img.shields.io/npm/v/@theowlops/channelhub.svg?style=for-the-badge&logo=npm" alt="NPM Version" />
  <img src="https://img.shields.io/github/license/TheOwlOps/ChannelHub?style=for-the-badge" alt="License" />
  <img src="https://img.shields.io/npm/dw/@theowlops/channelhub?style=for-the-badge" alt="Downloads" />
</div>

# ChannelHub 🦉 (中文文档)

[English](./README.md) | [Tiếng Việt](./README.vi.md) | [中文](./README.zh.md)

**ChannelHub** 是一款专为 AI Agent、独立 Bot 与企业自动化设计的超轻量多渠道消息 SDK（Multi-channel Messaging SDK）。它将市面上主流的即时通讯平台（Facebook Messenger、Zalo、Telegram、Discord、Slack）复杂的接口抹平为统一的统一规范：**UnifiedMessage**。

## 🌟 核心功能

- 🎯 **统一抽象接口 (Unified API)**: 一次编写，处处运行。无论底层是 Telegram、Zalo 还是 Messenger，业务逻辑只需面对标准的消息对象与上下文。
- 🤖 **原生 AI 驱动设计 (AI-Native)**:
  - **SmartStreamer 流式引擎**: 针对 LLM 生成流自动分句缓冲发送，或在支持编辑的渠道（Telegram/Discord）进行原生打字机式平滑更新。
  - **开箱即用 MCP Server**: 内置 10 个标准 JSON-RPC Tools（stdio 传输），可无缝接入 Claude Desktop、Hermes Agent 及任何支持 MCP 协议的智能体。
- 📦 **全媒体与特殊附件支持 (Rich Media & Attachments)**:
  - 支持发送图片、音频、长视频和各类文档。
  - 自动处理大文件：针对 Meta Messenger 支持高达 100MB 视频断点续传（Resumable Upload），并在文件超出限制时提供友好的防御拦截。
  - 原生 **动图 (Sticker)** 与 **GIF 动图** 发送引擎。
  - 鲁棒解析来自 Webhook 的复杂非结构化附件（地理位置、Reel、帖子转发分享等）。
- 🔐 **严密的企业级安全防线 (Security Hardened)**:
  - 路径遍历（Path Traversal）与空字节（Null Bytes）清洗过滤。
  - Webhook 本地回环绑定（127.0.0.1）与 Bearer Token 鉴权。
  - 1MB 内存防 DoS 截断保护。

---

## 🛠 架构原理 (Architecture)

ChannelHub 采用经典的 **Hub & Adapter** 架构：

```
                ┌────────────────────────────────┐
                │           ChannelHub           │
                │        (Core Event Bus)        │
                └───────┬───────┬───────┬────────┘
                        │       │       │
      ┌─────────────────┼───────┼───────┼─────────────────┐
      │                 │       │       │                 │
      ▼                 ▼       ▼       ▼                 ▼
TelegramAdapter  ZaloAdapter  Discord  Slack  MessengerAdapter
      │                 │       │       │                 │
  Bot API            zca-js    Bot API Socket API    Graph API / Webhook
```

1. **适配器层 (Adapter Layer)**: 每个平台实现 `IChannelAdapter`，负责抹平各平台特有协议，并把接收到的 Webhook/WebSocket 原始消息标准化为 `UnifiedMessage`。
2. **中心调度 (ChannelHub Engine)**: 统一管理适配器生命周期，路由分发 `message` 事件与 `MessageContext`。
3. **上下文对象 (MessageContext)**: 提供简易统一的 `ctx.reply()`, `ctx.sendMedia()`, `ctx.react()` 等操作，解耦业务逻辑与通讯渠道。
4. **外部桥接 (Bridges)**:
   - **WebhookBridge**: 提供统一 HTTP 接收端点供平台 Webhook 回调。
   - **MCP Bridge**: 提供标准 MCP stdio 守护进程，让 AI 模型自主调用发信发图能力。

---

## 📊 渠道能力矩阵 (Capability Matrix)

| 平台 (Channel) | 发送消息 (Outbound) | 接收消息 (Inbound) | 多媒体附件 | 表情回应 | 打字机流式输出 | 当前支持状态 |
| :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| **Zalo** | ✅ Full API (Personal/OA) | ✅ 原生轮询与监听 | ✅ 图片/视频/文档/原生表情 | ✅ 完美支持 | ✅ 分句流式缓冲 + 正在输入 | **双向稳定 (Inbound/Outbound)** |
| **Telegram** | ✅ Full Bot API | ✅ Polling & Webhook Handler | ✅ 图片/视频/文档/原生表情 | ✅ 原生 Reaction | ✅ 原生 In-place 实时编辑 | **双向稳定 (Inbound/Outbound)** |
| **Messenger** | ✅ Graph API v19.0 (100MB) | ⚡ Webhook Normalizer (`normalizeEvent`) | ✅ 图片/视频/文档/原生表情 | ⏳ 计划于 v2.1 | ⚡ 打字机指示器 | **稳定出向 + 标准化** |
| **Discord** | ✅ Bot REST API | ⚡ Webhook Normalizer (`normalizeEvent`) | ✅ 嵌入式与附件支持 | ✅ 原生 Reaction | ⚡ 原生 In-place 实时编辑 | **稳定出向 + 标准化** |
| **Slack** | ✅ Web API / Chat | ⚡ Events Normalizer (`normalizeEvent`) | ✅ 文件与媒体上传 | ⏳ 计划于 v2.1 | ⚡ 打字机指示器 | **稳定出向 + 标准化** |

---

## 🚀 快速上手

### 1. 安装

```bash
# 推荐使用 Bun
bun add @theowlops/channelhub

# 使用 NPM
npm install @theowlops/channelhub
```

### 2. 注册渠道并监听消息

```typescript
import { ChannelHub } from "@theowlops/channelhub/core";
import { MessengerChannelAdapter } from "@theowlops/channelhub/channels/messenger";
import { TelegramChannelAdapter } from "@theowlops/channelhub/channels/telegram";

const hub = new ChannelHub();

// 注册 Telegram 适配器
hub.register(new TelegramChannelAdapter({
  botToken: "YOUR_TELEGRAM_BOT_TOKEN"
}));

// 注册 Messenger 适配器
hub.register(new MessengerChannelAdapter({
  pageId: "YOUR_PAGE_ID",
  pageAccessToken: "YOUR_PAGE_ACCESS_TOKEN",
  verifyToken: "YOUR_WEBHOOK_VERIFY_TOKEN"
}));

// 统一监听所有渠道的消息
hub.on("message", async (ctx) => {
  console.log(`[${ctx.channel}] ${ctx.message.sender.name}: ${ctx.message.content.text}`);
  
  // 便捷回复
  await ctx.reply(`收到！你发送了：${ctx.message.content.text}`);
});

await hub.startAll();
```

### 3. 多媒体与表情包发送

```typescript
// 发送远程图片
await ctx.sendMedia({
  type: "image",
  source: "https://example.com/photo.png",
  caption: "展示图片"
});

// 发送本地大视频 (内置路径安全检查与分片续传)
await ctx.sendMedia({
  type: "video",
  source: "/data/videos/demo.mp4"
});

// 发送原生动图 Sticker 与 GIF
await ctx.sendSticker("12345678"); // Messenger / Zalo sticker ID 或 Telegram file_id
await ctx.sendGif("https://media.giphy.com/media/funny.gif", "开心！");
```

### 4. 账号自动化登录 (Messenger & Zalo)

对于个人账号，无需繁琐创建开发者应用：

- **Messenger 个人账号自动捕获 Cookie**:
  ```bash
  bun run login:messenger
  ```
  该命令将自动拉起 Chromium 登录 Facebook，完成登录后自动持久化会话至 `messenger.credentials.json`。
- **Zalo 个人号扫码**:
  ```bash
  bun run zalohub --login
  ```

### 5. AI MCP Server 配置

作为独立 MCP 工具服务端运行：
```bash
channelhub-mcp
```

在 `claude_desktop_config.json` 中配置：
```json
{
  "mcpServers": {
    "channelhub": {
      "command": "bun",
      "args": ["run", "channelhub-mcp"]
    }
  }
}
```

**提供的 10 个 MCP Tools:**
- `channelhub_list_channels`: 查看已连接的渠道
- `channelhub_get_status`: 查询渠道存活健康状态
- `channelhub_send_message`: 发送普通文本/引用回复
- `channelhub_send_media`: 发送图片、音频、视频或文件
- `channelhub_send_sticker`: 发送原生贴纸 (Telegram/Zalo/Messenger)
- `channelhub_send_gif`: 发送动态 GIF 图
- `channelhub_send_typing`: 触发"正在输入..."指示器
- `channelhub_edit_message`: 修改已发出的消息内容
- `channelhub_add_reaction`: 为消息添加表情回应
- `channelhub_broadcast`: 跨渠道多用户多群组一键广播

---

## 📊 实时仪表盘 (Live Dashboard)

内置零依赖的 Web 仪表盘：无需数据库、无需外部服务，**一行代码**即可启用。

```ts
import { ChannelHub } from "@theowlops/channelhub";

const hub = new ChannelHub();
// ... 注册渠道适配器

await hub.dashboard(); // 📊 → http://127.0.0.1:8790 — 完成！
// 端口 / apiKey / dataFile 均为可选参数：
// await hub.dashboard({ port: 3000, apiKey: process.env.DASHBOARD_KEY, dataFile: "./stats.json" });
```

实时展示收发消息计数、活跃用户、错误数、24 小时柱状图、14 天流量趋势、7×24 活动热力图以及 Top 渠道 / Top 用户排行，页面每 5 秒自动刷新；`GET /api/stats` 返回相同的 JSON 快照供自建工具使用。

**安全模型**：默认仅绑定 `127.0.0.1`（无需密钥）；绑定到非回环地址时必须设置 `apiKey`（或环境变量 `CHANNELHUB_DASHBOARD_KEY`），否则 API 一律返回 401（fail-closed）。配置密钥后，端点使用 timing-safe 的 Bearer 校验保护。

---

## 📄 开源许可证

本项目基于 [MIT 许可证](LICENSE) 发布。由 TheOwlOps 核心开发团队构建维护。