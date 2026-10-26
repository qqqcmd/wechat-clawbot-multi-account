/**
 * ClawBot plugin configuration.
 *
 * Values come from the `clawbot` row in the profile's composed cordis tree
 * (see `cordis.patch.yml` and the profile's own patch layer). Every field has
 * a safe default, so the row can be as small as `{ autoStart: true }`.
 */
import Schema from "@deepseek-ai/schemastery";
/**
 * Permission modes `claude -p` accepts, verbatim from its `--permission-mode`
 * choices. Named here so the settings union and the spawn cannot drift.
 */
export const CLAUDE_PERMISSION_MODES = [
    "acceptEdits", "auto", "bypassPermissions", "manual", "dontAsk", "plan",
];
/**
 * What the setting may hold: any real mode, or `inherit` — "run it the way that
 * workspace was already running", read off the session's own transcript.
 */
export const CLAUDE_RESUME_MODES = ["inherit", ...CLAUDE_PERMISSION_MODES];
/**
 * Modes a TRANSCRIPT may record, which is not the same list as the CLI's flag
 * choices: a session sitting in the ordinary ask-me-each-time mode records
 * `default`, and `--permission-mode default` is not accepted. Reading has to
 * recognise it anyway, or `inherit` reports "no mode recorded" about a session
 * that recorded one — the fallback would still be right and the explanation
 * would be a lie.
 */
