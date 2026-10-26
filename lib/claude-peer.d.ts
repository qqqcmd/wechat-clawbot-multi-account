import type { Context } from "@deepseek-ai/cordis";
import type { ClaudePermissionMode, ClaudeResumeMode, ClawbotConfig } from "./config.js";
declare function findClaude(): string | undefined;
/** Is this transcript one of this plugin's own relay-helper runs? */
declare function isRelayHelperTranscript(file: string): boolean;
type Turn = {
    role: "user" | "assistant";
    at: string;
    text: string;
};
type SessionState = {
    turns: Turn[];
    title?: string;
    /** Messages enqueued but not yet delivered or withdrawn. */
    queued: string[];
    /** Epoch ms of the newest user/assistant entry, 0 when there is none. */
    lastActivity: number;
    /** Best available inference — see `running` below for why it is an inference. */
    running: boolean;
    /** The directory the session ran in, as recorded on its own entries. */
    cwd?: string;
};
/**
 * Read the last `limit` human-visible turns.
 *
 * Streamed through a ring buffer rather than parsed into an array: these files
 * reach tens of megabytes (12MB for a long session), and only the tail matters.
 *
 * Sidechain entries are dropped — those are subagent traffic, and mixing them
 * into the main thread makes the transcript unreadable. A `user` entry whose
 * content holds no text block is a tool result, not something a person typed,
 * so it falls out naturally.
 */
declare function readTail(file: string, limit: number): SessionState;
/**
 * Test seam. Queue accounting and the run-state inference are the parts most
 * likely to rot (three operations, one of which withdraws by content), and they
 * are only reachable through a live session otherwise — which makes the
 * assertion depend on whatever the machine is doing at the time. Exported so a
 * synthetic transcript with a known answer can be checked instead.
 */
export declare const readTranscriptForTest: typeof readTail;
/**
 * Test seam for the binary search — the piece that actually failed in
 * production, and the one whose correctness depends on this machine's layout
 * rather than on any logic here.
 */
export declare const resolveClaudeBinaryForTest: typeof findClaude;
/**
 * Test seam for the approval-mode decision. Exported because the two branches
 * that matter — a mode that needs a human, and no recorded mode at all — are
 * exactly the ones a live machine will not reliably produce on demand, and
 * getting them wrong reproduces the "it sits in manual mode" complaint.
 */
export declare const resolveReviveModeForTest: typeof resolveReviveMode;
/** Test seam: the backwards chunked scan for a session's mode and directory. */
export declare const reviveFactsForTest: typeof reviveFacts;
/**
 * Test seam: "is this transcript one of ours". Exported because the live roster
 * cannot test it — whether a helper session happens to fall inside the newest
 * eight depends on what the machine did today, which makes the assertion pass
 * for the wrong reason.
 */
export declare const isRelayHelperTranscriptForTest: typeof isRelayHelperTranscript;
/**
 * The last-recorded facts a revive needs: the session's own approval mode, and
 * the directory it was running in.
 *
 * Both are read by scanning BACKWARDS in growing windows rather than from the
 * 64KB tail `readMetaTail` uses, because 64KB is demonstrably not enough:
 *
 *   - `permissionMode` is only written when the mode CHANGES, so most sessions
 *     have none of it anywhere near the end (measured: 5 of the 8 newest).
 *   - `cwd` is on most records, but a single `attachment` record can be tens of
 *     KB (skill listings, MCP instruction blocks). On a 155KB transcript the
 *     last 64KB held only two trailing records, neither carrying a cwd — so the
 *     session came back with no directory at all, and the revive would have run
 *     in the wrong place.
 *
 * Called once, on the send path, for one session. The roster deliberately does
 * NOT use this: it reads a fixed 64KB per session because it touches eight of
 * them and a missing cwd there is cosmetic, not wrong.
 */
declare function reviveFacts(file: string): {
    mode?: ClaudePermissionMode;
    cwd?: string;
};
/**
 * Decide the approval mode for a revive, and say where it came from.
 *
 * `inherit` (the default) means "run it the way that workspace was already
 * running" — which is what the user asked for and what a transcript can actually
 * answer. The two escape hatches are honest rather than silent: a mode that
 * needs a human, or no recorded mode at all, falls back to `acceptEdits` and the
 * reply says so.
 */
declare function resolveReviveMode(configured: ClaudeResumeMode, recorded: ClaudePermissionMode | undefined): {
    mode: ClaudePermissionMode;
    why: string;
};
/**
 * Register all three tools on one context.
 *
 * @param agentCtx - the context whose agent should get the tools.
 */
export declare function registerClaudePeerTools(agentCtx: Context, config?: Pick<ClawbotConfig, "claudeResumePermissionMode">): void;
export {};
//# sourceMappingURL=claude-peer.d.ts.map