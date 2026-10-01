import { ZaloThreadType as ThreadType, ZaloReactions as Reactions, type Reactions as ReactionType } from "../channels/zalo/types.js";
import type { AttachmentSource } from "zca-js";

export class ZaloPersonalBot {
  public api: any;

  constructor(apiInstance: any) {
    this.api = apiInstance;
  }

  async sendMessage(message: any, threadId: string, type: ThreadType = ThreadType.Group) {
    return await this.api.sendMessage(message, threadId, type);
  }

  async sendText(threadId: string, text: string, mentions: any[] = [], isGroup = true) {
    const type = isGroup ? ThreadType.Group : ThreadType.User;
    return await this.api.sendMessage({ msg: text, mentions }, threadId, type);
  }

  async sendImage(threadId: string, imagePath: string | string[], caption = "", isGroup = true) {
    const type = isGroup ? ThreadType.Group : ThreadType.User;
    const attachments = Array.isArray(imagePath) ? imagePath : [imagePath];
    return await this.api.sendMessage({ msg: caption, attachments: attachments as AttachmentSource[] }, threadId, type);
  }

  async sendVideo(threadId: string, videoPath: string, caption = "", isGroup = true) {
    const type = isGroup ? ThreadType.Group : ThreadType.User;
    return await this.api.sendVideo({ video: videoPath, msg: caption }, threadId, type);
  }

  async sendVoice(threadId: string, voicePath: string, isGroup = true) {
    const type = isGroup ? ThreadType.Group : ThreadType.User;
    return await this.api.sendVoice(voicePath, threadId, type);
  }

  async sendLink(threadId: string, link: string, isGroup = true) {
    const type = isGroup ? ThreadType.Group : ThreadType.User;
    return await this.api.sendLink(link, threadId, type);
  }

  async sendCard(threadId: string, cardPayload: any, isGroup = true) {
    const type = isGroup ? ThreadType.Group : ThreadType.User;
    return await this.api.sendCard(cardPayload, threadId, type);
  }

  async sendBankCard(threadId: string, payload: any, isGroup = true) {
    const type = isGroup ? ThreadType.Group : ThreadType.User;
    return await this.api.sendBankCard(payload, threadId, type);
  }

  async forwardMessage(threadId: string, msgId: string, type: ThreadType = ThreadType.Group) {
    return await this.api.forwardMessage(msgId, threadId, type);
  }

  async recallMessage(msgObj: any) {
    return await this.api.undo(msgObj);
  }

  async deleteMessage(msgObj: any, onlyMe = false) {
    return await this.api.deleteMessage(msgObj, onlyMe);
  }

  async deleteChat(threadId: string, type: ThreadType = ThreadType.Group) {
    return await this.api.deleteChat(threadId, type);
  }

  async parseLink(link: string) {
    return await this.api.parseLink(link);
  }

  async scanURL(url: string) {
    return await this.api.scanURL(url);
  }

  // ==========================================
  // 2. REACTIONS & STATUS (THẢ TIM, TYPING, SEEN)
  // ==========================================
  // 3. THẢ EMOJI / REACTION VÀO TIN NHẮN
  // emojiOrReaction: pass Reactions enum (e.g. Reactions.HEART) or standard emoji character (e.g. "❤️", "👍", "😆", "💩",...)
  async addReaction(
    threadId: string,
    msgId: string,
    cliMsgId: string,
    emojiOrReaction: ReactionType | string = Reactions.HEART,
    isGroup = true
  ) {
    const type = isGroup ? ThreadType.Group : ThreadType.User;
    
    // Unicode Emoji to Zalo Reaction code mapping
    const unicodeMap: Record<string, ReactionType> = {
      "❤️": Reactions.HEART,
      "💖": Reactions.HEART,
      "👍": Reactions.LIKE,
      "😆": Reactions.HAHA,
      "😂": Reactions.TEARS_OF_JOY,
      "😮": Reactions.WOW,
      "😭": Reactions.CRY,
      "😡": Reactions.ANGRY,
      "😘": Reactions.KISS,
      "💩": Reactions.SHIT,
      "🌹": Reactions.ROSE,
      "💔": Reactions.BROKEN_HEART,
      "👎": Reactions.DISLIKE,
      "😍": Reactions.LOVE,
      "🤔": Reactions.CONFUSED,
      "😉": Reactions.WINK,
      "☀️": Reactions.SUN,
      "🎂": Reactions.BIRTHDAY,
      "💣": Reactions.BOMB,
      "👌": Reactions.OK,
      "✌️": Reactions.PEACE,
      "🙏": Reactions.PRAY,
      "👏": Reactions.HANDCLAP,
      "😎": Reactions.SUNGLASSES,
      "👋": Reactions.BYE,
      "😴": Reactions.SLEEPY,
    };

    const targetReaction = unicodeMap[emojiOrReaction] || emojiOrReaction;

    return await this.api.addReaction(targetReaction, {
      data: { msgId, cliMsgId },
      threadId,
      type
    });
  }

