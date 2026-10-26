/**
 * Shared registry for pending WeChat interactions (approval questions, user
 * questions). One inbound WeChat text can resolve at most one pending
 * interaction for its sender; everything else is treated as a new agent turn.
 */
import { logger } from "./ilink/util/logger.js";
export class PendingRegistry {
    queue = [];
    /** Register a pending interaction. */
    push(answer) {
        this.queue.push(answer);
    }
    /** Whether the bot is waiting for this sender to answer something. */
    hasFor(sender) {
        return this.queue.some((a) => a.sender === sender);
    }
    /** How many interactions are waiting for an answer from anyone. */
    get size() {
        return this.queue.length;
    }
    /** Pop the oldest pending interaction for a sender, if any. */
    popFor(sender) {
        const index = this.queue.findIndex((a) => a.sender === sender);
        if (index < 0)
            return undefined;
        const [answer] = this.queue.splice(index, 1);
        return answer;
    }
    /**
     * Withdraw one interaction that ended without a reply (aborted, timed out).
     * It must leave the queue: otherwise the sender's next WeChat message is
     * taken as the answer to a question nobody waits for any more, and is lost.
     */
    remove(answer) {
        const index = this.queue.indexOf(answer);
        if (index < 0)
            return false;
        this.queue.splice(index, 1);
        return true;
    }
    /** Remove and abort every pending interaction for a sender (on logout etc.). */
    abortFor(sender) {
        for (let i = this.queue.length - 1; i >= 0; i -= 1) {
            if (this.queue[i].sender === sender) {
                const [answer] = this.queue.splice(i, 1);
                answer.resolve(null);
            }
        }
    }
    /** Abort all pending interactions (on monitor stop). */
    abortAll() {
        const all = this.queue.splice(0);
        for (const answer of all)
            answer.resolve(null);
        logger.info(`PendingRegistry: aborted ${all.length} pending interactions`);
    }
}
//# sourceMappingURL=pending.js.map