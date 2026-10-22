/** MCP tool definition shared by the tool catalogue and the call handler. */
export interface McpToolDefinition {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
}
