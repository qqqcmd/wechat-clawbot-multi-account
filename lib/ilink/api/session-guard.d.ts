/** Error code returned by the server when the bot token is stale / expired. */
export declare const STALE_TOKEN_ERRCODE = -14;
/** Pause all inbound/outbound API calls for `accountId` for one hour. */
export declare function pauseSession(accountId: string): void;
/** Returns `true` when the bot is still within its one-hour cooldown window. */
export declare function isSessionPaused(accountId: string): boolean;
/** Milliseconds remaining until the pause expires (0 when not paused). */
export declare function getRemainingPauseMs(accountId: string): number;
/** Throw if the session is currently paused. Call before any API request. */
export declare function assertSessionActive(accountId: string): void;
/**
 * Reset internal state — only for tests.
 * @internal
 */
export declare function _resetForTest(): void;
//# sourceMappingURL=session-guard.d.ts.map