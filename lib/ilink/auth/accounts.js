/**
 * Weixin account credential storage for the vendored iLink protocol layer.
 *
 * Adapted from `@tencent-weixin/openclaw-weixin` (MIT) `src/auth/accounts.ts`:
 * the OpenClaw config dependency is replaced by a plain per-account JSON store
 * under the DSH ClawBot state directory, keeping the same public surface so
 * the vendored protocol code compiles unchanged.
 */
import fs from "node:fs";
import path from "node:path";
import { resolveStateDir } from "../storage/state-dir.js";
export const DEFAULT_BASE_URL = "https://ilinkai.weixin.qq.com";
export const CDN_BASE_URL = "https://novac2c.cdn.weixin.qq.com/c2c";
/** Bot agent string sent to the iLink server; overridable via {@link setBotAgent}. */
let botAgent = "DSH-ClawBot/0.1.0";
/** Configure the `bot_agent` value reported in every iLink request. */
export function setBotAgent(agent) {
    if (agent?.trim())
        botAgent = agent.trim();
}
/**
 * Normalize a raw account id (`xxx@im.bot`) to a filesystem-safe form
 * (`xxx-im-bot`). Mirrors OpenClaw's `normalizeAccountId`.
 */
export function normalizeAccountId(raw) {
    return raw.trim().replace(/[@.]/g, "-").replace(/[\\/:*?"<>|]/g, "_");
}
/**
 * Derive the legacy raw account id from a normalized one, when applicable.
 * `b0f5860fdecb-im-bot` → `b0f5860fdecb@im.bot`.
 */
export function deriveRawAccountId(normalizedId) {
    if (normalizedId.endsWith("-im-bot")) {
        return `${normalizedId.slice(0, -7)}@im.bot`;
    }
    if (normalizedId.endsWith("-im-wechat")) {
        return `${normalizedId.slice(0, -10)}@im.wechat`;
    }
    return undefined;
}
function resolveAccountsDir() {
    return path.join(resolveStateDir(), "accounts");
}
function resolveAccountPath(accountId) {
    return path.join(resolveAccountsDir(), `${accountId}.json`);
}
function readAccountFile(filePath) {
    try {
        if (fs.existsSync(filePath)) {
            return JSON.parse(fs.readFileSync(filePath, "utf-8"));
        }
    }
    catch {
        // ignore
    }
    return null;
}
/** Load account data by ID (normalized or raw). */
export function loadWeixinAccount(accountId) {
    const primary = readAccountFile(resolveAccountPath(accountId));
    if (primary)
        return primary;
    const rawId = deriveRawAccountId(accountId);
    if (rawId) {
        const compat = readAccountFile(resolveAccountPath(rawId));
        if (compat)
            return compat;
    }
    return null;
}
/**
 * Persist account data after QR login (merges into existing file).
 * - token: overwritten when provided.
 * - baseUrl: stored when non-empty; resolveWeixinAccount falls back to DEFAULT_BASE_URL.
 * - userId: set when `update.userId` is provided; omitted from file when cleared to empty.
 */
export function saveWeixinAccount(accountId, update) {
    const dir = resolveAccountsDir();
    fs.mkdirSync(dir, { recursive: true });
    const existing = loadWeixinAccount(accountId) ?? {};
    const token = update.token?.trim() || existing.token;
    const baseUrl = update.baseUrl?.trim() || existing.baseUrl;
    const userId = update.userId !== undefined
        ? update.userId.trim() || undefined
        : existing.userId?.trim() || undefined;
    const data = {
        ...(token ? { token, savedAt: new Date().toISOString() } : {}),
        ...(baseUrl ? { baseUrl } : {}),
        ...(userId ? { userId } : {}),
    };
    const filePath = resolveAccountPath(accountId);
    const tmpPath = `${filePath}.tmp`;
    fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), "utf-8");
    fs.renameSync(tmpPath, filePath);
    try {
        fs.chmodSync(filePath, 0o600);
    }
    catch {
        // best-effort
    }
}
/** Remove all files associated with an account. */
export function clearWeixinAccount(accountId) {
    const dir = resolveAccountsDir();
    const accountFiles = [
        `${accountId}.json`,
        `${accountId}.sync.json`,
        `${accountId}.context-tokens.json`,
    ];
    for (const file of accountFiles) {
        try {
            fs.unlinkSync(path.join(dir, file));
        }
        catch {
            // ignore
        }
    }
}
/** List account ids present in the state directory. */
export function listIndexedWeixinAccountIds() {
    const dir = resolveAccountsDir();
    try {
        if (!fs.existsSync(dir))
            return [];
        return fs
            .readdirSync(dir)
            .filter((f) => f.endsWith(".json") && !f.endsWith(".sync.json") && !f.endsWith(".context-tokens.json"))
            .map((f) => f.slice(0, -".json".length))
            .filter((id) => !id.endsWith(".tmp"));
    }
    catch {
        return [];
    }
}
/** Register an account id (no-op: ids are discovered from the directory). */
export function registerWeixinAccountId(_accountId) {
    // nothing to do — the store is directory-scanned
}
/** Unregister an account id (no-op, see {@link registerWeixinAccountId}). */
export function unregisterWeixinAccountId(_accountId) {
    // nothing to do
}
/** Remove stored accounts whose `userId` matches and that are not in `keepIds`. */
export function clearStaleAccountsForUserId(userId, keepIds) {
    const keep = new Set(keepIds);
    for (const id of listIndexedWeixinAccountIds()) {
        if (keep.has(id))
            continue;
        const data = loadWeixinAccount(id);
        if (data?.userId === userId)
            clearWeixinAccount(id);
    }
}
/** Read the SKRouteTag for an account (unused by the DSH plugin; kept for API compat). */
export function loadConfigRouteTag(_accountId) {
    return undefined;
}
/** Read the configured bot agent string for `base_info`. */
export function loadConfigBotAgent() {
    return botAgent;
}
/** Channel reload hook (kept for API compat; the DSH plugin reacts to file changes instead). */
export async function triggerWeixinChannelReload() {
    // no-op
}
/** List account ids from the state directory. */
export function listWeixinAccountIds() {
    return listIndexedWeixinAccountIds();
}
/** Resolve a weixin account by ID, merging config and stored credentials. */
export function resolveWeixinAccount(accountId) {
    const raw = accountId?.trim();
    if (!raw) {
        throw new Error("weixin: accountId is required (no default account)");
    }
    const id = normalizeAccountId(raw);
    const accountData = loadWeixinAccount(id);
    const token = accountData?.token?.trim() || undefined;
    const stateBaseUrl = accountData?.baseUrl?.trim() || "";
    return {
        accountId: id,
        baseUrl: stateBaseUrl || DEFAULT_BASE_URL,
        cdnBaseUrl: CDN_BASE_URL,
        token,
        enabled: true,
        configured: Boolean(token),
        userId: accountData?.userId?.trim() || undefined,
    };
}
//# sourceMappingURL=accounts.js.map