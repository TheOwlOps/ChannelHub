import { createHmac, timingSafeEqual } from "node:crypto";
import { BaseChannel } from "../../core/adapter";
import type {
  ChannelType,
  MediaPayload,
  SendOptions,
  SentMessageResult,
  UnifiedMessage,
} from "../../core/types";
import type { GitHubAdapterConfig } from "./types";

/**
 * GitHubChannelAdapter — receive GitHub webhook events (issues, PRs, comments,
 * reviews, discussions) and respond via GitHub REST API v3. Zero dependencies.
 */
export class GitHubChannelAdapter extends BaseChannel {
  readonly name: ChannelType = "github";
  private config: GitHubAdapterConfig;
  private apiUrl: string;

  constructor(config: GitHubAdapterConfig) {
    super();
    if (!config.token) throw new Error("GitHubAdapterConfig.token is required");
    this.config = config;
    this.apiUrl = (config.apiUrl || "https://api.github.com").replace(/\/+$/, "");
  }

  async connect(_signal?: AbortSignal): Promise<void> {
    // Verify token with a lightweight call
    const res = await fetch(`${this.apiUrl}/user`, {
      headers: this.headers(),
      signal: _signal,
    });
    if (!res.ok) throw new Error(`GitHub auth failed: ${res.status}`);
    this.setConnected(true);
  }

  async disconnect(): Promise<void> {
    this.setConnected(false);
  }

  /**
   * Verify GitHub webhook payload signature (X-Hub-Signature-256).
   * Fail-closed: returns false if no secret configured or signature missing.
   */
  verifyWebhookSignature(payload: string | Buffer, signatureHeader: string): boolean {
    if (!this.config.webhookSecret || !signatureHeader) return false;
    const expected = "sha256=" + createHmac("sha256", this.config.webhookSecret)
      .update(payload)
      .digest("hex");
    const a = Buffer.from(expected);
    const b = Buffer.from(signatureHeader);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  }

  /**
   * Normalize a GitHub webhook event into a UnifiedMessage.
   * Supports: issues, issue_comment, pull_request, pull_request_review,
   * pull_request_review_comment, discussion, discussion_comment, push.
   */
  normalizeWebhookEvent(event: string, payload: Record<string, any>): UnifiedMessage | null {
    const action = payload.action || "";
    const sender = payload.sender || {};
    const repo = payload.repository || {};

    const base: Partial<UnifiedMessage> = {
      channel: "github",
      sender: { id: String(sender.id || ""), name: sender.login || "" },
      chat: { id: `${repo.full_name || "unknown"}`, type: "group" },
      timestamp: Date.now(),
      raw: payload,
    };

    switch (event) {
      case "issues": {
        const issue = payload.issue;
        if (!issue) return null;
        return {
          ...base,
          id: `issue-${issue.id}-${action}`,
          content: { text: `[Issue ${action}] #${issue.number} ${issue.title}\n\n${issue.body || ""}`.trim() },
        } as UnifiedMessage;
      }
      case "issue_comment": {
        const comment = payload.comment;
        if (!comment) return null;
        return {
          ...base,
          id: `comment-${comment.id}`,
          content: { text: `[Comment on #${payload.issue?.number}] ${comment.body || ""}`.trim() },
        } as UnifiedMessage;
      }
      case "pull_request": {
        const pr = payload.pull_request;
        if (!pr) return null;
        return {
          ...base,
          id: `pr-${pr.id}-${action}`,
          content: { text: `[PR ${action}] #${pr.number} ${pr.title}\n\n${pr.body || ""}`.trim() },
        } as UnifiedMessage;
      }
      case "pull_request_review": {
        const review = payload.review;
        if (!review) return null;
        return {
          ...base,
          id: `review-${review.id}`,
          content: { text: `[Review ${review.state}] on PR #${payload.pull_request?.number}\n\n${review.body || ""}`.trim() },
        } as UnifiedMessage;
      }
      case "pull_request_review_comment": {
        const comment = payload.comment;
        if (!comment) return null;
        return {
          ...base,
          id: `pr-comment-${comment.id}`,
          content: { text: `[Review comment on PR #${payload.pull_request?.number}] ${comment.body || ""}`.trim() },
        } as UnifiedMessage;
      }
      case "discussion": {
        const disc = payload.discussion;
        if (!disc) return null;
        return {
          ...base,
          id: `discussion-${disc.id}-${action}`,
          content: { text: `[Discussion ${action}] ${disc.title}\n\n${disc.body || ""}`.trim() },
        } as UnifiedMessage;
      }
      case "discussion_comment": {
        const comment = payload.comment;
        if (!comment) return null;
        return {
          ...base,
          id: `disc-comment-${comment.id}`,
          content: { text: `[Discussion comment] ${comment.body || ""}`.trim() },
        } as UnifiedMessage;
      }
      case "push": {
        const commits = payload.commits || [];
        const summary = commits.map((c: any) => `• ${c.message}`).join("\n");
        return {
          ...base,
          id: `push-${payload.after?.slice(0, 7) || Date.now()}`,
          content: { text: `[Push to ${payload.ref}] ${commits.length} commit(s)\n${summary}`.trim() },
        } as UnifiedMessage;
      }
      default:
        return null;
    }
  }

  /**
   * Send a comment on an issue or PR.
   * chatId format: "owner/repo#number" e.g. "theowlops/channelhub#42"
   */
  async sendText(chatId: string, text: string, options?: SendOptions): Promise<SentMessageResult> {
    const { owner, repo, number } = this.parseChatId(chatId);
    const res = await fetch(`${this.apiUrl}/repos/${owner}/${repo}/issues/${number}/comments`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({ body: text }),
      signal: options?.signal,
    });
    if (!res.ok) throw new Error(`GitHub API error: ${res.status} ${await res.text()}`);
    const data = await res.json() as any;
    return { messageId: String(data.id), chatId, timestamp: Date.now() };
  }

  async sendMedia(_chatId: string, _media: MediaPayload, _options?: SendOptions): Promise<SentMessageResult> {
    // GitHub comments support inline markdown images, not direct uploads
    throw new Error("Use sendText with markdown image syntax: ![alt](url)");
  }

  /**
   * Create a new issue.
   */
  async createIssue(
    repoFullName: string,
    title: string,
    body?: string,
    labels?: string[],
    signal?: AbortSignal,
  ): Promise<{ number: number; id: number; url: string }> {
    const [owner, repo] = repoFullName.split("/");
    const res = await fetch(`${this.apiUrl}/repos/${owner}/${repo}/issues`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({ title, body, labels }),
      signal,
    });
    if (!res.ok) throw new Error(`GitHub API error: ${res.status} ${await res.text()}`);
    const data = await res.json() as any;
    return { number: data.number, id: data.id, url: data.html_url };
  }

  // -- private --

  private headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.config.token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28",
    };
  }

  private parseChatId(chatId: string): { owner: string; repo: string; number: string } {
    // "owner/repo#123"
    const match = chatId.match(/^([^/]+)\/([^#]+)#(\d+)$/);
    if (!match) throw new Error(`Invalid GitHub chatId format "${chatId}". Expected "owner/repo#number".`);
    return { owner: match[1], repo: match[2], number: match[3] };
  }
}