  async sendTypingEvent(threadId: string, isTyping = true, isGroup = true) {
    const type = isGroup ? ThreadType.Group : ThreadType.User;
    return await this.api.sendTypingEvent(threadId, isTyping, type);
  }

  async sendSeenEvent(threadId: string, msgId: string, isGroup = true) {
    const type = isGroup ? ThreadType.Group : ThreadType.User;
    return await this.api.sendSeenEvent(threadId, msgId, type);
  }

  async sendDeliveredEvent(threadId: string, msgId: string, isGroup = true) {
    const type = isGroup ? ThreadType.Group : ThreadType.User;
    return await this.api.sendDeliveredEvent(threadId, msgId, type);
  }

  async addUnreadMark(threadId: string, isGroup = true) {
    const type = isGroup ? ThreadType.Group : ThreadType.User;
    return await this.api.addUnreadMark(threadId, type);
  }

  async removeUnreadMark(threadId: string, isGroup = true) {
    const type = isGroup ? ThreadType.Group : ThreadType.User;
    return await this.api.removeUnreadMark(threadId, type);
  }

  async getUnreadMark() {
    return await this.api.getUnreadMark();
  }

  // ==========================================
  // 3. STICKERS & ATTACHMENTS
  // ==========================================
  async sendSticker(threadId: string, stickerDetail: any, isGroup = true) {
    const type = isGroup ? ThreadType.Group : ThreadType.User;
    return await this.api.sendSticker(stickerDetail, threadId, type);
  }

  async getStickers(keyword: string) {
    return await this.api.getStickers(keyword);
  }

  async searchSticker(keyword: string) {
    return await this.api.searchSticker(keyword);
  }

  async getStickersDetail(stickerId: number | string) {
    return await this.api.getStickersDetail(stickerId);
  }

  async getStickerCategoryDetail(cateId: number | string) {
    return await this.api.getStickerCategoryDetail(cateId);
  }

  async uploadAttachment(filePath: string, threadId: string, type: ThreadType = ThreadType.Group) {
    return await this.api.uploadAttachment(filePath, threadId, type);
  }

  // ==========================================
  // 4. GROUP MANAGEMENT (QUẢN TRỊ NHÓM CHAT)
  // ==========================================
  async createGroup(name: string, members: string[] = []) {
    return await this.api.createGroup({ name, members });
  }

  async disperseGroup(groupId: string) {
    return await this.api.disperseGroup(groupId);
  }

  async leaveGroup(groupId: string) {
    return await this.api.leaveGroup(groupId);
  }

  async changeGroupName(groupId: string, newName: string) {
    return await this.api.changeGroupName(newName, groupId);
  }

  async changeGroupAvatar(groupId: string, avatarPath: string) {
    return await this.api.changeGroupAvatar(groupId, avatarPath);
  }

  async changeGroupOwner(groupId: string, newOwnerId: string) {
    return await this.api.changeGroupOwner(newOwnerId, groupId);
  }

