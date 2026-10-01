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
   - **WebhookBridge**: 暴露统一 HTTP 接收端点供平台 Webhook 回调。
   - **MCP Bridge**: 提供标准 MCP stdio 守护进程，让 AI 模型自主调用发信发图能力。

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

## 📄 开源许可证

本项目基于 [MIT 许可证](LICENSE) 发布。由 TheOwlOps 核心开发团队构建维护。