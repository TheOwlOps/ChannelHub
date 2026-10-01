import type { ChannelHub } from "../../core/hub";
export interface WebhookBridgeConfig {
    port?: number;
    host?: string;
    pathPrefix?: string;
    apiKey?: string;
    maxBodySize?: number;
}
/**
 * HTTP / SSE bridge exposing ChannelHub over REST.
 * Compatible with n8n, Dify, Flowise, LangChain custom tools, and plain curl.
 *
 * Endpoints:
 *   GET  /health
 *   GET  /channels
 *   POST /send          { channel, chatId, text, replyToId? }
 *   POST /react         { channel, chatId, messageId, emoji }
 *   GET  /events        Server-Sent Events stream of inbound UnifiedMessages
 */
export declare class WebhookBridge {
    private hub;
    private config;
    private server;
    private sseClients;
    constructor(hub: ChannelHub, config?: WebhookBridgeConfig);
    start(): Promise<void>;
    stop(): Promise<void>;
    private path;
    private authenticate;
    private handle;
    private handleSse;
    private broadcastSse;
    private json;
    private readJson;
}
