# ZaloHub 🚀

> Bộ công cụ tự động hóa Zalo mã nguồn mở — hỗ trợ **168+ thao tác** trên **Tài khoản Cá Nhân** lẫn **Zalo Official Account**.  
> Runtime: **Bun** (TypeScript native, không cần build thủ công).

---

## ⚡ Cài đặt nhanh (1 bước)

### Windows
```bat
git clone https://github.com/TheOwlOps/ZaloHub.git
cd ZaloHub
setup.bat
```

### macOS / Linux
```bash
git clone https://github.com/TheOwlOps/ZaloHub.git
cd ZaloHub
chmod +x setup.sh && ./setup.sh
```

> Script tự động kiểm tra và cài Bun, cài dependencies, tạo file `.env`, sau đó mở menu quản lý.

---

## 🔧 Yêu cầu hệ thống

| | |
|---|---|
| Runtime | [Bun](https://bun.sh) ≥ 1.3 (tự cài nếu chưa có) |
| Node.js | Không cần |
| OS | Windows 10+, macOS, Linux |

---

## 📋 Cấu hình `.env`

Sau khi clone, sửa file `.env` (được tạo tự động từ `.env.example`):

```env
# Chỉ cần điền nếu dùng Zalo OA
ZALO_OA_APP_ID=
ZALO_OA_APP_SECRET=
ZALO_OA_ACCESS_TOKEN=
ZALO_OA_REFRESH_TOKEN=

# Đường dẫn lưu session cá nhân (mặc định: ./credentials.json)
ZALO_CRED_PATH=./credentials.json
```

---

## 🚀 Chạy thủ công (nếu không dùng script)

```bash
# Cài thư viện
bun install

# Đăng nhập tài khoản Zalo cá nhân (quét QR 1 lần)
bun run login:personal

# Chạy bot (hot-reload khi phát triển)
bun run dev

# Chạy production (bundle tối ưu)
bun run build && bun run start:prod
```

---

## 🗂 Cấu trúc dự án

```
ZaloHub/
├── src/
│   ├── config/             # Biến môi trường & hằng số
│   ├── personal/           # Bot Zalo Cá Nhân — 157 thao tác (zca-js)
│   ├── oa/                 # Zalo Official Account — 11 thao tác (OpenAPI v3)
│   ├── commands/           # Command Router + các module lệnh
│   │   └── modules/        # general.ts, group.ts, reaction.ts,...
│   └── index.ts            # Entrypoint tổng
├── scripts/
│   └── login_personal.ts   # Script quét QR
├── dist/                   # Output build (bun build)
├── .env.example
├── setup.bat               # Cài & chạy 1 click — Windows
├── setup.sh                # Cài & chạy 1 click — macOS/Linux
└── tsconfig.json
```

---

## ✨ Thao tác hỗ trợ (168+)

### Zalo Cá Nhân (157 thao tác)
- 📩 **Tin nhắn & Media**: gửi text, ảnh, video, voice, link, card, chuyển tiếp, thu hồi, xóa tin
- 😄 **Thả Emoji / Reaction**: `❤️ 👍 😂 😮 😡 💩 😘 🌹 👎 😍 🤔 😉 🎂 💣 👌 ✌️ 🙏 👏 😎 👋 😴`
- 🎭 **Sticker**: tìm kiếm, gửi sticker theo category
- 👥 **Quản trị nhóm**: kick, add, chặn, phân quyền phó, đổi avatar/tên, giải tán, rời nhóm, tạo link mời
- 📊 **Poll / Bình chọn**: tạo, vote, thêm phương án, khóa poll
- 🔔 **Nhắc hẹn & Ghi chú**: reminder, note board
- 👤 **Bạn bè & Profile**: kết bạn, hủy bạn, chặn, tra SĐT/username, đổi biệt danh, avatar
- 💬 **Hội thoại nâng cao**: tin nhắn tự xóa (TTL), ghim/ẩn/lưu trữ chat
- 🤖 **Tự động hóa**: tin nhắn nhanh (Quick Reply), Auto Reply

### Zalo OA (11 thao tác)
- Gửi tin CS (text/ảnh), tin giao dịch/khuyến mãi theo template
- Quản lý follower, gán nhãn phân khúc khách hàng
- Upload media, refresh OAuth2 token tự động

---

## ⚠️ Lưu ý bảo mật

- File `credentials.json` (session cá nhân) và `.env` **KHÔNG được commit lên git** — đã có trong `.gitignore`.
- Đây là **reverse API** không chính thức (zca-js) — dùng tài khoản phụ để tránh rủi ro bị hạn chế.

---

## 📄 License

MIT License
