/**
 * Truncate a string, appending a length indicator when trimmed.
 * Returns `""` for empty/undefined input.
 */
export declare function truncate(s: string | undefined, max: number): string;
/**
 * Redact a token/secret: show only the first few chars + total length.
 * Returns `"(none)"` when absent.
 */
export declare function redactToken(token: string | undefined, prefixLen?: number): string;
/**
 * Truncate a JSON body string to `maxLen` chars for safe logging.
 * Redacts known sensitive fields before truncating.
 */
export declare function redactBody(body: string | undefined, maxLen?: number): string;
/**
 * Strip query string (which often contains signatures/tokens) from a URL,
 * keeping only origin + pathname.
 */
export declare function redactUrl(rawUrl: string): string;
//# sourceMappingURL=redact.d.ts.map