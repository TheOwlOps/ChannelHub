import type { ChannelHub } from "../../core/hub";
export interface McpToolDefinition {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
}
export declare function getChannelHubMcpTools(): McpToolDefinition[];
export declare function handleChannelHubMcpCall(hub: ChannelHub, toolName: string, args: Record<string, any>): Promise<{
    content: Array<{
        type: "text";
        text: string;
    }>;
    isError?: boolean;
}>;
