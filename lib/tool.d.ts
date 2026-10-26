import type { Context } from "@deepseek-ai/cordis";
import type { ClawbotConfig } from "./config.js";
import type { WechatBridge } from "./bridge.js";
import type { ResolvedWeixinAccount } from "./ilink/auth/accounts.js";
export type SendFileToolDeps = {
    /** The live bridge (sender routing), or null while the monitor is down. */
    getBridge: () => WechatBridge | null;
    /** The bound account (API credentials), or null before first login. */
    getAccount: () => ResolvedWeixinAccount | null;
    config: ClawbotConfig;
};
/** Register the tool into one agent's scoped world (call from setup). */
export declare function registerSendFileTool(agentCtx: Context, deps: SendFileToolDeps): void;
//# sourceMappingURL=tool.d.ts.map