  async addGroupDeputy(groupId: string, memberId: string | string[]) {
    return await this.api.addGroupDeputy(memberId, groupId);
  }

  async removeGroupDeputy(groupId: string, memberId: string | string[]) {
    return await this.api.removeGroupDeputy(memberId, groupId);
  }

  async addUserToGroup(groupId: string, members: string | string[]) {
    return await this.api.addUserToGroup(members, groupId);
  }

  async removeUserFromGroup(groupId: string, members: string | string[]) {
    return await this.api.removeUserFromGroup(members, groupId);
  }

  async addGroupBlockedMember(groupId: string, memberId: string | string[]) {
    return await this.api.addGroupBlockedMember(memberId, groupId);
  }

  async removeGroupBlockedMember(groupId: string, memberId: string | string[]) {
    return await this.api.removeGroupBlockedMember(memberId, groupId);
  }

  async getGroupBlockedMember(groupId: string) {
    return await this.api.getGroupBlockedMember(groupId);
  }

  async getGroupInfo(groupId: string | string[]) {
    return await this.api.getGroupInfo(groupId);
  }

  async getAllGroups() {
    return await this.api.getAllGroups();
  }

  async getGroupMembersInfo(groupId: string) {
    return await this.api.getGroupMembersInfo(groupId);
  }

  async getPendingGroupMembers(groupId: string) {
    return await this.api.getPendingGroupMembers(groupId);
  }

  async reviewPendingMemberRequest(groupId: string, memberId: string, isAccept = true) {
    return await this.api.reviewPendingMemberRequest(groupId, memberId, isAccept);
  }

  async updateGroupSettings(groupId: string, settings: any) {
    return await this.api.updateGroupSettings(groupId, settings);
  }

  async upgradeGroupToCommunity(groupId: string) {
    return await this.api.upgradeGroupToCommunity(groupId);
  }

  async inviteUserToGroups(userId: string, groupIds: string[]) {
    return await this.api.inviteUserToGroups(userId, groupIds);
  }

  // --- GROUP LINKS & INVITES ---
  async getGroupLinkInfo(groupId: string) {
    return await this.api.getGroupLinkInfo(groupId);
  }

  async getGroupLinkDetail(linkId: string) {
    return await this.api.getGroupLinkDetail(linkId);
  }

  async enableGroupLink(groupId: string) {
    return await this.api.enableGroupLink(groupId);
  }

  async disableGroupLink(groupId: string) {
    return await this.api.disableGroupLink(groupId);
  }

  async joinGroupLink(link: string) {
    return await this.api.joinGroupLink(link);
  }

  async getGroupInviteBoxList() {
    return await this.api.getGroupInviteBoxList();
  }

  async getGroupInviteBoxInfo(boxId: string) {
    return await this.api.getGroupInviteBoxInfo(boxId);
  }

  async joinGroupInviteBox(boxId: string) {
    return await this.api.joinGroupInviteBox(boxId);
  }

  async deleteGroupInviteBox(boxId: string) {
    return await this.api.deleteGroupInviteBox(boxId);
  }

  // ==========================================
  // 5. POLLS (BÌNH CHỌN TRONG NHÓM)
  // ==========================================
  async createPoll(groupId: string, question: string, options: string[], settings?: any) {
    return await this.api.createPoll({ groupId, question, options, ...(settings || {}) });
  }

  async votePoll(pollId: string, optionIds: number[]) {
    return await this.api.votePoll(pollId, optionIds);
  }

  async addPollOptions(pollId: string, options: string[]) {
    return await this.api.addPollOptions(pollId, options);
  }

  async lockPoll(pollId: string) {
    return await this.api.lockPoll(pollId);
  }

  async sharePoll(pollId: string, threadId: string) {
    return await this.api.sharePoll(pollId, threadId);
  }

  async getPollDetail(pollId: string) {
    return await this.api.getPollDetail(pollId);
  }

