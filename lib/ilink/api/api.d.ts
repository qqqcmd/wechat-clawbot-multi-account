import type { BaseInfo, GetUploadUrlReq, GetUploadUrlResp, GetUpdatesReq, GetUpdatesResp, NotifyStopResp, NotifyStartResp, SendMessageReq, SendMessageResp, SendTypingReq, GetConfigResp } from "./types.js";
export type WeixinApiOptions = {
    baseUrl: string;
    token?: string;
    timeoutMs?: number;
    /** Long-poll timeout for getUpdates (server may hold the request up to this). */
    longPollTimeoutMs?: number;
};
interface PackageJson {
    name?: string;
    version?: string;
    ilink_appid?: string;
}
/**
 * Walk up from `startDir` searching for the plugin's own `package.json`.
 *
 * Resilient to differing layouts between dev (TS source under `src/`) and
 * publish (compiled output under `dist/src/`) by not assuming a fixed depth.
 */
export declare function readPackageJsonFromDir(startDir: string): PackageJson;
/**
 * Sanitize a user-supplied `botAgent` config value into a wire-safe string.
 *
 * Grammar (UA-style):
 *   bot_agent = product *( SP product )
 *   product   = name "/" version [ SP "(" comment ")" ]
 *   name      = 1*32( ALPHA / DIGIT / "_" / "." / "-" )
 *   version   = 1*32( ALPHA / DIGIT / "_" / "." / "+" / "-" )
 *   comment   = 1*64( printable ASCII minus "(" ")" )
 *
 * Tokens that fail to parse are dropped silently (no partial tokens kept).
 * Returns `DEFAULT_BOT_AGENT` when the input is empty / all tokens dropped /
 * the result exceeds the length cap after truncation.
 */
export declare function sanitizeBotAgent(raw: string | undefined): string;
/** Build the `base_info` payload included in every API request. */
export declare function buildBaseInfo(): BaseInfo;
/**
 * Classify a fetch-level error into a category for logging / diagnostics.
 * This does NOT cover HTTP-level errors (4xx/5xx) — those are thrown separately.
 */
export declare function classifyFetchError(err: unknown): {
    type: "dns" | "tcp" | "tls" | "timeout" | "unknown";
    description: string;
    code?: string;
};
/**
 * GET fetch wrapper: send a GET request to a Weixin API endpoint.
 * When `timeoutMs` is set, the request is aborted after that many milliseconds.
 * Query parameters should already be encoded in `endpoint`.
 * Returns the raw response text on success; throws on HTTP error or (if used) timeout abort.
 */
export declare function apiGetFetch(params: {
    baseUrl: string;
    endpoint: string;
    timeoutMs?: number;
    label: string;
}): Promise<string>;
/**
 * Common fetch wrapper: POST JSON to a Weixin API endpoint.
 * When `timeoutMs` is provided, the request is aborted after that many milliseconds.
 * When omitted, no client-side timeout is applied (relies on OS/TCP stack).
 * Returns the raw response text on success; throws on HTTP error or timeout.
 *
 * When `abortSignal` is provided, an external abort (e.g. gateway channel stop)
 * cancels the in-flight request immediately instead of waiting for `timeoutMs`.
 */
export declare function apiPostFetch(params: {
    baseUrl: string;
    endpoint: string;
    body: string;
    token?: string;
    timeoutMs?: number;
    label: string;
    abortSignal?: AbortSignal;
}): Promise<string>;
/**
 * Long-poll getUpdates. Server should hold the request until new messages or timeout.
 *
 * On client-side timeout (no server response within timeoutMs), returns an empty response
 * with ret=0 so the caller can simply retry. This is normal for long-poll.
 */
export declare function getUpdates(params: GetUpdatesReq & {
    baseUrl: string;
    token?: string;
    timeoutMs?: number;
    /**
     * Optional external abort signal from the gateway. When stopping the channel,
     * this aborts the in-flight long-poll immediately so hot reload can restart.
     */
    abortSignal?: AbortSignal;
}): Promise<GetUpdatesResp>;
/** Get a pre-signed CDN upload URL for a file. */
export declare function getUploadUrl(params: GetUploadUrlReq & WeixinApiOptions): Promise<GetUploadUrlResp>;
/**
 * Build an actionable error string for a non-zero `sendMessage` `ret`.
 *
 * The server frequently reports a business-level failure with an empty
 * `errmsg` (commonly `ret=-2`), which is hard to diagnose. The most common
 * cause on agent-initiated outbound delivery is an expired or missing
 * `context_token`: it is only refreshed by a recent inbound message from the
 * recipient, so a bot that sends after a long idle period (cron reminders,
 * scheduled digests) fails until the user messages it again. Surface that
 * likely cause instead of an opaque empty message.
 *
 * Ported from NewFuture/openclaw-weixin v3.0.1 (commit da9efec).
 */
export declare function describeSendMessageFailure(resp: SendMessageResp, body: SendMessageReq): string;
export declare function sendMessage(params: WeixinApiOptions & {
    body: SendMessageReq;
}): Promise<{
    messageId?: number;
}>;
/** Fetch bot config (includes typing_ticket) for a given user. */
export declare function getConfig(params: WeixinApiOptions & {
    ilinkUserId: string;
    contextToken?: string;
}): Promise<GetConfigResp>;
/** Send a typing indicator to a user. */
export declare function sendTyping(params: WeixinApiOptions & {
    body: SendTypingReq;
}): Promise<void>;
/**
 * Notify Weixin that this channel client is stopping (gateway shutdown / channel stop).
 * Uses a standalone timeout (not the gateway abort signal) so the request can finish
 * after OpenClaw has already aborted the long-poll.
 */
export declare function notifyStop(params: WeixinApiOptions): Promise<NotifyStopResp>;
/**
 * Notify Weixin that this channel client is starting (gateway startup / channel start).
 */
export declare function notifyStart(params: WeixinApiOptions): Promise<NotifyStartResp>;
export {};
//# sourceMappingURL=api.d.ts.map