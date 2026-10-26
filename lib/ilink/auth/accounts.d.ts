export declare const DEFAULT_BASE_URL = "https://ilinkai.weixin.qq.com";
export declare const CDN_BASE_URL = "https://novac2c.cdn.weixin.qq.com/c2c";
/** Configure the `bot_agent` value reported in every iLink request. */
export declare function setBotAgent(agent: string | undefined): void;
/**
 * Normalize a raw account id (`xxx@im.bot`) to a filesystem-safe form
 * (`xxx-im-bot`). Mirrors OpenClaw's `normalizeAccountId`.
 */
export declare function normalizeAccountId(raw: string): string;
/**
 * Derive the legacy raw account id from a normalized one, when applicable.
 * `b0f5860fdecb-im-bot` → `b0f5860fdecb@im.bot`.
 */
export declare function deriveRawAccountId(normalizedId: string): string | undefined;
export type WeixinAccountData = {
    token?: string;
    savedAt?: string;
    baseUrl?: string;
    /** Last linked Weixin user id from QR login (optional). */
    userId?: string;
};
/** Load account data by ID (normalized or raw). */
export declare function loadWeixinAccount(accountId: string): WeixinAccountData | null;
/**
 * Persist account data after QR login (merges into existing file).
 * - token: overwritten when provided.
 * - baseUrl: stored when non-empty; resolveWeixinAccount falls back to DEFAULT_BASE_URL.
 * - userId: set when `update.userId` is provided; omitted from file when cleared to empty.
 */
export declare function saveWeixinAccount(accountId: string, update: {
    token?: string;
    baseUrl?: string;
    userId?: string;
}): void;
/** Remove all files associated with an account. */
export declare function clearWeixinAccount(accountId: string): void;
/** List account ids present in the state directory. */
export declare function listIndexedWeixinAccountIds(): string[];
/** Register an account id (no-op: ids are discovered from the directory). */
export declare function registerWeixinAccountId(_accountId: string): void;
/** Unregister an account id (no-op, see {@link registerWeixinAccountId}). */
export declare function unregisterWeixinAccountId(_accountId: string): void;
/** Remove stored accounts whose `userId` matches and that are not in `keepIds`. */
export declare function clearStaleAccountsForUserId(userId: string, keepIds: string[]): void;
/** Read the SKRouteTag for an account (unused by the DSH plugin; kept for API compat). */
export declare function loadConfigRouteTag(_accountId?: string): string | undefined;
/** Read the configured bot agent string for `base_info`. */
export declare function loadConfigBotAgent(): string | undefined;
/** Channel reload hook (kept for API compat; the DSH plugin reacts to file changes instead). */
export declare function triggerWeixinChannelReload(): Promise<void>;
export type ResolvedWeixinAccount = {
    accountId: string;
    baseUrl: string;
    cdnBaseUrl: string;
    token?: string;
    enabled: boolean;
    /** true when a token has been obtained via QR login. */
    configured: boolean;
    name?: string;
    /** Last linked Weixin user id from QR login (optional). */
    userId?: string;
};
/** List account ids from the state directory. */
export declare function listWeixinAccountIds(): string[];
/** Resolve a weixin account by ID, merging config and stored credentials. */
export declare function resolveWeixinAccount(accountId?: string | null): ResolvedWeixinAccount;
//# sourceMappingURL=accounts.d.ts.map