  // ==========================================
  // 6. BOARD, REMINDERS & NOTES (BẢNG TIN, NHẮC HẸN, GHI CHÚ)
  // ==========================================
  async createNote(threadId: string, title: string, content: string, isGroup = true) {
    const type = isGroup ? ThreadType.Group : ThreadType.User;
    return await this.api.createNote({ title, content }, threadId, type);
  }

  async editNote(noteId: string, title: string, content: string, threadId: string, isGroup = true) {
    const type = isGroup ? ThreadType.Group : ThreadType.User;
    return await this.api.editNote(noteId, { title, content }, threadId, type);
  }

  async getListBoard(threadId: string, isGroup = true) {
    const type = isGroup ? ThreadType.Group : ThreadType.User;
    return await this.api.getListBoard(threadId, type);
  }

  async getFriendBoardList(friendId: string) {
    return await this.api.getFriendBoardList(friendId);
  }

  async createReminder(threadId: string, content: string, remindTime: number, isGroup = true) {
    const type = isGroup ? ThreadType.Group : ThreadType.User;
    return await this.api.createReminder({ content, remindTime }, threadId, type);
  }

  async editReminder(reminderId: string, content: string, remindTime: number, threadId: string, isGroup = true) {
    const type = isGroup ? ThreadType.Group : ThreadType.User;
    return await this.api.editReminder(reminderId, { content, remindTime }, threadId, type);
  }

  async removeReminder(reminderId: string, threadId: string, isGroup = true) {
    const type = isGroup ? ThreadType.Group : ThreadType.User;
    return await this.api.removeReminder(reminderId, threadId, type);
  }

  async getReminder(reminderId: string, threadId: string, isGroup = true) {
    const type = isGroup ? ThreadType.Group : ThreadType.User;
    return await this.api.getReminder(reminderId, threadId, type);
  }

  async getListReminder(threadId: string, isGroup = true) {
    const type = isGroup ? ThreadType.Group : ThreadType.User;
    return await this.api.getListReminder(threadId, type);
  }

  async getReminderResponses(reminderId: string) {
    return await this.api.getReminderResponses(reminderId);
  }

  // ==========================================
  // 7. FRIENDS & SOCIAL (BẠN BÈ & MẠNG XÃ HỘI)
  // ==========================================
  async getAllFriends() {
    return await this.api.getAllFriends();
  }

  async getCloseFriends() {
    return await this.api.getCloseFriends();
  }

  async getFriendOnlines() {
    return await this.api.getFriendOnlines();
  }

  async getFriendRecommendations() {
    return await this.api.getFriendRecommendations();
  }

  async getRelatedFriendGroup() {
    return await this.api.getRelatedFriendGroup();
  }

  async sendFriendRequest(userId: string, msg = "") {
    return await this.api.sendFriendRequest(userId, msg);
  }

  async acceptFriendRequest(userId: string) {
    return await this.api.acceptFriendRequest(userId);
  }

  async rejectFriendRequest(userId: string) {
    return await this.api.rejectFriendRequest(userId);
  }

  async undoFriendRequest(userId: string) {
    return await this.api.undoFriendRequest(userId);
  }

  async getSentFriendRequest() {
    return await this.api.getSentFriendRequest();
  }

  async getFriendRequestStatus(userId: string) {
    return await this.api.getFriendRequestStatus(userId);
  }

  async removeFriend(userId: string) {
    return await this.api.removeFriend(userId);
  }

  async changeFriendAlias(friendId: string, alias: string) {
    return await this.api.changeFriendAlias(friendId, alias);
  }

  async removeFriendAlias(friendId: string) {
    return await this.api.removeFriendAlias(friendId);
  }

  async getAliasList() {
    return await this.api.getAliasList();
  }

  async blockUser(userId: string) {
    return await this.api.blockUser(userId);
  }

  async unblockUser(userId: string) {
    return await this.api.unblockUser(userId);
  }

  async blockViewFeed(userId: string, isBlock = true) {
    return await this.api.blockViewFeed(userId, isBlock);
  }

