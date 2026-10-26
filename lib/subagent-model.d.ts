/**
 * Subagent model policy for the WeChat agent: every subagent delegated from
 * the WeChat session (directly or transitively) runs with max thinking
 * (reasoningEffort=max) on deepseek-flash, so that complex/deep tasks the
 * user delegates still get full reasoning even though the main WeChat
 * conversation runs with reasoningEffort=off for fast replies.
 *
 * Implementation: `agent/created` is emitted for every live agent (children
 * included); each child's session header carries `parentSession`, so we can
 * tell whether it descends from the WeChat session. For those children we
 * install a model selection (provider/model/reasoningEffort=max) via
 * `installModelSelection`, which couples prompt assembly and request routing
 * on the child's scope.
 */
import type { Context } from "@deepseek-ai/cordis";
export type SubagentModelPolicy = {
    /** The WeChat session id whose subagents get the policy. */
    sessionId: string;
    provider: string;
    model: string;
    /** "max" = full thinking (deepseek v4 flash supports off|high|max). */
    reasoningEffort: string;
};
/** Install the policy: listen for child agents of the WeChat session. */
export declare function registerSubagentModelPolicy(ctx: Context, policy: SubagentModelPolicy): void;
//# sourceMappingURL=subagent-model.d.ts.map