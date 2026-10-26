import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
export declare class ClawbotMcpClient {
    private readonly base;
    private readonly tokenFile;
    constructor(options?: {
        url?: string;
        tokenFile?: string;
    });
    request(route: string, body?: Record<string, unknown>, query?: URLSearchParams): Promise<Record<string, unknown>>;
    wechatSession(): Promise<Record<string, unknown>>;
}
export declare function createClawbotMcpServer(client?: ClawbotMcpClient): McpServer;
//# sourceMappingURL=mcp-server.d.ts.map