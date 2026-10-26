/**
 * WeChat conversation guidance: a prompt section registered agent-scoped on
 * the WeChat session that shapes how the agent talks through the ClawBot
 * bridge (acknowledge first, minimal messages, no debug chatter, file sends
 * only through the dedicated tool).
 *
 * Two registrations exist:
 * - `registerWechatGuidance(agentCtx)` — agent-scoped (static text), done by
 *   the bridge's agent setup for the WeChat session.
 * - `registerWechatGuidanceGlobal(ctx, sessionId)` — GLOBAL registration with
 *   a DYNAMIC text provider that returns the rules only when the assembled
 *   agent belongs to the WeChat session, and an empty string otherwise
 *   (empty sections are dropped at render time). This covers agents that the
 *   harness resumes directly from GUI messages without running the bridge's
 *   setup, while leaving unrelated DSH conversations untouched.
 */
import type { Context } from "@deepseek-ai/cordis";
/**
 * The exact WeChat-session prompt text, in assembly order (memory section is
 * order 79, guidance 80). Exported so the offline reply-style harness in
 * `scripts/bot-sim.mjs` exercises the same string the live bot gets, instead of
 * a hand-copied approximation that drifts the moment a rule changes.
 */
export declare function buildWechatSystemPrompt(allowEmoji?: boolean): string;
/**
 * Agent-scoped registration (bridge agent setup path).
 *
 * `config` is held by reference, not read once: the section's `text` is a
 * function the harness calls on every prompt assembly, so flipping the emoji
 * setting changes the very next turn's rules with no restart. Passing a copy
 * here would quietly pin the prompt to whatever the setting was at boot.
 */
export declare function registerWechatGuidanceGlobal(ctx: Context, sessionId: string, config: {
    stripEmoji: boolean;
}): void;
//# sourceMappingURL=prompt.d.ts.map