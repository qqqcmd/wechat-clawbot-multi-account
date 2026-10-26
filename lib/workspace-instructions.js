import { logger } from "./ilink/util/logger.js";
/** A message the host's agent-instructions plugin produced. */
export function isWorkspaceInstructions(message) {
    return message?.source?.kind === "agent-instructions";
}
/** The instruction files a message carries, for the log line (no content). */
function scopesOf(message) {
    const changes = Array.isArray(message.source?.changes) ? message.source.changes : [];
    return changes
        .map((c) => (typeof c.scope === "string" ? c.scope.replace(/\u0000/g, "/") : ""))
        .filter((s) => s.length > 0);
}
/**
 * Remove workspace-instruction messages from one pre-step decision and from the
 * agent's next-step inbox. Returns the decision to use and what was dropped.
 */
export function stripWorkspaceInstructions(agent, decision) {
    const dropped = [];
    const inbox = agent.inbox;
    if (inbox?.nextStep !== undefined && typeof inbox.remove === "function") {
        for (const message of inbox.nextStep.filter(isWorkspaceInstructions)) {
            inbox.remove(message.id);
            dropped.push(...scopesOf(message));
        }
    }
    if (decision.kind === "reject" || !Array.isArray(decision.messages))
        return { decision, dropped };
    const kept = decision.messages.filter((m) => {
        if (!isWorkspaceInstructions(m))
            return true;
        dropped.push(...scopesOf(m));
        return false;
    });
    if (kept.length === decision.messages.length)
        return { decision, dropped };
    return { decision: { ...decision, messages: kept }, dropped };
}
/**
 * Install the filter. `shouldStrip(agentId)` decides per step, so the config
 * switch takes effect on the next step without a restart.
 */
export function registerWorkspaceInstructionsFilter(ctx, shouldStrip) {
    const on = ctx.on;
    let lastLogged = "";
    on.call(ctx, "agent/pre-step", async (args, next) => {
        const decision = await next();
        try {
            const agent = args?.agent;
            if (agent === undefined || typeof agent.id !== "string" || !shouldStrip(agent.id))
                return decision;
            const result = stripWorkspaceInstructions(agent, decision);
            if (result.dropped.length > 0) {
                const files = [...new Set(result.dropped)].join(", ") || "(unnamed)";
                if (files !== lastLogged) {
                    lastLogged = files;
                    logger.info(`workspace-instructions: kept ${files} out of the WeChat session (workspaceInstructions: false)`);
                }
            }
            return result.decision;
        }
        catch (err) {
            logger.warn(`workspace-instructions: filter skipped: ${String(err)}`);
            return decision;
        }
    }, { prepend: true });
}
//# sourceMappingURL=workspace-instructions.js.map