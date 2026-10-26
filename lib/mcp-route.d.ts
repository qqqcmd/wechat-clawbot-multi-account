import type { Context } from "@deepseek-ai/cordis";
import type { ResolvedWeixinAccount } from "./ilink/auth/accounts.js";
import { CodexProgressStore } from "./codex-progress.js";
/** What the route module needs from the plugin body. */
export type McpRouteDeps = {
    /**
     * The LIVE config object, held by reference so `mcpBridge` can be flipped
     * from the settings page without a restart. Read at request time, never
     * snapshotted here.
     */
    config: {
        mcpBridge: boolean;
        /** Which session gets the mirrored copy of an outbound notify. Cold field. */
        sessionId: string;
    };
    /** Send one plain-text WeChat message (applies the emoji policy). */
    sendText: (to: string, text: string) => Promise<void>;
    /** The currently bound account, or null before `clawbot login`. */
    getAccount: () => ResolvedWeixinAccount | null;
    /** Shared with the DSH Codex tools. Process-local, never a workspace index. */
    codexProgress?: CodexProgressStore;
};
/**
 * Read the shared secret, generating it on first use.
 *
 * `mode` on `writeFileSync` only applies when the file is created, so the
 * chmod is unconditional — a token file left at 0644 by an earlier build would
 * otherwise stay world-readable forever.
 */
export declare function ensureMcpToken(): string;
/**
 * Register session, notification, and Codex progress routes.
 *
 * `webServer` goes through `ctx.inject` so a headless composition without it
 * simply has no bridge, rather than failing the whole plugin tree.
 */
export declare function registerMcpRoutes(ctx: Context, deps: McpRouteDeps): void;
//# sourceMappingURL=mcp-route.d.ts.map