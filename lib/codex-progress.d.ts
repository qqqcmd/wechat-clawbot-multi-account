/** Small, process-local status cache; no transcripts, workspace indexes, or credentials on disk. */
export declare const CODEX_PROGRESS_STATES: readonly ["running", "waiting", "completed", "failed", "interrupted"];
export type CodexProgressState = typeof CODEX_PROGRESS_STATES[number];
export type CodexProgress = {
    threadId: string;
    cwd?: string;
    turnId?: string;
    state: CodexProgressState;
    summary: string;
    updatedAt: string;
    source: "codex-mcp" | "app-server";
};
export declare class CodexProgressStore {
    private readonly entries;
    report(input: Omit<CodexProgress, "updatedAt">): CodexProgress;
    list(threadId?: string): CodexProgress[];
}
//# sourceMappingURL=codex-progress.d.ts.map