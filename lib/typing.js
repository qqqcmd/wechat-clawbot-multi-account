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
import { TypingStatus } from "./ilink/api/types.js";
import { logger } from "./ilink/util/logger.js";
const KEEPALIVE_MS = 5_000;
const TICKET_TTL_MS = 24 * 60 * 60 * 1000;
const TICKET_RETRY_MS = 60_000;
/** Consecutive failures after which a turn stops trying (the account is likely offline). */
const MAX_FAILURES = 3;
export class TypingIndicator {
    deps;
    keepaliveMs;
    api;
    tickets = new Map();
    /** Whom the indicator is currently running for. */
    sender;
    timer;
    /** Whether the phone shows us as typing, as far as we know. */
    shown = false;
    failures = 0;
    /** A tick's requests are in flight (its timer has already fired). */
    busy = false;
    constructor(deps) {
        this.deps = deps;
        this.keepaliveMs = deps.keepaliveMs ?? KEEPALIVE_MS;
        this.api = deps.api ?? { getConfig, sendTyping };
    }
    /** Show typing to `sender` until stop(). Already running for them = no-op. */
    start(sender) {
        if (this.sender === sender && (this.timer !== undefined || this.busy))
            return;
        if (this.sender !== undefined && this.sender !== sender)
            this.stop();
        this.sender = sender;
        this.failures = 0;
        this.schedule(0);
    }
    /**
     * A message just reached the phone. WeChat clears the indicator by itself on
     * arrival, so wait a whole interval before showing it again: the reply that
     * ends a turn would otherwise be followed by a flash of 「正在输入」.
     */
    noteDelivered(sender) {
        if (this.sender !== sender)
            return;
        this.shown = false;
        this.schedule(this.keepaliveMs);
    }
    stop() {
        const sender = this.sender;
        this.clearTimer();
        this.sender = undefined;
        if (sender !== undefined && this.shown)
            void this.send(sender, TypingStatus.CANCEL);
        this.shown = false;
    }
    dispose() {
        this.stop();
    }
    /** Whether the indicator is running for anyone (for tests and logs). */
    get activeFor() {
        return this.sender;
    }
    clearTimer() {
        if (this.timer !== undefined)
            clearTimeout(this.timer);
        this.timer = undefined;
    }
    schedule(delayMs) {
        this.clearTimer();
        const timer = setTimeout(() => { void this.tick(); }, delayMs);
        timer.unref?.();
        this.timer = timer;
    }
    async tick() {
        const sender = this.sender;
        if (sender === undefined)
            return;
        this.timer = undefined;
        this.busy = true;
        try {
            await this.step(sender);
        }
        finally {
            this.busy = false;
        }
        if (this.sender === sender && this.timer === undefined && this.failures < MAX_FAILURES) {
            this.schedule(this.keepaliveMs);
        }
    }
    async step(sender) {
        if (this.deps.isWaitingFor(sender)) {
            if (this.shown) {
                this.shown = false;
                await this.send(sender, TypingStatus.CANCEL);
            }
        }
        else {
            const ok = await this.send(sender, TypingStatus.TYPING);
            // stop() may have run while the request was in flight: take it back down.
            if (this.sender !== sender) {
                if (ok)
                    void this.send(sender, TypingStatus.CANCEL);
                return;
            }
            if (ok)
                this.shown = true;
        }
    }
    /** One sendtyping request; returns whether it went through. */
    async send(sender, status) {
        const account = this.deps.getAccount();
        if (!account?.token)
            return false;
        const ticket = await this.ticketFor(sender, account);
        if (ticket === undefined) {
            this.failures += 1;
            return false;
        }
        try {
            await this.api.sendTyping({
                baseUrl: account.baseUrl,
                token: account.token,
                body: { ilink_user_id: sender, typing_ticket: ticket, status },
                timeoutMs: 5_000,
            });
            this.failures = 0;
            return true;
        }
        catch (err) {
            this.failures += 1;
            // A stale ticket is the likely cause: fetch a fresh one next time.
            this.tickets.delete(sender);
            logger.debug(`typing: ${status === TypingStatus.TYPING ? "typing" : "cancel"} failed (${this.failures}): ${String(err)}`);
            return false;
        }
    }
    async ticketFor(sender, account) {
        const now = Date.now();
        const cached = this.tickets.get(sender);
        if (cached !== undefined && now < cached.nextFetchAt)
            return cached.ticket || undefined;
        try {
            const resp = await this.api.getConfig({
                baseUrl: account.baseUrl,
                token: account.token,
                ilinkUserId: sender,
                contextToken: this.deps.getContextToken(sender) || undefined,
                timeoutMs: 5_000,
            });
            const ticket = resp.ret === undefined || resp.ret === 0 ? resp.typing_ticket ?? "" : "";
            // Spread refreshes over the day, like the official channel does.
            this.tickets.set(sender, {
                ticket,
                nextFetchAt: now + (ticket ? Math.random() * TICKET_TTL_MS : TICKET_RETRY_MS),
            });
            return ticket || undefined;
        }
        catch (err) {
            this.tickets.set(sender, { ticket: "", nextFetchAt: now + TICKET_RETRY_MS });
            logger.debug(`typing: getconfig failed: ${String(err)}`);
            return undefined;
        }
    }
}
//# sourceMappingURL=typing.js.map