/** Directory holding per-account runtime data (context tokens etc.). */
export declare function accountsRuntimeDir(accountId: string): string;
export declare function contextTokensPath(accountId: string): string;
/**
 * Read the stored context token for a sender (empty string when absent).
 * Falls back to a case-insensitive scan so tokens persisted by pre-3.1.0
 * builds (mixed-case keys) keep working after the normalization upgrade.
 */
export declare function loadContextToken(accountId: string, userId: string): string;
/** Persist a sender's latest context token. */
export declare function saveContextToken(accountId: string, userId: string, token: string): void;
/** Path of the marker recording that we created the WeChat session. */
export declare function sessionMarkerPath(sessionId: string): string;
/** Whether the WeChat session was previously created by this plugin. */
export declare function wasSessionCreated(sessionId: string): boolean;
/** Record that the WeChat session was created by this plugin. */
export declare function markSessionCreated(sessionId: string): void;
export type StateWatcher = {
    close(): void;
};
/**
 * Watch the ClawBot state directory for account credential changes made by
 * the `clawbot` CLI while the profile is running (login/logout). Callbacks
 * are debounced to collapse rename-then-write sequences.
 */
export declare function watchAccountStore(onChange: () => void): StateWatcher;
//# sourceMappingURL=state.d.ts.map