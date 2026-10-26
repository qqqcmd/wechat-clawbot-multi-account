export type InstanceClaim = {
    /** 1, 2, 3 … per process, for the logs. */
    readonly id: number;
    /** Still the live instance (no newer one has taken over). */
    isCurrent(): boolean;
    /** Settles once the previous instance has been stopped (never rejects). */
    readonly ready: Promise<void>;
    /** Give the slot up on our own disposal. */
    release(): void;
};
/**
 * Become the live instance. `stop` is what a newer instance calls to retire
 * this one; it must leave nothing running that talks to WeChat.
 */
export declare function claimInstance(stop: (reason: string) => Promise<void>): InstanceClaim;
//# sourceMappingURL=instance-guard.d.ts.map