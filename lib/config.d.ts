/**
 * ClawBot plugin configuration.
 *
 * Values come from the `clawbot` row in the profile's composed cordis tree
 * (see `cordis.patch.yml` and the profile's own patch layer). Every field has
 * a safe default, so the row can be as small as `{ autoStart: true }`.
 */
import Schema from "@deepseek-ai/schemastery";
import type { LogLevel } from "./ilink/util/logger.js";
/**
 * Permission modes `claude -p` accepts, verbatim from its `--permission-mode`
 * choices. Named here so the settings union and the spawn cannot drift.
 */
export declare const CLAUDE_PERMISSION_MODES: readonly ["acceptEdits", "auto", "bypassPermissions", "manual", "dontAsk", "plan"];
export type ClaudePermissionMode = (typeof CLAUDE_PERMISSION_MODES)[number];
/**
 * What the setting may hold: any real mode, or `inherit` — "run it the way that
 * workspace was already running", read off the session's own transcript.
 */
export declare const CLAUDE_RESUME_MODES: readonly ["inherit", "acceptEdits", "auto", "bypassPermissions", "manual", "dontAsk", "plan"];
/**
 * Modes a TRANSCRIPT may record, which is not the same list as the CLI's flag
 * choices: a session sitting in the ordinary ask-me-each-time mode records
 * `default`, and `--permission-mode default` is not accepted. Reading has to
 * recognise it anyway, or `inherit` reports "no mode recorded" about a session
 * that recorded one — the fallback would still be right and the explanation
 * would be a lie.
 */
