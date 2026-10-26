/**
 * Guarded `userQuestions` provider: forwards `ask_user_question` / plan-review
 * prompts to WeChat when the plugin is the registered provider.
 *
 * Only one provider may exist per context. The Web UI registers its provider
 * when a browser is attached, so this registration is attempted once at boot
 * and skipped (with a warning) on `DUPLICATE_PROVIDER`. When this plugin IS
 * the provider, questions from any agent are sent to the primary bound WeChat
 * user — in such a deployment that user is the only human channel.
 */
import type { Context } from "@deepseek-ai/cordis";
import type { ClawbotConfig } from "./config.js";
import { PendingRegistry } from "./pending.js";
export declare function tryRegisterQuestionProvider(deps: {
    ctx: Context;
    config: ClawbotConfig;
    pending: PendingRegistry;
    sendText: (to: string, text: string) => Promise<void>;
    primaryUser: () => string | undefined;
}): boolean;
//# sourceMappingURL=questions.d.ts.map