// src/channels/github/adapter.ts
import { createHmac, timingSafeEqual } from "node:crypto";

// src/core/adapter.ts
import { EventEmitter } from "node:events";

class BaseChannel extends EventEmitter {
  get provider() {
    return this.name;
  }
  async dispatchMessage(msg) {
    const listeners = this.listeners("message");
    for (const listener of listeners) {
      try {
        await listener(msg);
      } catch (err) {
        this.emit("error", err);
      }
    }
  }
  get accountId() {
    return this.config?.accountId || "default";
  }
  _connected = false;
  isConnected() {
    return this._connected;
  }
  setConnected(value) {
    const changed = this._connected !== value;
    this._connected = value;
    if (changed) {
      this.emit("status", value ? "connected" : "disconnected");
    }
  }
  assertNotAborted(signal) {
    if (signal?.aborted) {
      throw signal.reason || new Error("Operation aborted");
    }
  }
  async sendGif(chatId, urlOrPath, caption, options) {
    return this.sendMedia(chatId, {
      type: "animation",
      source: urlOrPath,
      caption
    }, options);
  }
  async sendSticker(chatId, stickerIdOrUrl, options) {
    return this.sendMedia(chatId, {
      type: "sticker",
      source: stickerIdOrUrl
    }, options);
  }
}

// src/channels/github/adapter.ts
class GitHubChannelAdapter extends BaseChannel {
  name = "github";
  config;
  apiUrl;
  constructor(config) {
    super();
    if (!config.token)
      throw new Error("GitHubAdapterConfig.token is required");
    this.config = config;
    this.apiUrl = (config.apiUrl || "https://api.github.com").replace(/\/+$/, "");
  }
  async connect(_signal) {
    const res = await fetch(`${this.apiUrl}/user`, {
      headers: this.headers(),
      signal: _signal
    });
    if (!res.ok)
      throw new Error(`GitHub auth failed: ${res.status}`);
    this.setConnected(true);
  }
  async disconnect() {
    this.setConnected(false);
  }
  verifyWebhookSignature(payload, signatureHeader) {
    if (!this.config.webhookSecret || !signatureHeader)
      return false;
    const expected = "sha256=" + createHmac("sha256", this.config.webhookSecret).update(payload).digest("hex");
    const a = Buffer.from(expected);
    const b = Buffer.from(signatureHeader);
    if (a.length !== b.length)
      return false;
    return timingSafeEqual(a, b);
  }
  normalizeWebhookEvent(event, payload) {
    const action = payload.action || "";
    const sender = payload.sender || {};
    const repo = payload.repository || {};
    const base = {
      channel: "github",
      sender: { id: String(sender.id || ""), name: sender.login || "" },
      chat: { id: `${repo.full_name || "unknown"}`, type: "group" },
      timestamp: Date.now(),
      raw: payload
    };
    switch (event) {
      case "issues": {
        const issue = payload.issue;
        if (!issue)
          return null;
        return {
          ...base,
          id: `issue-${issue.id}-${action}`,
          content: { text: `[Issue ${action}] #${issue.number} ${issue.title}

${issue.body || ""}`.trim() }
        };
      }
      case "issue_comment": {
        const comment = payload.comment;
        if (!comment)
          return null;
        return {
          ...base,
          id: `comment-${comment.id}`,
          content: { text: `[Comment on #${payload.issue?.number}] ${comment.body || ""}`.trim() }
        };
      }
      case "pull_request": {
        const pr = payload.pull_request;
        if (!pr)
          return null;
        return {
          ...base,
          id: `pr-${pr.id}-${action}`,
          content: { text: `[PR ${action}] #${pr.number} ${pr.title}

${pr.body || ""}`.trim() }
        };
      }
      case "pull_request_review": {
        const review = payload.review;
        if (!review)
          return null;
        return {
          ...base,
          id: `review-${review.id}`,
          content: { text: `[Review ${review.state}] on PR #${payload.pull_request?.number}

${review.body || ""}`.trim() }
        };
      }
      case "pull_request_review_comment": {
        const comment = payload.comment;
        if (!comment)
          return null;
        return {
          ...base,
          id: `pr-comment-${comment.id}`,
          content: { text: `[Review comment on PR #${payload.pull_request?.number}] ${comment.body || ""}`.trim() }
        };
      }
      case "discussion": {
        const disc = payload.discussion;
        if (!disc)
          return null;
        return {
          ...base,
          id: `discussion-${disc.id}-${action}`,
          content: { text: `[Discussion ${action}] ${disc.title}

${disc.body || ""}`.trim() }
        };
      }
      case "discussion_comment": {
        const comment = payload.comment;
        if (!comment)
          return null;
        return {
          ...base,
          id: `disc-comment-${comment.id}`,
          content: { text: `[Discussion comment] ${comment.body || ""}`.trim() }
        };
      }
      case "push": {
        const commits = payload.commits || [];
        const summary = commits.map((c) => `• ${c.message}`).join(`
`);
        return {
          ...base,
          id: `push-${payload.after?.slice(0, 7) || Date.now()}`,
          content: { text: `[Push to ${payload.ref}] ${commits.length} commit(s)
${summary}`.trim() }
        };
      }
      default:
        return null;
    }
  }
  async sendText(chatId, text, options) {
    const { owner, repo, number } = this.parseChatId(chatId);
    const res = await fetch(`${this.apiUrl}/repos/${owner}/${repo}/issues/${number}/comments`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({ body: text }),
      signal: options?.signal
    });
    if (!res.ok)
      throw new Error(`GitHub API error: ${res.status} ${await res.text()}`);
    const data = await res.json();
    return { messageId: String(data.id), chatId, timestamp: Date.now() };
  }
  async sendMedia(_chatId, _media, _options) {
    throw new Error("Use sendText with markdown image syntax: ![alt](url)");
  }
  async createIssue(repoFullName, title, body, labels, signal) {
    const [owner, repo] = repoFullName.split("/");
    const res = await fetch(`${this.apiUrl}/repos/${owner}/${repo}/issues`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({ title, body, labels }),
      signal
    });
    if (!res.ok)
      throw new Error(`GitHub API error: ${res.status} ${await res.text()}`);
    const data = await res.json();
    return { number: data.number, id: data.id, url: data.html_url };
  }
  headers() {
    return {
      Authorization: `Bearer ${this.config.token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28"
    };
  }
  parseChatId(chatId) {
    const match = chatId.match(/^([^/]+)\/([^#]+)#(\d+)$/);
    if (!match)
      throw new Error(`Invalid GitHub chatId format "${chatId}". Expected "owner/repo#number".`);
    return { owner: match[1], repo: match[2], number: match[3] };
  }
}
export {
  GitHubChannelAdapter
};
