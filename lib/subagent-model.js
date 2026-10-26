import { installModelSelection } from "@deepseek-ai/dsh-agent";
import { ReasoningEffortId } from "@deepseek-ai/dsh-llm";
import { logger } from "./ilink/util/logger.js";
/** Install the policy: listen for child agents of the WeChat session. */
export function registerSubagentModelPolicy(ctx, policy) {
    // 0.1.7 widened the payload to `{ agent, source, signal? }` and types `agent`
    // as the real Agent; a hand-narrowed parameter no longer fits. Let the event
    // map type it and read only what this policy needs.
    ctx.on("agent/created", ({ agent }) => {
        try {
            const parentSession = agent.session?.header?.parentSession;
            if (String(parentSession) !== String(policy.sessionId))
                return undefined;
            // Only children created at or below this session; if a descendant of
            // the child exists it inherits this selection through its own
            // parentSession chain anyway (each level is its own agent/created).
            const selection = {
                current: {
                    provider: policy.provider,
                    model: policy.model,
                    reasoningEffort: ReasoningEffortId(policy.reasoningEffort),
                },
                assembled: undefined,
            };
            installModelSelection(agent.ctx, selection);
            logger.info(`subagent-model: wechat subagent ${String(agent.id)} -> ${policy.provider}/${policy.model} reasoningEffort=${policy.reasoningEffort}`);
        }
        catch (err) {
            logger.warn(`subagent-model: install failed: ${String(err)}`);
        }
        return undefined;
    });
}
//# sourceMappingURL=subagent-model.js.map