export declare const CLAUDE_RECORDED_MODES: readonly ["acceptEdits", "auto", "bypassPermissions", "manual", "dontAsk", "plan", "default"];
export type ClaudeResumeMode = (typeof CLAUDE_RESUME_MODES)[number];
export interface ClawbotConfig {
    /**
     * Start the WeChat monitor automatically when a bound account exists.
     * Set to `false` to only run after the user logs in manually via the
     * `clawbot` CLI while the profile is running.
     */
    autoStart: boolean;
    /**
     * Sender allowlist (WeChat user ids). When empty, only the user who scanned
     * the QR code at login (`account.userId`) may send messages; every other
     * sender is ignored.
     */
    allowFrom: string[];
    /**
     * The single fixed DSH session id all WeChat messages are routed to.
     * Persisted history is resumed under this id across restarts.
     */
    sessionId: string;
    /** Working directory for a freshly created session (defaults to `process.cwd()`). */
    cwd?: string;
    /**
     * Register a `userQuestions` provider that forwards `ask_user_question` /
     * plan-review prompts to WeChat. Only one provider may exist per context —
     * if the Web UI already registered one (browser attached), registration is
     * skipped with a warning. Defaults to `false`.
     */
    forwardQuestions: boolean;
    /**
     * How long (ms) an approval question waits for a WeChat answer before
     * failing closed. `0` (default) waits indefinitely.
     */
    approvalTimeoutMs: number;
    /** `bot_agent` string reported to the iLink server. */
    botAgent: string;
    /** Long-edge pixel cap for compressed outbound images. */
    maxImageEdge: number;
    /** Primary JPEG quality for compressed outbound images. */
    imageQuality: number;
    /** Only compress outbound images larger than this many bytes. */
    compressThresholdBytes: number;
    /** Deterministically strip Unicode emojis from all outbound WeChat text. */
    stripEmoji: boolean;
    /**
     * Whether the auto-memory classifier may run.
     *
     * **On by default (since 0.9.4).** A message that looks like a durable
     * personal fact ("我住在…", "我不能喝咖啡") is sent VERBATIM to a model to be
     * judged worth remembering.
     *
     * Since 0.9.3 that model is **the one this session already routes to**: the
     * classifier goes through the host `llm` service with `currentRoute()`, so
     * it inherits the owner's provider, model and credentials.
     *
     * Up to 0.9.2 it POSTed to `api.deepseek.com` with a hardcoded
     * `deepseek-chat` and the `DEEPSEEK_API_KEY` read out of
     * `~/.dsh/.credentials.yaml` — a second destination beyond whatever model
     * the harness was configured to use. Worse, moving the bot to another
     * provider did not move the classifier, so switching *widened* the split
     * instead of closing it. That hop is gone; do not reintroduce it (the
     * regression suite fails on any vendor URL or key name in memory-auto).
     *
     * Default flipped to ON in 0.9.4, at the owner's call. The reason it was off
     * — a second vendor seeing the most personal slice of a chat — is gone since
     * 0.9.3: the judge is the model the conversation already goes to. What is
     * left is one extra call on text that model has just been sent anyway.
     * Set `autoMemory: false` in the `clawbot` entry of cordis.patch.yml to opt out
     * (there is no toggle on the settings card).
     *
     * Turning it off does not disable memory: `remember_user_info` still works,
     * the agent just has to decide for itself rather than asking a cheap model.
     */
    autoMemory: boolean;
    /**
     * Compact the session in the quiet time after a reply instead of right
     * before the next one (see `src/idle-compact.ts`). On by default: the host's
     * own compaction runs at the start of a step, so without this the owner's
     * message is what triggers it and the reply waits behind it (17 s on
     * 2026-10-04). Ten minutes after the last turn, if the last request was
     * within 85% of the host's threshold, the host's `/compact` runs on the
     * session. The host's pre-step compaction stays as the fallback.
     */
    idleCompaction: boolean;
    /**
     * Whether DSH may splice workspace instruction files (AGENTS.md / CLAUDE.md)
     * into the WeChat session (see `src/workspace-instructions.ts`). On by
     * default — the host's own behaviour, and for some owners an AGENTS.md in
     * the bot's working directory is how they instruct it. Off keeps them out of
     * this session only: the host re-sends the WHOLE file on every edit, so a
     * developer notebook in a project the bot once touched keeps growing the
     * chat. Web sessions and subagents are never affected.
     */
    workspaceInstructions: boolean;
    /**
     * Whether the `/plugins/clawbot/mcp/*` bridge answers requests — the surface
     * dsh-mcp-bridge (and therefore Claude Code) calls. Off makes every route
     * return 403 while leaving them registered, so this is a live kill switch
     * rather than something needing a restart.
     */
    mcpBridge: boolean;
    /**
     * Codex peer tools for the WeChat bot (list/read/relay/progress). Off by
     * default: while off, neither the five tools nor any Codex guidance reaches
     * the model, so the feature costs nothing per request. Cold on purpose —
     * flipping it restarts the WeChat listener, which rebuilds the tool list,
     * so the tools and prompt stay byte-stable between flips (prompt cache).
     * The connection itself is lazy: socket shares a running App Server, stdio
     * (opt-in) starts a private one.
     */
    codexPeer: boolean;
    codexTransport: "socket" | "stdio";
    codexBinary?: string;
    codexSocket?: string;
    /**
     * Only announce an outbound file before uploading it when it is at least
     * this many bytes. Below it the upload finishes fast enough that the typing
     * indicator is the only heads-up needed. `0` announces every file.
     */
    noticeMinBytes: number;
    /**
     * Attach images directly to the model's message when the route accepts them.
     * Turning this off forces the old behaviour — the model gets a path and has
     * to read it with a vision tool — which is the only way to compare the two
     * without editing code.
     */
    attachImages: boolean;
    /**
     * Pin the WeChat session to one model, independent of the deployment default.
     *
     * Empty means "follow the deployment default" — which is what this plugin has
     * always done, and why picking a model in the web UI silently moved the bot
     * too: that picker writes through to the global `agent-default-model`, and
     * this session installs whatever it finds there.
     */
    provider?: string;
    model?: string;
    reasoningEffort?: string;
    /** iLink API base URL (override only for testing/mirrors). */
    apiBaseUrl: string;
    /** Log level for the vendored protocol layer. */
    logLevel: LogLevel;
    /**
     * Approval mode used when a message is delivered into a Claude Code session
     * that is CLOSED, via `claude -p --resume`.
     *
     * A headless run has nobody to answer a permission prompt, so passing no mode
     * is not "inherit my policy" — measured, the run replies "Please approve the
     * permission prompt to proceed" and does nothing at all. A mode has to be
     * named; this is which one.
     */
    claudeResumePermissionMode: ClaudeResumeMode;
}
export declare const DEFAULT_CONFIG: ClawbotConfig;
/** Merge a raw (possibly partial) row config over the defaults. */
export declare function normalizeConfig(raw?: Partial<ClawbotConfig> | Record<string, unknown>): ClawbotConfig;
/**
 * The plugin's configuration schema, and with it its form in DSH's settings UI:
 * a plugin without a schema has no fields for that page to draw.
 *
 * EVERY field must appear here. `Schema.object()` drops what it does not
 * declare, so an omitted field would be silently deleted from the composed
 * cordis row the first time the settings page writes this section back.
 *
 * Field order is form order, so the values worth touching sit at the top and
 * the identity/endpoint plumbing sits at the bottom. Descriptions carry the one
 * thing a form cannot infer: whether a change lands immediately or restarts the
 * WeChat monitor (see HOT_FIELDS below).
 */
/**
 * Every field, as plain values. `normalizeConfig`, the tests and anything that
 * wants a value (not a live reference) use this.
 */
