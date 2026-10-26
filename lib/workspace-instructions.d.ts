/**
 * Optionally keep DSH's workspace instruction files (AGENTS.md / CLAUDE.md)
 * out of the WeChat session.
 *
 * The host's agent-instructions plugin splices a directory's instruction file
 * into the conversation the first time a tool touches a file there — and the
 * WHOLE file again every time it changes afterwards. A long developer notebook
 * kept for a coding agent (30–40k characters) is the bad case: the bot runs one
 * script in that project, then every later edit of the notebook — none of them
 * the bot's business — adds another full copy, and in a long-lived chat
 * ~140k characters end up riding along on every request.
 *
 * Off by config (`workspaceInstructions: false`), this session gets none of it;
 * the owner keeps the knowledge on demand instead (e.g. a memory.md line telling
 * the bot to read the relevant section before working there). On by default,
 * because for someone else an AGENTS.md in the bot's working directory may be
 * exactly how they instruct their bot. Other sessions (web, subagents) are
 * never touched.
 *
 * Mechanism: an outermost `agent/pre-step` listener (`prepend`) runs after the
 * agent-instructions listener and drops its messages — the ones it spliced into
 * this step and the ones it parked in the next-step inbox. Best effort: any
 * surprise leaves the host's decision exactly as it was.
 */
import type { Context } from "@deepseek-ai/cordis";
type SourceCarrier = {
    id?: unknown;
    source?: {
        kind?: unknown;
        changes?: unknown;
    };
};
/** A message the host's agent-instructions plugin produced. */
export declare function isWorkspaceInstructions(message: unknown): boolean;
type Inbox = {
    nextStep?: readonly SourceCarrier[];
    remove?: (id: unknown) => unknown;
};
type Decision = {
    kind?: unknown;
    messages?: unknown;
};
/**
 * Remove workspace-instruction messages from one pre-step decision and from the
 * agent's next-step inbox. Returns the decision to use and what was dropped.
 */
export declare function stripWorkspaceInstructions(agent: {
    inbox?: Inbox;
}, decision: Decision): {
    decision: Decision;
    dropped: string[];
};
/**
 * Install the filter. `shouldStrip(agentId)` decides per step, so the config
 * switch takes effect on the next step without a restart.
 */
export declare function registerWorkspaceInstructionsFilter(ctx: Context, shouldStrip: (agentId: string) => boolean): void;
export {};
//# sourceMappingURL=workspace-instructions.d.ts.map