import type { ResolvedWeixinAccount } from "./ilink/auth/accounts.js";
import type { WeixinMessage } from "./ilink/api/types.js";
export type MonitorOptions = {
    account: ResolvedWeixinAccount;
    /** Called for every inbound message, in order. */
    onMessage: (msg: WeixinMessage) => Promise<void> | void;
    /** Called when the monitor stops (token stale, abort, fatal error). */
    onStop: (reason: string) => void;
    signal: AbortSignal;
};
/** Run the monitor loop until `signal` aborts or the session goes stale. */
export declare function runMonitor(opts: MonitorOptions): Promise<void>;
//# sourceMappingURL=monitor.d.ts.map