export declare const BaseConfig: Schema<Schemastery.ObjectS<NoInfer<{
    provider: Schema<string, string, "plain">;
    model: Schema<string, string, "plain">;
    reasoningEffort: Schema<string, string, "plain">;
    allowFrom: Schema<string[], string[], "defined">;
    attachImages: Schema<boolean, boolean, "defined">;
    stripEmoji: Schema<boolean, boolean, "defined">;
    autoMemory: Schema<boolean, boolean, "defined">;
    idleCompaction: Schema<boolean, boolean, "defined">;
    workspaceInstructions: Schema<boolean, boolean, "defined">;
    mcpBridge: Schema<boolean, boolean, "defined">;
    codexPeer: Schema<boolean, boolean, "defined">;
    codexTransport: Schema<"socket" | "stdio", "socket" | "stdio", "defined">;
    codexBinary: Schema<string, string, "plain">;
    codexSocket: Schema<string, string, "plain">;
    maxImageEdge: Schema<number, number, "defined">;
    imageQuality: Schema<number, number, "defined">;
    compressThresholdBytes: Schema<number, number, "defined">;
    noticeMinBytes: Schema<number, number, "defined">;
    approvalTimeoutMs: Schema<number, number, "defined">;
    logLevel: Schema<"debug" | "info" | "warn" | "error", "debug" | "info" | "warn" | "error", "defined">;
    claudeResumePermissionMode: Schema<"acceptEdits" | "auto" | "bypassPermissions" | "manual" | "dontAsk" | "plan" | "inherit", "acceptEdits" | "auto" | "bypassPermissions" | "manual" | "dontAsk" | "plan" | "inherit", "defined">;
    autoStart: Schema<boolean, boolean, "defined">;
    sessionId: Schema<string, string, "defined">;
    forwardQuestions: Schema<boolean, boolean, "defined">;
    botAgent: Schema<string, string, "defined">;
    apiBaseUrl: Schema<string, string, "defined">;
    cwd: Schema<string, string, "plain">;
}>>, Schemastery.ObjectT<NoInfer<{
    provider: Schema<string, string, "plain">;
    model: Schema<string, string, "plain">;
    reasoningEffort: Schema<string, string, "plain">;
    allowFrom: Schema<string[], string[], "defined">;
    attachImages: Schema<boolean, boolean, "defined">;
    stripEmoji: Schema<boolean, boolean, "defined">;
    autoMemory: Schema<boolean, boolean, "defined">;
    idleCompaction: Schema<boolean, boolean, "defined">;
    workspaceInstructions: Schema<boolean, boolean, "defined">;
    mcpBridge: Schema<boolean, boolean, "defined">;
    codexPeer: Schema<boolean, boolean, "defined">;
    codexTransport: Schema<"socket" | "stdio", "socket" | "stdio", "defined">;
    codexBinary: Schema<string, string, "plain">;
    codexSocket: Schema<string, string, "plain">;
    maxImageEdge: Schema<number, number, "defined">;
    imageQuality: Schema<number, number, "defined">;
    compressThresholdBytes: Schema<number, number, "defined">;
    noticeMinBytes: Schema<number, number, "defined">;
    approvalTimeoutMs: Schema<number, number, "defined">;
    logLevel: Schema<"debug" | "info" | "warn" | "error", "debug" | "info" | "warn" | "error", "defined">;
    claudeResumePermissionMode: Schema<"acceptEdits" | "auto" | "bypassPermissions" | "manual" | "dontAsk" | "plan" | "inherit", "acceptEdits" | "auto" | "bypassPermissions" | "manual" | "dontAsk" | "plan" | "inherit", "defined">;
    autoStart: Schema<boolean, boolean, "defined">;
    sessionId: Schema<string, string, "defined">;
    forwardQuestions: Schema<boolean, boolean, "defined">;
    botAgent: Schema<string, string, "defined">;
    apiBaseUrl: Schema<string, string, "defined">;
    cwd: Schema<string, string, "plain">;
}>>, "plain">;
/**
 * Fields a running plugin can adopt in place, without tearing anything down.
 *
 * The test for membership is not "is it small" but "is it read at the moment it
 * is used". Everything here is looked up per message, per photo, or per
 * approval, so overwriting the live config object is enough — `logLevel` is the
 * one member needing a side effect (see the update hook in index.ts), and it
 * earns its place because flipping to debug while chasing something is exactly
 * when you least want to drop the WeChat connection.
 *
 * Anything absent is COLD by default: the update hook lets cordis validate and
 * restart the fiber, which reconnects the monitor in a second or two. New
 * fields therefore default to the safe behaviour rather than the fast one.
 */
export declare const HOT_FIELDS: Set<keyof ClawbotConfig>;
/**
 * What the host reads. Same fields as `BaseConfig`, with every HOT field marked
 * `.volatile()` — derived from `HOT_FIELDS` so "is this field live?" has exactly
 * one answer in this codebase.
 *
 * DSH 0.1.7 replaced `installSettingsSection` with this: the settings service
 * edits only volatile fields (the Plugins page shows nothing else), and the
 * Loader commits a volatile-only change straight into the running fiber's
 * references WITHOUT restarting it, then emits `loader/volatile-update` to this
 * fiber alone. A change to any other field restarts the fiber. That is the old
 * hot/cold split, now enforced by the host instead of by this plugin.
 *
 * A volatile field does NOT resolve to its value: `Config(raw).provider` is a
 * `{ get() }` reference. `index.ts` unwraps the whole row with `liveValue()`
 * before normalising, so the rest of the plugin still sees plain values.
 */
export declare const Config: typeof BaseConfig;
/**
 * A volatile field's live value; plain values pass through. Reading through
 * this at the moment of use is how a committed edit shows up with no restart.
 */
export declare function liveValue<T>(v: T | {
    get(): T;
} | undefined): T | undefined;
/** Snapshot a resolved cordis row whose hot fields are live references. */
export declare function snapshotConfig(raw: unknown): Partial<ClawbotConfig> | undefined;
//# sourceMappingURL=config.d.ts.map