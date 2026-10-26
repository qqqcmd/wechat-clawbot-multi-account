/**
 * Minimal leveled logger for the vendored iLink protocol layer.
 *
 * Drop-in replacement for the OpenClaw-bound logger used by
 * `@tencent-weixin/openclaw-weixin`: same surface (`debug/info/warn/error`
 * plus `withAccount`), but writes to stderr with a simple level filter so the
 * protocol code can be vendored verbatim.
 */
export type LogLevel = "debug" | "info" | "warn" | "error";
/** Change the global log level at runtime (e.g. from plugin config). */
export declare function setLogLevel(level: LogLevel): void;
export interface Logger {
    debug(...args: unknown[]): void;
    info(...args: unknown[]): void;
    warn(...args: unknown[]): void;
    error(...args: unknown[]): void;
    withAccount(accountId: string): Logger;
}
export declare const logger: Logger;
//# sourceMappingURL=logger.d.ts.map