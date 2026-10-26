/**
 * Path to the persistent get_updates_buf file for an account.
 * Stored alongside account data: ~/.openclaw/openclaw-weixin/accounts/{accountId}.sync.json
 */
export declare function getSyncBufFilePath(accountId: string): string;
export type SyncBufData = {
    get_updates_buf: string;
};
/**
 * Load persisted get_updates_buf.
 * Falls back in order:
 *   1. Primary path (normalized accountId, new installs)
 *   2. Compat path (raw accountId derived from pattern, old installs)
 *   3. Legacy single-account path (very old installs without multi-account support)
 */
export declare function loadGetUpdatesBuf(filePath: string): string | undefined;
/**
 * Persist get_updates_buf. Creates parent dir if needed.
 */
export declare function saveGetUpdatesBuf(filePath: string, getUpdatesBuf: string): void;
//# sourceMappingURL=sync-buf.d.ts.map