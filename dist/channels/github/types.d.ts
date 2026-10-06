export interface GitHubAdapterConfig {
    /** GitHub Personal Access Token (classic or fine-grained) or App Installation Token */
    token: string;
    /** Webhook secret for validating payload signatures (X-Hub-Signature-256) */
    webhookSecret?: string;
    /** GitHub API base url (defaults to https://api.github.com) */
    apiUrl?: string;
}
