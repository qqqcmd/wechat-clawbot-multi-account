/** A still-pending reminder from a version-1 `schedule/change` stream. */
export type LegacyReminder = {
    id: string;
    kind: "after" | "at" | "every";
    prompt: string;
    scheduledAt: string;
    everySeconds?: number;
};
/** The slice of rc.2's `schedule` service this module calls. */
export type HostSchedule = {
    create(sessionId: string, request: Record<string, unknown>): Promise<{
        id: string;
        scheduledAt: string;
    }>;
    list(request: {
        sessionId: string;
    }): Promise<ReadonlyArray<{
        id: string;
        prompt: string;
        scheduledAt: string;
    }>>;
};
type EventLike = {
    type: string;
    data?: unknown;
};
/**
 * rc.2's service answers `create(sessionId, request)` and `catalog()`; rc.1
 * provides no `schedule` service at all. Anything else is left alone rather
 * than guessed at.
 */
export declare function isHostSchedule(value: unknown): value is HostSchedule;
/**
 * Replay version-1 `schedule/change` events into the reminders still active.
 * Same transitions as the host's fold (create adds, delete removes, dispatch
 * retires a one-shot and advances an `every`), but lenient: an event the
 * host would reject is skipped instead of failing the whole Session.
 */
export declare function foldLegacyReminders(events: Iterable<EventLike>): LegacyReminder[];
/**
 * rc.2 requires a title (1–120 chars) and never derives one itself. The
 * legacy prompt is what the bot showed the user, so name the task after it,
 * minus the "提醒:" lead-in the bot tends to write.
 */
export declare function reminderTitle(prompt: string): string;
/** How late a one-shot may be and still be delivered (rc.1 caught up on restart too). */
export declare const CATCH_UP_MS: number;
export type MigrationStep = {
    legacy: LegacyReminder;
    action: "create";
    request: Record<string, unknown>;
} | {
    legacy: LegacyReminder;
    action: "present";
} | {
    legacy: LegacyReminder;
    action: "skip";
    reason: string;
};
/**
 * Decide what to do with each legacy reminder that has not been handled yet.
 * @param legacy - active reminders folded from the Session log.
 * @param existing - the Session's active tasks already in the Host table.
 * @param handled - legacy ids recorded in the marker file.
 * @param now - current wall clock in epoch milliseconds.
 */
export declare function planLegacyMigration(legacy: readonly LegacyReminder[], existing: ReadonlyArray<{
    prompt: string;
    scheduledAt: string;
}>, handled: ReadonlySet<string>, now: number): MigrationStep[];
export type MigrationReport = {
    created: Array<{
        legacyId: string;
        hostId: string;
        scheduledAt: string;
    }>;
    present: string[];
    skipped: Array<{
        legacyId: string;
        reason: string;
    }>;
};
/**
 * Recreate the Session's pending legacy reminders in the Host table, once.
 * The marker is written after every successful create, so a failure part-way
 * leaves the rest for the next start and never duplicates what went through.
 */
export declare function migrateLegacyReminders(options: {
    schedule: HostSchedule;
    sessionId: string;
    events: Iterable<EventLike>;
    markerPath: string;
    now?: () => number;
}): Promise<MigrationReport>;
export {};
//# sourceMappingURL=schedule-migrate.d.ts.map