import type { WeixinMessage } from "./ilink/api/types.js";
import type { ResolvedWeixinAccount } from "./ilink/auth/accounts.js";
import type { ClawbotConfig } from "./config.js";
import type { WechatBridge } from "./bridge.js";
import { PendingRegistry } from "./pending.js";
/** True when the message carries any item that is not plain text. */
export declare function hasNonTextItem(msg: WeixinMessage): boolean;
export declare class InboundRouter {
    private readonly config;
    private readonly account;
    private readonly bridge;
    private readonly pending;
    private readonly sendText;
    constructor(deps: {
        config: ClawbotConfig;
        account: ResolvedWeixinAccount;
        bridge: WechatBridge;
        pending: PendingRegistry;
        sendText: (to: string, text: string) => Promise<void>;
    });
    /** Whether a sender may talk to the agent. */
    isAllowed(sender: string): boolean;
    /** Handle one inbound message from the monitor. */
    handle(msg: WeixinMessage): Promise<void>;
    /** Context token for an outbound message to a sender ("" when unknown). */
    contextTokenFor(sender: string): string;
}
//# sourceMappingURL=inbound.d.ts.map