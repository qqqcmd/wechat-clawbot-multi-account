/**
 * wechat-clawbot — DeepSeek Harness ⇄ WeChat (official ClawBot bridge).
 *
 * A DSH plugin bundle that connects a profile to the user's WeChat through
 * Tencent's iLink API (the same protocol the official WeChat ClawBot channel
 * uses). Inbound WeChat messages are routed into one fixed agent session;
 * assistant replies and approval requests are sent back to WeChat.
 *
 * LOCAL PATCH — multi-account (not upstream). Upstream v0.9.10 drives exactly
 * one binding: `pickAccount()` returns `ids[0]`, and `startMonitor()` refuses
 * to start a second monitor. Any other bound account therefore never sends
 * `notifystart` (monitor.js), so its WeChat client shows 「无法连接 OpenClaw」
 * even though the iLink server serves it happily (verified with
 * ../.clawbot-probe/probe.mjs: two bots online at once, both directions fine).
 *
 * This patch keeps one runtime per bound account, each with its own bridge,
 * inbound router, monitor task and SESSION. Sessions are separated because two
 * bridges sharing one session id would fight: `ensureAgent()` re-registers the
 * send tools on the same live agent ctx (bridge.js:338/989), so a reply meant
 * for one WeChat could land on the other, and `onSessionEvent` (bridge.js:857)
 * would fire for both and duplicate every scheduled reminder.
 *
 * @module wechat-clawbot
 */
import fs from "node:fs";
import path from "node:path";
import { normalizeConfig, snapshotConfig, HOT_FIELDS } from "./config.js";
import { WechatBridge } from "./bridge.js";
import { InboundRouter } from "./inbound.js";
import { ApprovalRelay } from "./approvals.js";
import { tryRegisterQuestionProvider } from "./questions.js";
import { runMonitor } from "./monitor.js";
import { PendingRegistry } from "./pending.js";
import { watchAccountStore } from "./state.js";
import { registerWechatGuidanceGlobal } from "./prompt.js";
import { registerSubagentModelPolicy } from "./subagent-model.js";
import { registerModelsRoute } from "./models-route.js";
import { registerMcpRoutes } from "./mcp-route.js";
import { CodexPeer } from "./codex-peer.js";
import { claimInstance } from "./instance-guard.js";
import { CodexProgressStore } from "./codex-progress.js";
import { ensureMemoryFile } from "./memory.js";
import { isHostSchedule, migrateLegacyReminders } from "./schedule-migrate.js";
import { resolveStateDir } from "./ilink/storage/state-dir.js";
import { resolveWeixinAccount, setBotAgent, listIndexedWeixinAccountIds, } from "./ilink/auth/accounts.js";
import { sendMessageWeixin } from "./ilink/messaging/send.js";
import { stripEmoji, stripWechatCodes } from "./emoji.js";
import { setLogLevel, logger } from "./ilink/util/logger.js";
import { registerWorkspaceInstructionsFilter } from "./workspace-instructions.js";
/** Stable Cordis plugin name for the clawbot row. */
export const name = "clawbot";
/**
 * Services the plugin uses directly. `agentPresets` and `userQuestions` are
 * deliberately NOT listed: they are optional (agent-presets only ships with
 * web/headless bundles) and are accessed defensively instead.
 */
export const inject = ["agents", "sessions", "tools", "systemPrompt"];
// Re-exported so cordis finds the schema on the plugin module: it is what the
// settings page renders as a form, and what validates a change before the
// update hook below ever sees it.
export { Config } from "./config.js";
/**
 * Which bound account keeps the plain `config.sessionId`. Persisted so the
 * election cannot drift: without it, adding an account whose id sorts earlier
 * than the current primary would silently swap the two sessions.
 */
