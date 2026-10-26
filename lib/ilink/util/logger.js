/**
 * Minimal leveled logger for the vendored iLink protocol layer.
 *
 * Drop-in replacement for the OpenClaw-bound logger used by
 * `@tencent-weixin/openclaw-weixin`: same surface (`debug/info/warn/error`
 * plus `withAccount`), but writes to stderr with a simple level filter so the
 * protocol code can be vendored verbatim.
 */
const LEVEL_ORDER = {
    debug: 10,
    info: 20,
    warn: 30,
    error: 40,
};
let currentLevel = process.env.CLAWBOT_LOG_LEVEL ?? "info";
/** Change the global log level at runtime (e.g. from plugin config). */
export function setLogLevel(level) {
    if (level in LEVEL_ORDER)
        currentLevel = level;
}
function enabled(level) {
    return LEVEL_ORDER[level] >= LEVEL_ORDER[currentLevel];
}
function format(level, account, args) {
    const ts = new Date().toISOString();
    const tag = account ? `[clawbot:${account}]` : "[clawbot]";
    const body = args
        .map((a) => (typeof a === "string" ? a : safeStringify(a)))
        .join(" ");
    return `${ts} ${level.toUpperCase()} ${tag} ${body}`;
}
function safeStringify(value) {
    try {
        if (value instanceof Error)
            return String(value);
        return JSON.stringify(value) ?? String(value);
    }
    catch {
        return String(value);
    }
}
export const logger = {
    debug(...args) {
        if (enabled("debug"))
            process.stderr.write(format("debug", undefined, args) + "\n");
    },
    info(...args) {
        if (enabled("info"))
            process.stderr.write(format("info", undefined, args) + "\n");
    },
    warn(...args) {
        if (enabled("warn"))
            process.stderr.write(format("warn", undefined, args) + "\n");
    },
    error(...args) {
        if (enabled("error"))
            process.stderr.write(format("error", undefined, args) + "\n");
    },
    withAccount(accountId) {
        const scoped = (level) => (...args) => {
            if (enabled(level))
                process.stderr.write(format(level, accountId, args) + "\n");
        };
        return {
            debug: scoped("debug"),
            info: scoped("info"),
            warn: scoped("warn"),
            error: scoped("error"),
            withAccount: () => logger,
        };
    },
};
//# sourceMappingURL=logger.js.map