export const CLAUDE_RECORDED_MODES = [...CLAUDE_PERMISSION_MODES, "default"];
export const DEFAULT_CONFIG = {
    autoStart: true,
    allowFrom: [],
    sessionId: "wechat-main",
    cwd: undefined,
    forwardQuestions: false,
    approvalTimeoutMs: 0,
    botAgent: "DSH-ClawBot/0.1.0 (wechat-clawbot)",
    apiBaseUrl: "https://ilinkai.weixin.qq.com",
    logLevel: "info",
    // Follow the session's own recorded mode. Asked for explicitly: a revived
    // session should behave like the workspace it belongs to, not like a policy
    // this plugin invented. The two cases that cannot be honoured (a mode that
    // needs a human, or none recorded) fall back to acceptEdits and say so.
    claudeResumePermissionMode: "inherit",
    maxImageEdge: 2048,
    stripEmoji: true,
    autoMemory: true,
    idleCompaction: true,
    workspaceInstructions: true,
    mcpBridge: true,
    codexPeer: false,
    codexTransport: "socket",
    imageQuality: 80,
    compressThresholdBytes: 1024 * 1024,
    noticeMinBytes: 2 * 1024 * 1024,
    attachImages: true,
};
function asStringArray(value) {
    if (!Array.isArray(value))
        return [];
    return value.filter((v) => typeof v === "string" && v.length > 0);
}
/** Merge a raw (possibly partial) row config over the defaults. */
export function normalizeConfig(raw) {
    const r = (raw ?? {});
    return {
        autoStart: typeof r.autoStart === "boolean" ? r.autoStart : DEFAULT_CONFIG.autoStart,
        allowFrom: asStringArray(r.allowFrom),
        sessionId: typeof r.sessionId === "string" && r.sessionId.trim()
            ? r.sessionId.trim()
            : DEFAULT_CONFIG.sessionId,
        cwd: typeof r.cwd === "string" && r.cwd.trim() ? r.cwd : undefined,
        forwardQuestions: typeof r.forwardQuestions === "boolean"
            ? r.forwardQuestions
            : DEFAULT_CONFIG.forwardQuestions,
        approvalTimeoutMs: typeof r.approvalTimeoutMs === "number" && Number.isFinite(r.approvalTimeoutMs)
            ? Math.max(0, r.approvalTimeoutMs)
            : DEFAULT_CONFIG.approvalTimeoutMs,
        botAgent: typeof r.botAgent === "string" && r.botAgent.trim()
            ? r.botAgent.trim()
            : DEFAULT_CONFIG.botAgent,
        apiBaseUrl: typeof r.apiBaseUrl === "string" && r.apiBaseUrl.trim()
            ? r.apiBaseUrl.trim()
            : DEFAULT_CONFIG.apiBaseUrl,
        logLevel: typeof r.logLevel === "string" &&
            ["debug", "info", "warn", "error"].includes(r.logLevel)
            ? r.logLevel
            : DEFAULT_CONFIG.logLevel,
        claudeResumePermissionMode: typeof r.claudeResumePermissionMode === "string" &&
            CLAUDE_RESUME_MODES.includes(r.claudeResumePermissionMode)
            ? r.claudeResumePermissionMode
            : DEFAULT_CONFIG.claudeResumePermissionMode,
        maxImageEdge: typeof r.maxImageEdge === "number" && Number.isFinite(r.maxImageEdge)
            ? Math.max(64, Math.min(8192, r.maxImageEdge))
            : DEFAULT_CONFIG.maxImageEdge,
        imageQuality: typeof r.imageQuality === "number" && Number.isFinite(r.imageQuality)
            ? Math.max(10, Math.min(100, r.imageQuality))
            : DEFAULT_CONFIG.imageQuality,
        compressThresholdBytes: typeof r.compressThresholdBytes === "number" && Number.isFinite(r.compressThresholdBytes)
            ? Math.max(0, r.compressThresholdBytes)
            : DEFAULT_CONFIG.compressThresholdBytes,
        stripEmoji: typeof r.stripEmoji === "boolean" ? r.stripEmoji : DEFAULT_CONFIG.stripEmoji,
        autoMemory: typeof r.autoMemory === "boolean" ? r.autoMemory : DEFAULT_CONFIG.autoMemory,
        idleCompaction: typeof r.idleCompaction === "boolean" ? r.idleCompaction : DEFAULT_CONFIG.idleCompaction,
        workspaceInstructions: typeof r.workspaceInstructions === "boolean" ? r.workspaceInstructions : DEFAULT_CONFIG.workspaceInstructions,
        mcpBridge: typeof r.mcpBridge === "boolean" ? r.mcpBridge : DEFAULT_CONFIG.mcpBridge,
        codexPeer: typeof r.codexPeer === "boolean" ? r.codexPeer : DEFAULT_CONFIG.codexPeer,
        codexTransport: r.codexTransport === "stdio" ? "stdio" : "socket",
        codexBinary: typeof r.codexBinary === "string" && r.codexBinary.trim() ? r.codexBinary.trim() : undefined,
        codexSocket: typeof r.codexSocket === "string" && r.codexSocket.trim() ? r.codexSocket.trim() : undefined,
        noticeMinBytes: typeof r.noticeMinBytes === "number" && Number.isFinite(r.noticeMinBytes)
            ? Math.max(0, r.noticeMinBytes)
            : DEFAULT_CONFIG.noticeMinBytes,
        attachImages: typeof r.attachImages === "boolean" ? r.attachImages : DEFAULT_CONFIG.attachImages,
        provider: typeof r.provider === "string" && r.provider.trim() ? r.provider.trim() : undefined,
        model: typeof r.model === "string" && r.model.trim() ? r.model.trim() : undefined,
        reasoningEffort: typeof r.reasoningEffort === "string" && r.reasoningEffort.trim()
            ? r.reasoningEffort.trim()
            : undefined,
    };
}
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
export const BaseConfig = Schema.object({
    provider: Schema.string()
        .description("固定这个 bot 用的 provider(如 deepseek-official)。留空 = 跟随全局默认模型"),
    model: Schema.string()
        .description("固定模型 id(如 deepseek-flash)。留空 = 跟随全局默认 —— 也就是说你在网页里换模型时,bot 会跟着换"),
    reasoningEffort: Schema.string()
        .description("思考等级(部分网关带工具时只接受 off;DeepSeek 可用 high 等)。留空 = 用该模型的默认"),
    allowFrom: Schema.array(Schema.string())
        .default([])
        .description("允许给 bot 发消息的微信用户 id。留空 = 只有扫码登录的本人能用"),
    attachImages: Schema.boolean()
        .default(true)
        .description("模型支持时,把图片直接附给它看(快)。关掉则退回让它用视觉工具读路径(慢,约多 40 秒),仅用于对比排查"),
    stripEmoji: Schema.boolean()
        .default(true)
        .description("发出去的文字里去掉 Unicode emoji(改用微信原生表情代码)"),
    autoMemory: Schema.boolean()
        .default(true)
        .description("自动记忆(默认开):像个人信息的消息会被**原文发给模型**判断值不值得记住。"
        + "用的就是**这个会话正在用的模型**(走宿主 llm 服务),"
        + "跟对话去的是同一个地方,不是额外的厂商。"
        + "不想要就在 cordis.patch.yml 的 clawbot 块里写 autoMemory: false。"
        + "关掉不影响 remember_user_info。"),
    idleCompaction: Schema.boolean()
        .default(true)
        .description("空闲时整理对话(默认开):回复结束、安静 10 分钟后,如果上一次请求已接近宿主的压缩阈值,"
        + "就趁空闲把旧对话整理成摘要。下一条消息来时不用再等压缩。关掉则只剩宿主在回复前压缩。"),
    workspaceInstructions: Schema.boolean()
        .default(true)
        .description("把工作目录的说明文件(AGENTS.md / CLAUDE.md)交给 bot(默认开,DSH 原样)。"
        + "关掉则微信会话里不再自动塞这些文件——DSH 每次文件改动都会重发整份,"
        + "bot 只在某个项目里干过一次活,那份文件也会一直跟着涨。网页会话和子代理不受影响。"),
    mcpBridge: Schema.boolean()
        .default(true)
        .description("开放 MCP 桥(/plugins/clawbot/mcp/*):让 Claude Code / Codex 列出/读取/驱动 DSH 会话,并通过 bot 给你发微信。只监听本机,而且每个请求都要 token"),
    codexPeer: Schema.boolean()
        .default(false)
        .description("【改动会重启微信监听】让微信 bot 查看 Codex 项目/会话、转发消息和查询进度(默认关)。关着时这几个工具不发给模型,不占 token"),
    codexTransport: Schema.union(["socket", "stdio"])
        .default("socket")
        .description("【改动会重启微信监听】socket 通过 WebSocket 连接共享 Codex App Server;stdio 启动独立后台服务,只能在明确允许续聊后执行历史任务"),
    codexBinary: Schema.string()
        .description("【改动会重启微信监听】Codex CLI 路径,留空自动查找"),
    codexSocket: Schema.string()
        .description("【改动会重启微信监听】共享 App Server 的 socket 路径,留空使用 Codex 默认路径"),
    maxImageEdge: Schema.number()
        .default(2048)
        .min(64)
        .max(8192)
        .description("发出/附上的图片长边像素上限。相机原图几千万像素,必须缩"),
    imageQuality: Schema.number()
        .default(80)
        .min(10)
        .max(100)
        .description("压缩图片时的 JPEG 质量"),
    compressThresholdBytes: Schema.number()
        .default(1024 * 1024)
        .min(0)
        .description("超过这个字节数才压缩图片,以下的原样发"),
    noticeMinBytes: Schema.number()
        .default(2 * 1024 * 1024)
        .min(0)
        .description("发文件超过这个字节数才先发一条「正在发送」预告。0 = 每个文件都预告"),
    approvalTimeoutMs: Schema.number()
        .default(0)
        .min(0)
        .description("审批类问题等待微信回答的超时(毫秒)。0 = 一直等"),
    logLevel: Schema.union(["debug", "info", "warn", "error"])
        .default("info")
        .description("协议层日志级别"),
    // The mode handed to `claude -p --resume` when a message is delivered into a
    // Claude Code session that is CLOSED. Not a free-form string: these are
    // exactly the CLI's own choices, so a typo is caught here instead of at the
    // spawn.
    //
    // Why it has to be set at all: with no mode, a headless run asks for
    // permission and there is nobody to answer — measured, it replies "I've
    // requested permission to write the file. Please approve the permission
    // prompt to proceed" and does nothing. So "inherit whatever my policy is" is
    // not an option that exists headless; a mode must be named.
    claudeResumePermissionMode: Schema.union(CLAUDE_RESUME_MODES)
        .default("inherit")
        .description("关掉的 Claude 会话被拉活时用哪种审批模式。"
        + "inherit(默认)= 沿用那个会话自己记录过的模式(即原工作区的权限);"
        + "要人盯着批的模式(default/manual/plan)在后台没人可批,会退回 acceptEdits 并在回复里说明。"
        + "也可以直接钉一个:acceptEdits = 改文件直接过、跑命令仍要批;bypassPermissions = 全部不问"),
    autoStart: Schema.boolean()
        .default(true)
        .description("【改动会重启微信监听】DSH 启动时自动开始监听微信"),
    sessionId: Schema.string()
        .default("wechat-main")
        .description("【改动会重启微信监听】微信消息统一进入的会话 id。改这个等于换一个记忆完全独立的 bot"),
    forwardQuestions: Schema.boolean()
        .default(false)
        .description("【改动会重启微信监听】把 ask_user_question / 计划确认转发到微信"),
    botAgent: Schema.string()
        .default("DSH-ClawBot/0.1.0 (wechat-clawbot)")
        .description("【改动会重启微信监听】上报给 iLink 服务器的 bot_agent 标识"),
    apiBaseUrl: Schema.string()
        .default("https://ilinkai.weixin.qq.com")
        .description("【改动会重启微信监听】iLink 接口地址,只在测试/镜像时改"),
    cwd: Schema.string()
        .description("【改动会重启微信监听】新建会话时的工作目录。留空 = DSH 的启动目录"),
});
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
export const HOT_FIELDS = new Set([
    // The selection ref handed to installModelSelection is mutable by design —
    // prompt assembly snapshots it per step — so switching model needs no
    // reinstall and no restart, just a new value in the ref.
    "provider",
    "model",
    "reasoningEffort",
    "allowFrom",
    "attachImages",
    // 纯读取的开关,下一条消息生效即可,不需要重启。
    "autoMemory",
    "idleCompaction",
    "workspaceInstructions",
    "stripEmoji",
    "mcpBridge",
    "maxImageEdge",
    "imageQuality",
    "compressThresholdBytes",
    "noticeMinBytes",
    "approvalTimeoutMs",
    "logLevel",
    // Read fresh on each send, so changing it takes effect on the next message.
    "claudeResumePermissionMode",
]);
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
export const Config = Schema.object(Object.fromEntries(Object.entries(BaseConfig.dict ?? {}).map(([key, field]) => [
    key,
    HOT_FIELDS.has(key) ? field.volatile() : field,
])));
/**
 * A volatile field's live value; plain values pass through. Reading through
 * this at the moment of use is how a committed edit shows up with no restart.
 */
export function liveValue(v) {
    return v !== null && typeof v === "object" && typeof v.get === "function"
        ? v.get()
        : v;
}
/** Snapshot a resolved cordis row whose hot fields are live references. */
export function snapshotConfig(raw) {
    if (raw === null || typeof raw !== "object")
        return raw;
    const out = {};
    for (const [key, value] of Object.entries(raw))
        out[key] = liveValue(value);
    return out;
}
//# sourceMappingURL=config.js.map