  // ==========================================
  // 8. USER PROFILE & SEARCH (PROFILE & TRA CỨU)
  // ==========================================
  async findUserByPhone(phone: string) {
    return await this.api.findUser(phone);
  }

  async findUserByUsername(username: string) {
    return await this.api.findUserByUsername(username);
  }

  async getMultiUsersByPhones(phones: string[]) {
    return await this.api.getMultiUsersByPhones(phones);
  }

  async getUserInfo(userId: string) {
    return await this.api.getUserInfo(userId);
  }

  async getOwnId() {
    return await this.api.getOwnId();
  }

  async fetchAccountInfo() {
    return await this.api.fetchAccountInfo();
  }

  async getBizAccount(userId: string) {
    return await this.api.getBizAccount(userId);
  }

  async lastOnline(userId: string) {
    return await this.api.lastOnline(userId);
  }

  async updateProfile(profileData: any) {
    return await this.api.updateProfile(profileData);
  }

  async updateProfileBio(bio: string) {
    return await this.api.updateProfileBio(bio);
  }

  async changeAccountAvatar(avatarPath: string) {
    return await this.api.changeAccountAvatar(avatarPath);
  }

  async deleteAvatar(avatarId: string) {
    return await this.api.deleteAvatar(avatarId);
  }

  async reuseAvatar(avatarId: string) {
    return await this.api.reuseAvatar(avatarId);
  }

  async getAvatarList() {
    return await this.api.getAvatarList();
  }

  async getFullAvatar(userId: string) {
    return await this.api.getFullAvatar(userId);
  }

  async getAvatarUrlProfile(userId: string) {
    return await this.api.getAvatarUrlProfile(userId);
  }

  // ==========================================
  // 9. CHAT CONVERSATION SETTINGS
  // ==========================================
  async getGroupChatHistory(groupId: string, count = 20) {
    return await this.api.getGroupChatHistory(groupId, count);
  }

  async setMute(threadId: string, duration = -1, isGroup = true) {
    const type = isGroup ? ThreadType.Group : ThreadType.User;
    return await this.api.setMute(threadId, duration, type);
  }

  async getMute(threadId: string, isGroup = true) {
    const type = isGroup ? ThreadType.Group : ThreadType.User;
    return await this.api.getMute(threadId, type);
  }

  async setPinnedConversations(threadId: string, isPin = true, isGroup = true) {
    const type = isGroup ? ThreadType.Group : ThreadType.User;
    return await this.api.setPinnedConversations(threadId, isPin, type);
  }

  async getPinConversations() {
    return await this.api.getPinConversations();
  }

  async setHiddenConversations(threadId: string, pinCode: string, isGroup = true) {
    const type = isGroup ? ThreadType.Group : ThreadType.User;
    return await this.api.setHiddenConversations(threadId, pinCode, type);
  }

  async getHiddenConversations() {
    return await this.api.getHiddenConversations();
  }

  async updateHiddenConversPin(oldPin: string, newPin: string) {
    return await this.api.updateHiddenConversPin(oldPin, newPin);
  }

  async resetHiddenConversPin() {
    return await this.api.resetHiddenConversPin();
  }

  async updateAutoDeleteChat(threadId: string, ttl: number, isGroup = true) {
    const type = isGroup ? ThreadType.Group : ThreadType.User;
    return await this.api.updateAutoDeleteChat(threadId, ttl, type);
  }

  async getAutoDeleteChat(threadId: string, isGroup = true) {
    const type = isGroup ? ThreadType.Group : ThreadType.User;
    return await this.api.getAutoDeleteChat(threadId, type);
  }

  async updateArchivedChatList(threadId: string, isArchive = true, isGroup = true) {
    const type = isGroup ? ThreadType.Group : ThreadType.User;
    return await this.api.updateArchivedChatList(threadId, isArchive, type);
  }

  async getArchivedChatList() {
    return await this.api.getArchivedChatList();
  }

  // ==========================================
  // 10. QUICK MESSAGES & AUTO-REPLY (TIN NHẮN NHANH, TỰ TRẢ LỜI)
  // ==========================================
  async addQuickMessage(shortcut: string, message: string) {
    return await this.api.addQuickMessage({ shortcut, message });
  }

