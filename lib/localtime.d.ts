/**
 * Local wall-clock helpers — the one place this plugin decides what "now" is.
 *
 * Every date this plugin writes or shows is the user's LOCAL date. That sounds
 * obvious and has been wrong twice, both times the same way: `toISOString()`
 * returns UTC, and after 20:00 local (US Eastern) UTC is already tomorrow. So a
 * memory entry appended at 22:31 on Aug 31 was stamped `[2026-09-01]`, and the
 * agent — which reads those stamps back — saw a fact dated in the future.
 *
 * Centralised so there is one function to get right rather than four call sites
 * to remember. If you need a date or a timestamp anywhere in this plugin, take
 * it from here; `new Date().toISOString().slice(0, 10)` is always a bug.
 */
/**
 * The user's zone. Not configurable for now: the machine running DSH is the
 * user's own machine, so the system zone IS the user's local time. A hardcoded
 * zone would leak where the author lives and be wrong for everyone else.
 */
export declare const USER_TIME_ZONE: string;
/** `YYYY-MM-DD` for an instant, as seen in the user's zone. */
export declare function zonedDate(at?: Date): string;
/**
 * The calendar date `days` after `at`, in the user's zone.
 *
 * Steps the zoned calendar date rather than adding 24h, which would drift by an
 * hour across a DST boundary and, on the wrong day, land on the wrong date.
 */
export declare function zonedDatePlus(days: number, at?: Date): string;
/** Chinese weekday for a `YYYY-MM-DD` zoned date, e.g. `周一`. */
export declare function zonedWeekday(isoDate: string): string;
/** `MM-DD HH:mm` in the user's zone — the compact stamp inbound messages carry. */
export declare function zonedStamp(at?: Date): string;
/** `HH:mm:ss` in the user's zone. */
export declare function zonedClock(at?: Date): string;
/** Full Chinese date + time, for the prompt's clock line. */
export declare function zonedPretty(at?: Date): string;
//# sourceMappingURL=localtime.d.ts.map