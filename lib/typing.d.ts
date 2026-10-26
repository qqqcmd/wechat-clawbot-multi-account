/**
 * 「对方正在输入…」while the bot works on a reply.
 *
 * Same rhythm as the official OpenClaw channel (@tencent-weixin/openclaw-weixin):
 * TYPING is re-sent every 5 s while a turn runs, CANCEL is sent when it ends,
 * and the per-user typing ticket comes from getconfig and is cached for up to a
 * day. Everything here is best effort — a failed indicator must never delay or
 * break the reply itself, so nothing in this class throws or blocks a caller.
 */
import { getConfig, sendTyping } from "./ilink/api/api.js";
type TypingAccount = {
    baseUrl: string;
    token?: string;
};
export type TypingDeps = {
    getAccount: () => TypingAccount | null | undefined;
    getContextToken: (sender: string) => string;
    /**
     * True while the bot is waiting for this sender to answer (an approval or a
     * question). The bot is not typing then — the user is — so the indicator
     * pauses instead of claiming otherwise.
     */
    isWaitingFor: (sender: string) => boolean;
    keepaliveMs?: number;
    /** The two iLink calls; injectable so tests run without the network. */
    api?: {
        getConfig: typeof getConfig;
        sendTyping: typeof sendTyping;
    };
};
export declare class TypingIndicator {
    private readonly deps;
    private readonly keepaliveMs;
    private readonly api;
    private readonly tickets;
    /** Whom the indicator is currently running for. */
    private sender;
    private timer;
    /** Whether the phone shows us as typing, as far as we know. */
    private shown;
    private failures;
    /** A tick's requests are in flight (its timer has already fired). */
    private busy;
    constructor(deps: TypingDeps);
    /** Show typing to `sender` until stop(). Already running for them = no-op. */
    start(sender: string): void;
    /**
     * A message just reached the phone. WeChat clears the indicator by itself on
     * arrival, so wait a whole interval before showing it again: the reply that
     * ends a turn would otherwise be followed by a flash of 「正在输入」.
     */
    noteDelivered(sender: string): void;
    stop(): void;
    dispose(): void;
    /** Whether the indicator is running for anyone (for tests and logs). */
    get activeFor(): string | undefined;
    private clearTimer;
    private schedule;
    private tick;
    private step;
    /** One sendtyping request; returns whether it went through. */
    private send;
    private ticketFor;
}
export {};
//# sourceMappingURL=typing.d.ts.map