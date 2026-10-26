export interface PendingAnswer {
    /** Distinguishes the kind of pending interaction ("approval" | "question"). */
    readonly tag: string;
    /** The WeChat user id expected to answer. */
    readonly sender: string;
    /**
     * Resolve with the raw reply text, or `null` when the interaction was
     * aborted (e.g. the approval signal fired). Idempotent.
     */
    resolve: (reply: string | null) => void;
}
export declare class PendingRegistry {
    private readonly queue;
    /** Register a pending interaction. */
    push(answer: PendingAnswer): void;
    /** Whether the bot is waiting for this sender to answer something. */
    hasFor(sender: string): boolean;
    /** How many interactions are waiting for an answer from anyone. */
    get size(): number;
    /** Pop the oldest pending interaction for a sender, if any. */
    popFor(sender: string): PendingAnswer | undefined;
    /**
     * Withdraw one interaction that ended without a reply (aborted, timed out).
     * It must leave the queue: otherwise the sender's next WeChat message is
     * taken as the answer to a question nobody waits for any more, and is lost.
     */
    remove(answer: PendingAnswer): boolean;
    /** Remove and abort every pending interaction for a sender (on logout etc.). */
    abortFor(sender: string): void;
    /** Abort all pending interactions (on monitor stop). */
    abortAll(): void;
}
//# sourceMappingURL=pending.d.ts.map