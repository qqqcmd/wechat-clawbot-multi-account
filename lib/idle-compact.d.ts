/** Quiet period after the last turn before the size is checked. */
export declare const IDLE_COMPACT_DELAY_MS: number;
/** Compact once the last request reached this share of the host's threshold. */
export declare const IDLE_COMPACT_RATIO = 0.85;
/**
 * The token count at which the host's compaction-basic compacts before a step,
 * with its default policy: `min(window × 0.8, window − maxTokens − 65536)`.
 * Undefined when the route does not declare a usable window.
 */
export declare function hostCompactionThreshold(contextWindow: unknown, maxTokens: unknown): number | undefined;
export type IdleCompactDeps = {
    /** The owner's switch (config `idleCompaction`), read each time. */
    enabled: () => boolean;
    /** A turn running, a message queued, or a question waiting on the owner. */
    isBusy: () => boolean;
    /** Tokens the session's last model request carried, as the provider reported. */
    lastRequestTokens: () => number | undefined;
    /** The host's compaction threshold for the current route. */
    hostThreshold: () => Promise<number | undefined>;
    /** Run the host's `/compact` on the session; undefined when it is not available. */
    compact: (signal: AbortSignal) => Promise<{
        ok: boolean;
        text: string;
    } | undefined>;
    /** The history was just compacted: forget the last request size. */
    onCompacted?: () => void;
    delayMs?: number;
    ratio?: number;
};
export declare class IdleCompactor {
    private readonly deps;
    private timer;
    private running;
    private disposed;
    constructor(deps: IdleCompactDeps);
    /** A turn ended and nothing is queued: (re)start the quiet-period clock. */
    noteIdle(): void;
    /** Something happened (a message, a new turn): the session is not quiet. */
    noteActivity(): void;
    dispose(): void;
    /** Whether a quiet-period check is pending (for tests and logs). */
    get pending(): boolean;
    private clear;
    /** One check after the quiet period; exposed for tests. */
    check(): Promise<void>;
}
//# sourceMappingURL=idle-compact.d.ts.map