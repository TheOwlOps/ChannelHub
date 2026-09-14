# ZaloHub - Modular Toolkit & SDK Automation (>160 Thao tác)

Bộ công cụ tự động hóa toàn diện hệ sinh thái Zalo chạy trên **Bun runtime**, chia làm 2 phân hệ rõ ràng:
1. **Personal Bot (`zca-js` v2.2.0)**: **157 thao tác** (reverse web API).
2. **Official Account (`Zalo OA API v3`)**: **11 thao tác** (Open API chính thức).

Tổng cộng: **168 thao tác** được đóng gói dạng method TypeScript chuẩn type.

---

## 1. Cấu trúc thư mục

```
D:\zalohub/
├── src/
│   ├── config/             # Biến môi trường (.env) & hằng số hệ thống
│   │   └── env.ts
│   ├── personal/           # Phân hệ Zalo Cá Nhân (157 methods)
│   │   ├── client.ts       # ZaloPersonalBot class
│   │   └── index.ts        # Lifecycle init
│   ├── oa/                 # Phân hệ Zalo OA (11 methods)
│   │   ├── client.ts       # ZaloOABot class
│   │   └── index.ts
│   ├── commands/           # Bộ Router lệnh điều khiển độc lập
│   │   ├── types.ts        # Command interface
│   │   ├── router.ts       # Điều phối lệnh theo prefix (!ping, !kick,...)
│   │   └── modules/        # Module lệnh mở rộng
│   │       ├── general.ts
│   │       └── group.ts
│   └── index.ts            # Entrypoint tích hợp
├── scripts/
│   └── login_personal.ts   # Quét QR đăng nhập tài khoản cá nhân
├── .env.example
└── package.json
```

---

## 2. Hướng dẫn sử dụng

```bash
cd D:\zalohub
bun install
```

### Đăng nhập Zalo cá nhân (quét QR 1 lần):
```bash
bun run login:personal
```

### Khởi chạy hệ thống:
```bash
bun run start       # Chạy thường
bun run dev         # Chạy hot-reload (tự restart khi đổi code)
```

---

## 3. Tổng hợp 168 thao tác có sẵn

### A. Zalo Cá Nhân (`src/personal/client.ts` - 157 thao tác)
- **Tin nhắn & Media (14)**: `sendMessage`, `sendText`, `sendImage`, `sendVideo`, `sendVoice`, `sendLink`, `sendCard`, `sendBankCard`, `forwardMessage`, `recallMessage`, `deleteMessage`, `deleteChat`, `parseLink`, `scanURL`.
- **Reaction & Tương tác (7)**: `addReaction` (tim/like/haha/sad...), `sendTypingEvent`, `sendSeenEvent`, `sendDeliveredEvent`, `addUnreadMark`, `removeUnreadMark`, `getUnreadMark`.
- **Stickers & File đính kèm (6)**: `sendSticker`, `getStickers`, `searchSticker`, `getStickersDetail`, `getStickerCategoryDetail`, `uploadAttachment`.
- **Quản trị nhóm & Link mời (26)**: `createGroup`, `disperseGroup`, `leaveGroup`, `changeGroupName`, `changeGroupAvatar`, `changeGroupOwner`, `addGroupDeputy`, `removeGroupDeputy`, `addUserToGroup`, `removeUserFromGroup` (kick), `addGroupBlockedMember`, `removeGroupBlockedMember`, `getGroupBlockedMember`, `getGroupInfo`, `getAllGroups`, `getGroupMembersInfo`, `getPendingGroupMembers`, `reviewPendingMemberRequest`, `updateGroupSettings`, `upgradeGroupToCommunity`, `inviteUserToGroups`, `getGroupLinkInfo`, `getGroupLinkDetail`, `enableGroupLink`, `disableGroupLink`, `joinGroupLink`, `getGroupInviteBoxList`, `getGroupInviteBoxInfo`, `joinGroupInviteBox`, `deleteGroupInviteBox`.
- **Bình chọn - Polls (6)**: `createPoll`, `votePoll`, `addPollOptions`, `lockPoll`, `sharePoll`, `getPollDetail`.
- **Bảng tin, Nhắc hẹn & Ghi chú (10)**: `createNote`, `editNote`, `getListBoard`, `getFriendBoardList`, `createReminder`, `editReminder`, `removeReminder`, `getReminder`, `getListReminder`, `getReminderResponses`.
- **Bạn bè & Kết bạn (18)**: `getAllFriends`, `getCloseFriends`, `getFriendOnlines`, `getFriendRecommendations`, `getRelatedFriendGroup`, `sendFriendRequest`, `acceptFriendRequest`, `rejectFriendRequest`, `undoFriendRequest`, `getSentFriendRequest`, `getFriendRequestStatus`, `removeFriend`, `changeFriendAlias`, `removeFriendAlias`, `getAliasList`, `blockUser`, `unblockUser`, `blockViewFeed`.
- **Profile & Tìm kiếm người dùng (16)**: `findUserByPhone`, `findUserByUsername`, `getMultiUsersByPhones`, `getUserInfo`, `getOwnId`, `fetchAccountInfo`, `getBizAccount`, `lastOnline`, `updateProfile`, `updateProfileBio`, `changeAccountAvatar`, `deleteAvatar`, `reuseAvatar`, `getAvatarList`, `getFullAvatar`, `getAvatarUrlProfile`.
- **Cài đặt hội thoại (13)**: `getGroupChatHistory`, `setMute`, `getMute`, `setPinnedConversations`, `getPinConversations`, `setHiddenConversations`, `getHiddenConversations`, `updateHiddenConversPin`, `resetHiddenConversPin`, `updateAutoDeleteChat`, `getAutoDeleteChat`, `updateArchivedChatList`, `getArchivedChatList`.
- **Tin nhắn nhanh & Tự trả lời (8)**: `addQuickMessage`, `updateQuickMessage`, `removeQuickMessage`, `getQuickMessageList`, `createAutoReply`, `updateAutoReply`, `deleteAutoReply`, `getAutoReplyList`.
- **Nhãn & Khách hàng (2)**: `getLabels`, `updateLabels`.
- **Danh mục sản phẩm & Shop (10)**: `createCatalog`, `updateCatalog`, `deleteCatalog`, `getCatalogList`, `registerCatalog`, `createProductCatalog`, `updateProductCatalog`, `deleteProductCatalog`, `getProductCatalogList`, `uploadProductPhoto`.
- **Tài khoản ngân hàng Zalo (5)**: `createBankAccount`, `updateBankAccount`, `deleteBankAccount`, `getListBank`, `getListBankAccount`.
- **Hệ thống & Session (12)**: `getSettings`, `updateSettings`, `updateActiveStatus`, `updateLang`, `getListDevice`, `getQR`, `getCookie`, `getContext`, `keepAlive`, `lostFocus`, `sendReport`, `custom`.

### B. Zalo Official Account (`src/oa/client.ts` - 11 thao tác)
- **Tư vấn (CS)**: `sendConsultantText`, `sendConsultantImage`.
- **Thông báo & Giao dịch**: `sendTransactionMessage`, `sendPromotionMessage`.
- **Quản lý khách**: `getProfile`, `getFollowers`.
- **Nhãn phân loại OA**: `getTags`, `tagUser`, `removeTag`.
- **Media & Xác thực**: `uploadImage`, `refreshAccessToken` (OAuth2).
