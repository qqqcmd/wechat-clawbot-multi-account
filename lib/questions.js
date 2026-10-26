import { logger } from "./ilink/util/logger.js";
export function tryRegisterQuestionProvider(deps) {
    const { ctx, config, pending, sendText, primaryUser } = deps;
    if (!config.forwardQuestions)
        return false;
    const provider = {
        ask(request) {
            return askViaWechat(request, pending, sendText, primaryUser);
        },
    };
    const service = ctx.get?.("userQuestions");
    if (!service) {
        logger.warn("userQuestions: service unavailable; forwarding disabled");
        return false;
    }
    // Web profiles MUST NOT register: host-apiproxy owns the single
    // userQuestions provider slot, and a DUPLICATE_PROVIDER thrown during
    // plugin-tree load would take down the whole harness (v0.8.0 regression).
    // On the WeChat agent, questions already route via the agent-scoped
    // ask_user_question override (tool.ts), so this provider is only a
    // fallback for non-web (headless) deployments.
    if (ctx.get?.("webServer") !== undefined) {
        logger.warn("userQuestions: web profile detected — skipping provider registration (WeChat override handles questions)");
        return false;
    }
    // Check BEFORE registering: only one provider is allowed per context.
    if (service.provider !== undefined) {
        logger.warn("userQuestions: provider already registered; WeChat override handles questions");
        return false;
    }
    const register = service.registerProvider;
    if (typeof register !== "function") {
        // Not an error: this harness simply has no provider seat (DSH 0.1.7+).
        logger.info("userQuestions: this DSH has no provider API (0.1.7 removed it); questions stay in the web UI, approvals still reach WeChat");
        return false;
    }
    try {
        register.call(service, provider);
        logger.info("userQuestions: WeChat provider registered (forwardQuestions=true)");
        return true;
    }
    catch (err) {
        logger.warn(`userQuestions: provider registration skipped — another provider is active (${String(err)}). ` +
            "Web UI questions stay in the browser; only approvals are forwarded to WeChat.");
        return false;
    }
}
function formatQuestion(request) {
    const lines = ["【DSH 提问】"];
    for (const q of request.questions) {
        lines.push(`\n${q.question}`);
        if (q.detail)
            lines.push(`(详情: ${q.detail})`);
        if (q.options?.length) {
            q.options.forEach((opt, i) => {
                lines.push(`  ${i + 1}. ${opt.label}${opt.description ? ` — ${opt.description}` : ""}`);
            });
            lines.push("回复序号或选项文字即可；也可以直接输入自定义回答。");
        }
    }
    return lines.join("\n");
}
function parseAnswer(request, reply) {
    const answers = request.questions.map((q) => {
        const trimmed = reply.trim();
        if (!q.options?.length) {
            // Free-text question: the whole reply is the custom answer.
            return { id: q.id, selected: [], custom: trimmed };
        }
        // Try a 1-based option index first.
        const indexMatch = /^\s*(\d+)\s*$/.exec(trimmed);
        if (indexMatch) {
            const idx = Number(indexMatch[1]) - 1;
            const option = q.options[idx];
            if (option)
                return { id: q.id, selected: [option.label] };
        }
        // Then exact label match.
        const exact = q.options.find((o) => o.label === trimmed);
        if (exact)
            return { id: q.id, selected: [exact.label] };
        // Otherwise treat the reply as a custom answer.
        return { id: q.id, selected: [], custom: trimmed };
    });
    return { answers };
}
function askViaWechat(request, pending, sendText, primaryUser) {
    // When this plugin is the registered provider it is the only human channel,
    // so every question goes to the primary bound WeChat user.
    const target = primaryUser();
    if (!target) {
        logger.warn("userQuestions: no primary WeChat user to forward the question to");
        throw new Error("no primary WeChat user is bound");
    }
    return new Promise((resolveAnswer, rejectAnswer) => {
        // An already-aborted signal never fires its listeners: bail out before
        // registering anything that would then outlive its waiter.
        if (request.signal?.aborted) {
            rejectAnswer(new Error("ask_user_question was aborted before the user answered"));
            return;
        }
        let settled = false;
        const settle = (answer) => {
            if (settled)
                return;
            settled = true;
            resolveAnswer(answer);
        };
        const answer = {
            tag: "question",
            sender: target,
            resolve: (reply) => {
                if (settled)
                    return;
                if (reply === null) {
                    settled = true;
                    rejectAnswer(new Error("ask_user_question was aborted before the user answered"));
                    return;
                }
                settle(parseAnswer(request, reply));
            },
        };
        pending.push(answer);
        // An aborted or undeliverable question leaves the queue, so it cannot
        // swallow the user's next message.
        const withdraw = () => {
            pending.remove(answer);
            answer.resolve(null);
        };
        request.signal?.addEventListener("abort", withdraw, { once: true });
        sendText(target, formatQuestion(request)).catch((err) => {
            if (settled)
                return;
            pending.remove(answer);
            settled = true;
            rejectAnswer(new Error(`failed to forward question to WeChat: ${String(err)}`));
        });
    });
}
//# sourceMappingURL=questions.js.map