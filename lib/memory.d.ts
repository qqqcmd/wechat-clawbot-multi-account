/** Sections the memory file is organized into. */
export declare const MEMORY_SECTIONS: readonly ["基本档案", "偏好与习惯", "重要事实", "提醒事项"];
export type MemorySection = (typeof MEMORY_SECTIONS)[number];
export declare const MEMORY_MAX_LINES = 500;
/** Path of the memory file: <state-dir>/memory.md. */
export declare function memoryFilePath(): string;
/**
 * Ensure the memory file exists; when absent (fresh install), seed it with
 * a starter template so the file is immediately visible/editable.
 */
export declare function ensureMemoryFile(): void;
/** Read the current memory text (empty string when absent/unreadable). */
export declare function loadMemoryText(): string;
/**
 * Words that make a memory entry go stale by tomorrow. memory.md is read into
 * EVERY system prompt, so "明天十点开会" is actively wrong the next day and
 * misleads the model's date math.
 */
export declare const STALE_BY_TOMORROW: RegExp;
/**
 * Why an entry must NOT go into long-term memory, or null when it may.
 *
 * One-off reminders belong to schedule_create. This is the single write
 * chokepoint for both writers — the auto-memory classifier and the model's own
 * remember_user_info — because each broke the rule on its own: measured
 * 2026-09-23, the classifier filed 16 one-off reminders and the tool 2, the
 * tool because its own description invited "reminders for later".
 */
export declare function oneOffReminderReason(section: string | undefined, content: string): string | null;
/**
 * Append one memory entry to a section (creating the section when missing).
 * Entries are bullet lines; duplicates (same text already present anywhere)
 * are skipped so the file does not grow unboundedly from repeated facts.
 * Returns whether the file changed.
 */
export declare function appendMemoryEntry(section: string, content: string): boolean;
/** Human-readable summary of the memory file state (for logs/tests). */
export declare function memoryStats(): {
    lines: number;
    sections: string[];
};
//# sourceMappingURL=memory.d.ts.map