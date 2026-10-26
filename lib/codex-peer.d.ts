import type { Context } from "@deepseek-ai/cordis";
import type { ClawbotConfig } from "./config.js";
import { type CodexRpc } from "./codex-rpc.js";
import { CodexProgressStore } from "./codex-progress.js";
type Status = {
    type: string;
    activeFlags?: string[];
};
type Item = {
    type: string;
    text?: string;
    content?: Array<{
        type: string;
        text?: string;
    }>;
    status?: string;
};
type Turn = {
    id: string;
    status: string;
    items: Item[];
    error?: {
        message?: string;
    } | null;
};
export type CodexThread = {
    id: string;
    cwd: string;
    projectId?: string | null;
    name?: string | null;
    preview?: string;
    updatedAt?: number;
    status: Status;
    turns?: Turn[];
};
type ThreadPage = {
    data: CodexThread[];
    nextCursor: string | null;
};
type PeerConfig = Pick<ClawbotConfig, "codexPeer" | "codexTransport" | "codexBinary" | "codexSocket">;
export declare class CodexPeer {
    private readonly config;
    readonly progress: CodexProgressStore;
    private readonly rpc;
    private readonly threads;
    private readonly sends;
    private readonly questions;
    constructor(config: PeerConfig, progress: CodexProgressStore, options?: {
        rpc?: CodexRpc;
        askWechat?: (question: string, signal?: AbortSignal) => Promise<string | null>;
    });
    private enabled;
    close(): void;
    private remember;
    list(project?: string, cursor?: string, limit?: number): Promise<ThreadPage>;
    /** IDs are authoritative. Short IDs/titles must resolve uniquely across all pages. */
    private resolve;
    read(session: string, project?: string, limit?: number): Promise<CodexThread>;
    private latestTurns;
    send(session: string, text: string, project?: string, allowResume?: boolean): Promise<{
        threadId: string;
        delivered: string;
        turnId: string;
    }>;
    private record;
    private observe;
}
export declare function registerCodexPeerTools(ctx: Context, peer: CodexPeer): void;
export {};
//# sourceMappingURL=codex-peer.d.ts.map