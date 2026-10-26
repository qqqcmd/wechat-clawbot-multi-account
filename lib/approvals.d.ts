/**
 * Approval relay: forwards `approval/request` questions for WeChat-owned
 * agents into WeChat and maps the user's reply back to an approval outcome.
 *
 * Follows the ACP-bridge pattern: the listener only answers requests whose
 * agent belongs to the WeChat session and delegates everything else with
 * `next()`.
 */
import type { Context } from "@deepseek-ai/cordis";
import type { ClawbotConfig } from "./config.js";
import type { WechatBridge } from "./bridge.js";
import { PendingRegistry } from "./pending.js";
export declare class ApprovalRelay {
    private readonly config;
    private readonly getBridge;
    private readonly pending;
    private readonly sendText;
    constructor(deps: {
        config: ClawbotConfig;
        /** Returns the live bridge, or null while the monitor is not running. */
        getBridge: () => WechatBridge | null;
        pending: PendingRegistry;
        sendText: (to: string, text: string) => Promise<void>;
    });
    /** Register the `approval/request` waterfall listener on the root context. */
    register(ctx: Context): void;
    private answer;
}
//# sourceMappingURL=approvals.d.ts.map