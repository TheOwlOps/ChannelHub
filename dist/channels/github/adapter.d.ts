import { BaseChannel } from "../../core/adapter";
import type { ChannelType, MediaPayload, SendOptions, SentMessageResult, UnifiedMessage } from "../../core/types";
import type { GitHubAdapterConfig } from "./types";
/**
 * GitHubChannelAdapter — receive GitHub webhook events (issues, PRs, comments,
 * reviews, discussions) and respond via GitHub REST API v3. Zero dependencies.
 */
export declare class GitHubChannelAdapter extends BaseChannel {
    readonly name: ChannelType;
    private config;
    private apiUrl;
    constructor(config: GitHubAdapterConfig);
    connect(_signal?: AbortSignal): Promise<void>;
    disconnect(): Promise<void>;
    /**
     * Verify GitHub webhook payload signature (X-Hub-Signature-256).
     * Fail-closed: returns false if no secret configured or signature missing.
     */
    verifyWebhookSignature(payload: string | Buffer, signatureHeader: string): boolean;
    /**
     * Normalize a GitHub webhook event into a UnifiedMessage.
     * Supports: issues, issue_comment, pull_request, pull_request_review,
     * pull_request_review_comment, discussion, discussion_comment, push.
     */
    normalizeWebhookEvent(event: string, payload: Record<string, any>): UnifiedMessage | null;
    /**
     * Send a comment on an issue or PR.
     * chatId format: "owner/repo#number" e.g. "theowlops/channelhub#42"
     */
    sendText(chatId: string, text: string, options?: SendOptions): Promise<SentMessageResult>;
    sendMedia(_chatId: string, _media: MediaPayload, _options?: SendOptions): Promise<SentMessageResult>;
    /**
     * Create a new issue.
     */
    createIssue(repoFullName: string, title: string, body?: string, labels?: string[], signal?: AbortSignal): Promise<{
        number: number;
        id: number;
        url: string;
    }>;
    private headers;
    private parseChatId;
}
