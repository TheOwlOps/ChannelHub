import type { ChannelHub } from "../../core/engine/hub";
export declare function handleChannelHubMcpCall(hub: ChannelHub, toolName: string, args: Record<string, any>): Promise<{
    content: Array<{
        type: "text";
        text: string;
    }>;
    isError?: boolean;
}>;