function primaryAccountPath() {
    return path.join(resolveStateDir(), "primary-account.txt");
}
function readPrimaryAccountId() {
    try {
        return fs.readFileSync(primaryAccountPath(), "utf-8").trim() || null;
    }
    catch {
        return null;
    }
}
function writePrimaryAccountId(accountId) {
    try {
        const target = primaryAccountPath();
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.writeFileSync(target, `${accountId}\n`, "utf-8");
    }
    catch (err) {
        logger.warn(`primary-account: cannot record ${accountId}: ${String(err)}`);
    }
}
export function apply(ctx, rawConfig) {
    // Since DSH 0.1.7 the hot fields of `rawConfig` are live `{ get() }`
    // references (they are `.volatile()` in `Config`), so the row must be
    // unwrapped BEFORE normalising: `normalizeConfig` checks `typeof … ===
    // "string"`, and a reference would silently fall back to every default —
    // the bot would boot on the harness default model with none of its settings.
    const config = normalizeConfig(snapshotConfig(rawConfig));
    setLogLevel(config.logLevel);
    setBotAgent(config.botAgent);
    // Mutating `config` in place is what makes adoption work at all: bridge,
    // inbound, approvals and the tools each hold a reference to this same object
    // and read the field at the moment they use it. Replacing the reference would
    // update nobody.
    // Reads the running fiber's references on every call, so it always returns
    // the values the Loader last committed.
    const readSettings = () => snapshotConfig(rawConfig);
    // ---------------------------------------------------------------------
    // Multi-account runtime table. Declared before `adoptSettings` because that
    // hook has to re-point every live bridge's model selection.
    // ---------------------------------------------------------------------
    /** accountId → runtime { account, bridge, router, monitorTask, abort, … }. */
    const runtimes = new Map();
    /** The account that keeps the plain `config.sessionId`; the rest are suffixed. */
    let primaryId = readPrimaryAccountId();
    // Set once a newer instance has taken over (see instance-guard.js) or we were
    // unloaded: from then on nothing here may start talking to WeChat again.
    let superseded = false;
    let hostSchedule;
    const allRuntimes = () => [...runtimes.values()];
    const runtimeForSession = (sessionId) => allRuntimes().find((rt) => rt.bridge?.isWechatSession(sessionId));
    const primaryRuntime = () => runtimes.get(primaryId) ?? allRuntimes()[0];
    /** Whichever account is mid-turn right now, else the primary. */
    const preferredRuntime = () => allRuntimes().find((rt) => rt.bridge?.activeSender) ?? primaryRuntime();
    const shortAccountId = (accountId) => {
        const bare = String(accountId).replace(/-im-bot$/i, "");
        return bare.slice(0, 4) || "acct";
    };
    /** Primary keeps `config.sessionId`; every other account gets its own suffix. */
    const sessionIdFor = (accountId) => accountId === primaryId
        ? String(config.sessionId)
        : `${config.sessionId}-${shortAccountId(accountId)}`;
    /**
     * A view of `config` with `sessionId` pinned. Everything else reads through
     * to the one shared object ON PURPOSE: `adoptSettings` mutates that object
     * in place, and a snapshot copy would freeze hot settings at boot.
     */
    const viewForSession = (sessionId) => new Proxy(config, {
        get: (target, prop) => (prop === "sessionId" ? sessionId : target[prop]),
    });
    /** Live view that follows the primary election (used by the MCP routes). */
    const primaryConfig = new Proxy(config, {
        get: (target, prop) => (prop === "sessionId"
            ? (primaryId === null ? String(config.sessionId) : sessionIdFor(primaryId))
            : target[prop]),
    });
    /**
     * Every bound account, resolved. Also (re-)elects the primary when the
     * recorded one is gone, so a fresh install or a deleted account self-heals.
     */
    const pickAccounts = () => {
        const ids = listIndexedWeixinAccountIds();
        if (ids.length > 0 && (primaryId === null || !ids.includes(primaryId))) {
            primaryId = ids[0];
            writePrimaryAccountId(primaryId);
            logger.info(`clawbot: primary account = ${primaryId} (session ${sessionIdFor(primaryId)})`);
        }
        const accounts = [];
        for (const id of ids) {
            try {
                accounts.push(resolveWeixinAccount(id));
            }
            catch (err) {
                logger.warn(`pickAccounts: ${id}: ${String(err)}`);
            }
        }
        return accounts;
    };
    // ---------------------------------------------------------------------
    // Sessions this plugin speaks for, and the outbound text path.
    // ---------------------------------------------------------------------
    /**
     * Session ids, mutated in place and handed to `registerWechatGuidanceGlobal`.
     * That registration matches against this very array on each prompt assembly,
     * so an account bound later is picked up with no re-registration (and no
     * duplicate `wechat-guidance` / `wechat-memory` sections).
     */
    const wechatSessionIds = [];
    const registerSubagentPolicy = (sessionId) => {
        // Subagents delegated from a WeChat session run with max thinking: the
        // main conversation is reasoningEffort=off for fast replies, but deep
        // delegated tasks get full reasoning on DeepSeek Flash. The id has to be
        // one the host's catalog still lists: 0.1.7 cut the built-in DeepSeek
        // catalog to `deepseek-flash` / `deepseek-v4-pro`.
        try {
            registerSubagentModelPolicy(ctx, {
                sessionId,
                provider: "deepseek-official",
                model: "deepseek-flash",
                reasoningEffort: "max",
            });
            logger.info(`clawbot: subagent max-thinking policy registered (parent=${sessionId})`);
        }
        catch (err) {
            logger.warn(`clawbot: subagent model policy registration failed: ${String(err)}`);
        }
    };
    const rememberSessionId = (sessionId) => {
        const id = String(sessionId);
        if (!wechatSessionIds.includes(id)) {
            wechatSessionIds.push(id);
            registerSubagentPolicy(id);
        }
        return id;
    };
    /** Send text through one specific account. */
    const sendTextVia = async (rt, to, text) => {
        const account = rt?.account;
        if (!account?.configured)
            throw new Error("no bound WeChat account");
        // Bracket codes go either way — see src/emoji.ts.
        const finalText = config.stripEmoji ? stripEmoji(text) : stripWechatCodes(text);
        if (!finalText)
            return;
        await sendMessageWeixin({
            to,
            text: finalText,
            opts: {
                baseUrl: account.baseUrl,
                token: account.token,
                contextToken: rt.router?.contextTokenFor(to) ?? undefined,
                timeoutMs: 15_000,
            },
        });
    };
    /**
     * Which account should carry a message addressed to `to`. The two-argument
     * signature is what approvals / questions / MCP call, so the account is
     * resolved from the recipient instead: a WeChat user id belongs to exactly
     * the account that scanned it, because that is where its context token lives.
     */
    const runtimeForRecipient = (to) => {
        if (typeof to === "string" && to !== "") {
            const active = allRuntimes().find((rt) => rt.bridge?.activeSender === to);
            if (active)
                return active;
            const known = allRuntimes().find((rt) => rt.router?.contextTokenFor(to));
            if (known)
                return known;
        }
        return primaryRuntime();
    };
    /** Send a text message back to one WeChat user through its own account. */
    const sendText = (to, text) => sendTextVia(runtimeForRecipient(to), to, text);
    // ---------------------------------------------------------------------
    // LOCAL PATCH — cross-account sending.
    //
    // Out of the box every send tool is welded to the account whose bridge
    // registered it (`tool.js`: `bridge.activeSender ?? account.userId`), so the
    // two WeChat accounts can never reach each other. This block hands the tools
    // the *other* runtimes, plus the token/baseUrl needed to talk to them.
    //
    // Authorization: only a WeChat owner listed here may name a recipient. Match
    // on userId, NOT accountId — re-scanning the QR code issues a brand new
    // accountId every time, but the scanner's userId never changes.
    // Empty set = nobody may cross-send (feature off).
    const CROSS_SEND_ALLOWED_USER_IDS = new Set([
        "o9cq80-fes6cb3a8wz_8xzefux_c@im.wechat", // 用户本人
    ]);
    const crossSendFor = (selfRt) => ({
        selfAccountId: selfRt.accountId,
        maySendToOthers: CROSS_SEND_ALLOWED_USER_IDS.has(String(selfRt.account?.userId ?? "").toLowerCase()),
        peers: () => allRuntimes()
            .filter((rt) => rt.accountId !== selfRt.accountId && rt.account?.configured)
            .map((rt) => ({ accountId: rt.accountId, userId: rt.account?.userId ?? null })),
        sendText: async (targetAccountId, text) => {
            const target = runtimes.get(targetAccountId);
            if (!target?.account?.configured)
                throw new Error(`账号 ${targetAccountId} 没有在运行`);
            const to = target.account.userId;
            if (!to)
                throw new Error(`账号 ${targetAccountId} 没有记录扫码人，无法确定收件人`);
            await sendTextVia(target, to, text);
            return to;
        },
        mediaOpts: (targetAccountId) => {
            const target = runtimes.get(targetAccountId);
            if (!target?.account?.configured)
                return null;
            const to = target.account.userId;
            if (!to)
                return null;
            return {
                to,
                baseUrl: target.account.baseUrl,
                token: target.account.token,
                cdnBaseUrl: target.account.cdnBaseUrl,
                contextToken: target.router?.contextTokenFor(to) ?? "",
            };
        },
    });
    const adoptSettings = () => {
        const incoming = normalizeConfig(readSettings());
        const changed = Object.keys(incoming)
            .filter((key) => JSON.stringify(incoming[key]) !== JSON.stringify(config[key]));
        if (changed.length === 0)
            return;
        const hot = changed.filter((key) => HOT_FIELDS.has(key));
        const cold = changed.filter((key) => !HOT_FIELDS.has(key));
        // Copy the HOT fields only, one by one — never `Object.assign` the whole
        // incoming object. A cold field taking effect the instant it is typed is
        // exactly what this design promises not to do: `apiBaseUrl` would redirect
        // a connected client mid-flight, `sessionId` would point the bridge at a
        // session it is not bound to. They are stored, and the next start reads them.
        //
        // Cold fields are also deliberately not auto-restarted: reloading this fiber
        // from inside its own change hook is a re-entrancy hazard, and a WeChat
        // monitor that drops itself as each keystroke lands is worse than one that
        // waits to be told. The card says so, and /restart applies them.
        for (const key of hot)
            config[key] = incoming[key];
        // The one hot field with a side effect beyond the config object: the logger
        // captured its level at startup, so an in-place change is invisible.
        if (hot.includes("logLevel"))
            setLogLevel(config.logLevel);
        if (hot.length > 0)
            logger.info(`设置已即时生效 [${hot.join(", ")}](没有重启,微信监听未中断)`);
        // Re-point the live model selection on EVERY account. Separate from the
        // field copy above because it validates the model id before switching — a
        // typo in the settings box must not brick the next message.
        if (hot.some((key) => key === "provider" || key === "model" || key === "reasoningEffort")) {
            for (const rt of allRuntimes()) {
                void rt.bridge?.refreshSelection().catch((err) => {
                    logger.warn(`refreshSelection 失败 (${rt.accountId}): ${String(err)}`);
                });
            }
        }
        if (cold.length > 0)
            logger.info(`设置已保存 [${cold.join(", ")}],但要等重启才生效(/restart 或小鲸鱼的重启按钮)`);
    };
    // Adopt live edits without tearing anything down.
    //
    // DSH 0.1.7 removed `installSettingsSection`. The replacement is structural:
    // HOT fields are `.volatile()` in `Config`, the Plugins page edits exactly
    // those, and when an edit touches only volatile fields the Loader commits the
    // new values into this fiber's references in place — no restart — then emits
    // `loader/volatile-update` to this fiber alone. Any other field changing
    // restarts the fiber, which is what cold fields always needed anyway, and
    // those are not on the page at all.
    //
    // So the only job left here is the side effects: `adoptSettings` re-reads the
    // references, diffs against the plain `config` every other module holds,
    // copies the hot fields in place, re-points the model selection and the log
    // level, and logs what took effect. Unchanged logic, new trigger. The event
    // is a Loader event, absent from cordis's typed map, hence the cast.
    ctx.on("loader/volatile-update", () => adoptSettings());
    // This plugin ships its own card (the Plugins page, via the browser half), so
    // tell the settings service not to auto-generate a competing page. Optional
    // inject: naming `settings` in `inject` would make it a hard requirement, and
    // a bare `ctx.settings` read throws.
    ctx.inject(["settings"], (child) => {
        child.effect(() => child.settings.configure({ auto: false }, ctx.fiber));
    });
    // Prime the session list from whatever is already bound, so the guidance and
    // the subagent policy exist before the first monitor is started — including
    // for a GUI turn that resumes the WeChat session without the bridge.
    for (const account of pickAccounts())
        rememberSessionId(sessionIdFor(account.accountId));
    // Register the WeChat conversation guidance GLOBALLY with a dynamic text
    // provider: it yields the rules ONLY for the WeChat sessions (by session id),
    // and an empty string for every other DSH conversation, so unrelated GUI
    // sessions are never affected. This covers agents that the harness resumes
    // directly from GUI messages without running the bridge's agent setup.
    try {
        registerWechatGuidanceGlobal(ctx, wechatSessionIds, config);
        logger.info(`clawbot: wechat guidance registered globally (sessions=${wechatSessionIds.join(", ") || "none yet"})`);
    }
    catch (err) {
        logger.warn(`clawbot: global guidance registration failed: ${String(err)}`);
    }
    // The settings card's dropdowns need a model catalogue; publish one.
    registerModelsRoute(ctx);
    // Long-term user memory (Claude-Desktop style): seed the memory file so the
    // dynamic memory section (registered above, order 79) has content to inject.
    ensureMemoryFile();
    const pending = new PendingRegistry();
    const codexProgress = new CodexProgressStore();
    const codexPeer = new CodexPeer(config, codexProgress, {
        askWechat: (question, signal) => {
            const rt = preferredRuntime();
            return rt?.bridge?.askWechat(question, 300_000, signal) ?? Promise.resolve(null);
        },
    });
    // DSH 0.1.7-rc.2 moved reminders into a Host table and leaves the old
    // session-log ones behind without a word (see schedule-migrate.ts), so every
    // reminder the bot had confirmed would silently never fire. Carry the
    // WeChat session's pending ones over once both halves exist: the host
    // `schedule` service (rc.1 has none, so this never runs there) and the
    // warmed agent whose session holds the legacy events.
    const carryOverLegacyReminders = (rt) => {
        const schedule = hostSchedule;
        const session = rt?.warmSession;
        if (!schedule || !session || rt.carryOver)
            return;
        // The primary keeps the historical marker filename so an existing install
        // never re-migrates its main session; every other session gets its own.
        const markerPath = rt.primary
            ? path.join(resolveStateDir(), "schedule-migration.json")
            : path.join(resolveStateDir(), `schedule-migration-${shortAccountId(rt.accountId)}.json`);
        rt.carryOver = migrateLegacyReminders({
            schedule,
            sessionId: String(session.id),
            events: session.snapshotEvents(),
            markerPath,
        }).then((report) => {
            for (const item of report.created) {
                logger.info(`legacy reminder ${item.legacyId} carried over as ${item.hostId} (due ${item.scheduledAt}) [${String(session.id)}]`);
            }
            for (const item of report.skipped) {
                logger.warn(`legacy reminder ${item.legacyId} not carried over: ${item.reason}`);
            }
            if (report.present.length > 0) {
                logger.info(`legacy reminders already in the task table: ${report.present.join(", ")}`);
            }
        }, (err) => {
            logger.warn(`legacy reminders: carry-over failed, retrying on next start: ${String(err)}`);
        }).finally(() => {
            rt.carryOver = undefined;
        });
    };
    ctx.inject(["schedule"], (scoped) => {
        const service = scoped.schedule;
        if (!isHostSchedule(service))
            return;
        hostSchedule = service;
        scoped.effect(() => () => {
            if (hostSchedule === service)
                hostSchedule = undefined;
        });
        for (const rt of allRuntimes())
            carryOverLegacyReminders(rt);
    });
    // Session event feed: assistant replies for the WeChat sessions. Attached
    // once for the plugin lifetime; each bridge filters by its own session id,
    // and session ids are unique per account, so exactly one bridge reacts.
    ctx.on("session/event", (session, event) => {
        for (const rt of allRuntimes())
            rt.bridge?.onSessionEvent(session, event);
    });
    // Bridge routes for the local MCP server: list/read/drive sessions, and push
    // one WeChat message to the owner. Registered here rather than beside
    // registerModelsRoute because it needs `sendText` and the account getter,
    // both defined just above. The owner is the primary account's user.
    registerMcpRoutes(ctx, {
        config: primaryConfig,
        sendText,
        getAccount: () => primaryRuntime()?.account ?? null,
        codexProgress,
    });
    /** Start one account's monitor (idempotent, per account). */
    const startMonitor = (accountId) => {
        if (superseded || runtimes.has(accountId))
            return;
        const account = pickAccounts().find((candidate) => candidate.accountId === accountId);
        if (!account) {
            logger.info(`startMonitor: ${accountId} is not a bound account any more`);
            return;
        }
        if (!account.configured) {
            logger.info(`startMonitor: account ${accountId} not configured (no token)`);
            return;
        }
        const sessionId = rememberSessionId(sessionIdFor(accountId));
        const view = viewForSession(sessionId);
        const rt = {
            accountId,
            account,
            primary: accountId === primaryId,
            sessionId,
            bridge: null,
            router: null,
            monitorTask: null,
            /** Fresh per monitor start (an aborted controller cannot be reused). */
            abort: new AbortController(),
            warmSession: undefined,
            carryOver: undefined,
        };
        runtimes.set(accountId, rt);
        const boundSendText = (to, text) => sendTextVia(rt, to, text);
        const bridge = new WechatBridge(ctx, view, boundSendText, {
            codexPeer,
            getAccount: () => rt.account,
            getContextToken: (sender) => rt.router?.contextTokenFor(sender) ?? "",
            pending,
            crossSend: crossSendFor(rt),
        });
        rt.bridge = bridge;
        rt.router = new InboundRouter({
            config: view,
            account,
            bridge,
            pending,
            sendText: boundSendText,
        });
        const signal = rt.abort.signal;
        rt.monitorTask = runMonitor({
            account,
            signal,
            onMessage: (msg) => rt.router?.handle(msg),
            onStop: (reason) => {
                logger.warn(`monitor stopped (${accountId}): ${reason}`);
                void stopMonitor(accountId, reason);
            },
        });
        rt.monitorTask.catch((err) => {
            logger.error(`monitor crashed (${accountId}): ${String(err)}`);
            void stopMonitor(accountId, `monitor crashed: ${String(err)}`);
        });
        // 可选服务只能这样拿:回调只在真有这些服务的组合里触发,不会变成硬依赖。
        ctx.inject(["llm", "attachments"], (scoped) => { bridge.useVisionServices(scoped); });
        logger.info(`startMonitor: monitoring account=${accountId} session=${sessionId}`);
        // 定时提醒是 session-local 的:dsh-schedule 的定时器只在这个会话的 agent
        // 活着的时候存在。而 agent 过去是懒创建的 —— 只有收到微信消息才建。于是
        // 每次重启都会静默解除所有待触发的提醒,直到下一条消息进来才重新武装:
        // 2026-08-21 那条设在 09:00 的提醒,因为 07:43 重启、而下一条消息是 11:03,
        // 就迟了两个多小时才以"逾期"的形式补发。
        // 所以启动时就把 agent 预热出来,让待触发的提醒从开机起就是武装状态。
        // (0.1.7-rc.2 起提醒进了宿主的任务表,到点时宿主自己会把冷会话拉起来,
        // 这一条对新宿主不再必需;预热保留,是因为旧提醒的迁移要读这个会话的日志。)
        void bridge.ensureAgent().then(async (agent) => {
            logger.info(`startMonitor: agent warmed at startup (account=${accountId}, pending reminders armed)`);
            rt.warmSession = agent.session;
            carryOverLegacyReminders(rt);
            // 现在 installSelection() 已经跑过,路由才是真的,自检结果才可信。
            await bridge.reportVisionReadiness();
            await bridge.reportIdleCompactReadiness();
        }, (err) => logger.warn(`startMonitor: agent warm-up failed (${accountId}): ${String(err)}`));
    };
    /** Stop one account's monitor and release its bridge (idempotent). */
    const stopMonitor = async (accountId, reason) => {
        const rt = runtimes.get(accountId);
        if (!rt)
            return;
        runtimes.delete(accountId);
        logger.info(`stopMonitor: account=${accountId} ${reason}`);
        // Capture the senders while the bridge is still there: a queued approval
        // for this account must be withdrawn, or it would swallow the sender's
        // next WeChat message as the answer to a question nobody waits for.
        const senders = [rt.account?.userId, rt.bridge?.activeSender]
            .filter((value) => typeof value === "string" && value !== "");
        rt.abort.abort();
        try {
            await rt.monitorTask;
        }
        catch (err) {
            logger.warn(`stopMonitor: task error ${String(err)}`);
        }
        rt.monitorTask = null;
        rt.warmSession = undefined;
        await rt.bridge?.dispose();
        rt.bridge = null;
        rt.router = null;
        for (const sender of senders)
            pending.abortFor(sender);
        if (runtimes.size === 0)
            pending.abortAll();
    };
    /** Stop every account (idempotent). */
    const stopAll = async (reason) => {
        for (const accountId of [...runtimes.keys()])
            await stopMonitor(accountId, reason);
        pending.abortAll();
    };
    // Approval questions for WeChat sessions arrive in WeChat. `getBridge` is
    // called with the requesting agent's id, so each account's approval goes to
    // its own WeChat sender.
    const relay = new ApprovalRelay({
        config,
        getBridge: (agentId) => runtimeForSession(agentId)?.bridge ?? null,
        pending,
        sendText,
    });
    relay.register(ctx);
    // Optionally keep AGENTS.md / CLAUDE.md out of the WeChat sessions (config
    // workspaceInstructions; read per step, so the switch is live).
    registerWorkspaceInstructionsFilter(ctx, (agentId) => config.workspaceInstructions === false && runtimeForSession(agentId) !== undefined);
    // Optional ask_user_question / plan-review forwarding.
    tryRegisterQuestionProvider({
        ctx,
        config,
        pending,
        sendText,
        primaryUser: () => primaryRuntime()?.account?.userId,
    });
    // React to `clawbot login` / `clawbot logout` while the profile is running:
    // retire the accounts that disappeared, bring up the ones that appeared.
    const watcher = watchAccountStore(() => {
        const ids = listIndexedWeixinAccountIds();
        for (const accountId of [...runtimes.keys()]) {
            if (!ids.includes(accountId))
                void stopMonitor(accountId, "account removed (logout)");
        }
        if (ids.length === 0) {
            logger.info("watchAccountStore: no bound account; waiting for `clawbot login`");
            return;
        }
        for (const accountId of ids) {
            if (!runtimes.has(accountId))
                startMonitor(accountId);
        }
    });
    // One live instance per process. If the host reloaded us without disposing
    // the previous instance, retire it first, then start our own monitors.
    const claim = claimInstance(async (reason) => {
        superseded = true;
        logger.warn(`clawbot instance: ${reason}; stopping this older one (the host did not dispose it)`);
        watcher.close();
        codexPeer.close();
        await stopAll(reason);
    });
    logger.info(`clawbot instance #${claim.id} active`);
    if (config.autoStart) {
        void claim.ready.then(() => {
            if (!claim.isCurrent())
                return;
            for (const account of pickAccounts())
                startMonitor(account.accountId);
        });
    }
    return async () => {
        logger.info(`plugin unload: stopping clawbot (instance #${claim.id})`);
        superseded = true;
        claim.release();
        watcher.close();
        codexPeer.close();
        await stopAll("plugin unload");
    };
}
//# sourceMappingURL=index.js.map