  async updateQuickMessage(id: number | string, shortcut: string, message: string) {
    return await this.api.updateQuickMessage(id, { shortcut, message });
  }

  async removeQuickMessage(id: number | string) {
    return await this.api.removeQuickMessage(id);
  }

  async getQuickMessageList() {
    return await this.api.getQuickMessageList();
  }

  async createAutoReply(data: any) {
    return await this.api.createAutoReply(data);
  }

  async updateAutoReply(id: string, data: any) {
    return await this.api.updateAutoReply(id, data);
  }

  async deleteAutoReply(id: string) {
    return await this.api.deleteAutoReply(id);
  }

  async getAutoReplyList() {
    return await this.api.getAutoReplyList();
  }

  // ==========================================
  // 11. LABELS & TAGS (PHÂN LOẠI KHÁCH HÀNG)
  // ==========================================
  async getLabels() {
    return await this.api.getLabels();
  }

  async updateLabels(labelsData: any) {
    return await this.api.updateLabels(labelsData);
  }

  // ==========================================
  // 12. CATALOG & COMMERCE (DANH MỤC SẢN PHẨM & KINH DOANH)
  // ==========================================
  async createCatalog(name: string) {
    return await this.api.createCatalog(name);
  }

  async updateCatalog(catalogId: string, name: string) {
    return await this.api.updateCatalog(catalogId, name);
  }

  async deleteCatalog(catalogId: string) {
    return await this.api.deleteCatalog(catalogId);
  }

  async getCatalogList() {
    return await this.api.getCatalogList();
  }

  async registerCatalog(catalogData: any) {
    return await this.api.registerCatalog(catalogData);
  }

  async createProductCatalog(productData: any) {
    return await this.api.createProductCatalog(productData);
  }

  async updateProductCatalog(productId: string, productData: any) {
    return await this.api.updateProductCatalog(productId, productData);
  }

  async deleteProductCatalog(productId: string) {
    return await this.api.deleteProductCatalog(productId);
  }

  async getProductCatalogList() {
    return await this.api.getProductCatalogList();
  }

  async uploadProductPhoto(photoPath: string) {
    return await this.api.uploadProductPhoto(photoPath);
  }

  // ==========================================
  // 13. BANK ACCOUNTS (TÀI KHOẢN NGÂN HÀNG TRÊN ZALO)
  // ==========================================
  async createBankAccount(bankData: any) {
    return await this.api.createBankAccount(bankData);
  }

  async updateBankAccount(bankId: string, bankData: any) {
    return await this.api.updateBankAccount(bankId, bankData);
  }

  async deleteBankAccount(bankId: string) {
    return await this.api.deleteBankAccount(bankId);
  }

  async getListBank() {
    return await this.api.getListBank();
  }

  async getListBankAccount() {
    return await this.api.getListBankAccount();
  }

  // ==========================================
  // 14. SETTINGS & SYSTEM
  // ==========================================
  async getSettings() {
    return await this.api.getSettings();
  }

  async updateSettings(settings: any) {
    return await this.api.updateSettings(settings);
  }

  async updateActiveStatus(isActive: boolean) {
    return await this.api.updateActiveStatus(isActive);
  }

  async updateLang(lang: string) {
    return await this.api.updateLang(lang);
  }

  async getListDevice() {
    return await this.api.getListDevice();
  }

  async getQR() {
    return await this.api.getQR();
  }

  async getCookie() {
    return await this.api.getCookie();
  }

  async getContext() {
    return await this.api.getContext();
  }

  async keepAlive() {
    return await this.api.keepAlive();
  }

  async lostFocus() {
    return await this.api.lostFocus();
  }

  async sendReport(reportData: any) {
    return await this.api.sendReport(reportData);
  }

  async custom(service: string, endpoint: string, body: any) {
    return await this.api.custom(service, endpoint, body);
  }
}
