import type { Context } from "@deepseek-ai/cordis";
import { type Agent } from "@deepseek-ai/dsh-agent";
import { SessionId, type Session, type SessionEvent } from "@deepseek-ai/dsh-session";
import { type CodexPeer } from "./codex-peer.js";
import type { ClawbotConfig } from "./config.js";
import { PendingRegistry } from "./pending.js";
import type { ResolvedWeixinAccount } from "./ilink/auth/accounts.js";
export type SendTextFn = (to: string, text: string) => Promise<void>;
export type BridgeDeps = {
    /** Current bound account (API credentials), or null before login. */
    getAccount: () => ResolvedWeixinAccount | null;
    /** Outbound context token for a sender ("" when unknown). */
    getContextToken: (sender: string) => string;
    /** Pending WeChat interactions (approvals + questions). */
    pending: PendingRegistry;
    codexPeer?: CodexPeer;
};
/**
 * The durable, serializable reference `attachments.saveImages()` hands back.
 *
 * Mirrored here rather than imported from `@deepseek-ai/dsh-attachment`: this
 * plugin's dev tree carries an older copy of that package than the host runs,
 * and a bare import resolves to the near one (that mismatch is exactly what
 * silently broke attaching once already — see `attachImage`). Six plain fields,
 * all JSON, so mirroring costs nothing and cannot drift into a runtime crash.
 */
export type ImageRef = {
    attachmentId: string;
    mediaType: "image/png" | "image/jpeg" | "image/webp" | "image/gif";
    bytes: number;
    width: number;
    height: number;
    name?: string;
    /**
     * Present from dsh-attachment 0.1.1-rc.2 onward, and only when the store
     * actually resized: it now normalizes EXIF orientation and downscales
     * oversized images, recording what the original was.
     */
    originalDimensions?: {
        width: number;
        height: number;
    };
};
export declare class WechatBridge {
    private readonly ctx;
    private readonly config;
    private readonly sendText;
    private readonly deps;
    private readonly sessionId;
    private handle;
    private disposed;
    /** Agent contexts we already installed the model selection on (avoid duplicates). */
    private selectionInstalled;
    /** Queued turns waiting for the serialized worker (oldest first). */
    private readonly queue;
    /** Whether the WeChat tools are registered on the current agent scope. */
    private toolsRegistered;
    /** The sender whose turn is currently being driven (approvals go to them). */
    private currentSender;
    /** Messages sent in the current turn (cap enforcement, RULE B). */
    private turnMessageCount;
    /** Per-turn outbound message cap. */
    private static readonly MAX_TURN_MESSAGES;
    /** The serialized turn worker (one followup → idle at a time). */
    private worker;
    /** Time index of session message events (for quote backfill). */
    private sessionIndex;
    /**
     * Serialized outbound chain: assistant segments, tool acks, and approvals
     * are delivered one at a time so WeChat messages never interleave.
     */
    private sendChain;
    /** 「对方正在输入…」 from the moment a WeChat message is picked up until the turn ends. */
    private readonly typing;
    /** Compacts the session in the quiet time after a reply (see idle-compact.ts). */
    private readonly idleCompact;
    /** Tokens the last model request on this session carried, as reported by the provider. */
    private lastRequestTokens;
    constructor(ctx: Context, config: ClawbotConfig, sendText: SendTextFn, deps: BridgeDeps);
    /**
     * Log once at startup whether idle compaction can work here: the host's
     * command registry must be reachable and carry `/compact` for this session,
     * and the route must declare a window. Without this line a missing piece
     * would only show as "never compacts while idle".
     */
    reportIdleCompactReadiness(): Promise<void>;
    /** The host's pre-step compaction threshold for the bot's current route. */
    private hostCompactionThreshold;
    /**
     * Run the host's `/compact` on the WeChat session through the command
     * registry — the same entry the web UI's slash command uses, so the host does
     * the compaction exactly as it would by hand. Undefined when the registry or
     * the command is absent (e.g. a preset without compaction).
     */
    private runHostCompact;
    /** Keep 「正在输入」 up for this sender (no-op if it already is). */
    showTyping(sender: string): void;
    /** A message or file just reached this sender's phone. */
    noteDelivered(sender: string): void;
    /** Outbound context token for a WeChat sender ("" when unknown). */
    contextTokenFor(sender: string): string;
    /**
     * Send one text message to a WeChat user, serialized behind every other
     * outbound message so delivery order is preserved.
     */
    sendTextTo(sender: string, text: string, opts?: {
        uncapped?: boolean;
    }): boolean;
    get id(): SessionId;
    /**
     * Ask the user a question THROUGH WeChat and wait for their reply.
     * Used by the WeChat-scoped ask_user_question override so bot questions
     * never pop up in the webapp GUI. Returns the raw reply text, or null on
     * timeout / abort.
     */
    askWechat(question: string, timeoutMs?: number, signal?: AbortSignal): Promise<string | null>;
    /**
     * Install the deployment default model selection (provider/model/
     * reasoningEffort from settings.yaml) onto an agent context, once per
     * context. Used both by the agent setup and for agents the harness
     * resumed directly without running the bridge setup.
     */
    /**
     * One mutable selection shared by every agent context this bridge installs
     * into. `installModelSelection` is documented to snapshot `current` per step,
     * so writing a new value here switches the model from the next step onward —
     * no reinstall, no restart, no dropped WeChat connection.
     */
    private readonly selectionRef;
    /**
     * What this session should route to: the plugin's own pin when configured,
     * otherwise the deployment default.
     *
     * The default-following branch is why choosing a model in the web UI used to
     * move the bot as well — that picker writes through to the global
     * `agent-default-model`, and with nothing pinned here the bot simply adopts
     * it. Setting `model` in this plugin's settings breaks that coupling.
     */
    private desiredSelection;
    private installSelection;
    /**
     * Re-point the live selection after a settings change.
     *
     * A model id that cannot be resolved is REFUSED rather than applied: a typo
     * in the settings box would otherwise brick the bot on its next message, and
     * the failure would surface as a request error with no obvious cause. When
     * the llm service is unavailable the value is taken on trust — refusing
     * everything would be worse than a possible bad pin.
     */
    refreshSelection(): Promise<void>;
    /** Whether the given session id is the WeChat session. */
    isWechatSession(sessionId: string): boolean;
    /** The sender the current activity is attributed to (for approval routing). */
    get activeSender(): string | undefined;
    /**
     * Get (or create/resume) the WeChat agent. The agent is composed from the
     * deployment's default agent preset (standard coding tools) and its
     * approval policy is forced to `ask`, so remote access requests arrive in
     * WeChat regardless of the deployment-wide policy.
     *
     * Mirrors the headless runner's creation pattern: wait for the loader to
     * finish composing sibling plugins (otherwise the agent's world is
     * half-composed and the driver can stall) and install the deployment's
     * default model selection into the agent scope.
     */
    ensureAgent(): Promise<Agent>;
    /**
     * Deliver one WeChat text message immediately, no waiting window. Normal
     * flow: when the agent is idle the message starts a new turn. Interrupt
     * flow: when the agent is already mid-turn (the user interjects while we
     * are working), the message is STEERED into the running turn (next-step) so
     * the agent absorbs it and rethinks before replying — one reply total.
     * Returns immediately: the monitor loop must NEVER block on an agent turn.
     */
    /**
     * Whether the model this session will actually route to accepts image input.
     *
     * Read from the session's live request header (the route in force), falling
     * back to the agent's options. Any failure to resolve counts as "no": an
     * unproven route must not be handed an image it may reject, which would fail
     * the whole turn instead of just missing a picture.
     *
     * `llm` and `attachments` are deliberately NOT in this plugin's `inject`
     * list — declaring them makes them hard requirements, and a composition
     * without them (headless, say) would fail the entire loader tree. So they
     * are probed defensively and absence simply degrades to the old
     * path-plus-vision-tool behaviour.
     */
    private visionCtx;
    /**
     * Receive a context scoped by `ctx.inject(["llm","attachments"], …)`.
     *
     * The only safe way to reach an optional service here: bare property access
     * THROWS ("cannot get property \"llm\" without inject") and took down a whole
     * inbound message, while listing them in `export const inject` would make
     * them hard requirements and fail the loader tree wherever they are absent.
     * This callback simply never fires in such a composition.
     */
    useVisionServices(scoped: Context): void;
    /** Read a service from the injected context; undefined when unavailable. */
    private service;
    /**
     * Log at startup exactly what the image probe sees. Without it the only way
     * to learn why a photo was not attached was to ask for another photo, and a
     * genuine "not image capable" looks identical to a broken probe.
     */
    reportVisionReadiness(): Promise<void>;
    private llmService;
    /**
     * A `MemoryJudge` bound to **this session's own route**.
     *
     * Auto-memory used to POST straight to `api.deepseek.com` with a hardcoded
     * model and key. That was a second data destination, and switching the bot
     * to another provider made it worse rather than better: the conversation
     * moved, the personal-looking snippets did not. Going through the host
     * `llm` service fixes that for free — the service already owns baseURL,
     * credential lookup, and the wire format (this route speaks
     * `openai-responses`, DeepSeek speaks `openai-completions`; neither shape
     * belongs in this plugin).
     *
     * Returns undefined when the service is absent or the route is unresolved;
     * the caller then skips classification rather than reaching for a fallback
     * vendor.
     */
    private memoryJudge;
    /**
     * The provider/model this session will actually route to.
     *
     * Three sources, in descending authority. The live request header is the
     * truth once a request has been made. A resumed agent has neither — no
     * request yet in this process, and `options` is only populated on the create
     * path — which is why the first probe reported "route unknown" and quietly
     * disabled attachments. The deployment default is the reliable fallback
     * precisely because installSelection() pins it onto this agent, so it IS the
     * route the next turn takes.
     */
    private currentRoute;
    /**
     * Whether the model this session routes to can take an image in its input.
     * Public: the outbound pre-send check (`look_at_image` in tool.ts) gates on
     * exactly the same answer as the inbound attach.
     */
    routeTakesImages(): Promise<boolean>;
    /**
     * Commit one local image to the attachment store and hand back its durable
     * reference — downscaled first, because a camera original is tens of
     * megapixels and would blow the store's per-image limits long before it
     * reached the model.
     *
     * Public, and used by BOTH directions: an inbound WeChat photo (via
     * `imageBlock` below) and an outbound photo the agent is about to send (via
     * `look_at_image` in tool.ts). Those used to differ — inbound attached the
     * bytes natively while outbound handed a *path* to qwen and paid a second
     * round trip for it — and there was never a reason for two mechanisms.
     *
     * @param imagePath - the local image to commit.
     * @param tag - log prefix naming the caller, so the two directions stay
     *   distinguishable in the log.
     * @returns the durable reference, or null when anything is missing.
     */
    attachImage(imagePath: string, tag?: string): Promise<ImageRef | null>;
    /** Wrap `attachImage` as the content block an inbound message carries. */
    private imageBlock;
    enqueueMessage(sender: string, text: string, imagePath?: string): Promise<void>;
    /** Start the serialized worker if it is not already running. */
    private runWorker;
    /** Drive queued turns one at a time; never rejects. */
    private drainQueue;
    /**
     * Session event feed: track the active WeChat recipient for turns NOT
     * driven by the inbound queue. Assistant text is NEVER forwarded
     * automatically — the agent must call the send_wechat_text /
     * send_wechat_file tools explicitly to deliver anything to WeChat. This
     * method only:
     * - sets `currentSender` for scheduled-reminder injections (source plugin
     *   "schedule"), so the send tools know whom to deliver to; and
     * - clears the stale sender when a GUI-only turn ends, so GUI messages
     *   never get a WeChat recipient.
     */
    onSessionEvent(session: Session, event: SessionEvent): void;
    /**
     * Build (or refresh) a time index of all session message events, so quotes
     * of messages that predate the quote-history registry (e.g. before a
     * restart) can still be resolved by timestamp.
     */
    private buildSessionIndex;
    /**
     * Resolve a quote by the quoted message's server creation time (used when
     * the msg-id lookup misses, e.g. for messages sent before the quote
     * history started). Returns the nearest session message within tolerance.
     */
    lookupQuoteByTime(createTimeMs?: number): {
        text: string;
        imagePath?: string;
    } | null;
    /**
     * Register the WeChat-scoped tools (send_wechat_file, preview_wechat_image,
     * (send_wechat_file, preview_wechat_image) on an agent scope. Idempotent
     * per bridge lifetime; safe
     * to call from both the creation setup and the live-agent path.
     */
    private ensureTools;
    /**
     * Hide the multi-agent orchestration tools from the WeChat session.
     *
     * Observed failure: the agent called `send_message` with
     * `{subagent_id: "schedule-9", message: "ignore"}`, got
     * `subagent "schedule-9" is unavailable`, then retried with schedule-10,
     * -11, ... past -103 — 158 steps and 4.5M input tokens in about three
     * minutes ($0.11 of a $10 monthly allowance) before it was stopped by hand.
     * Running with reasoning_effort "none" (the only setting this gateway
     * accepts alongside tools) leaves no self-correction to break such a loop.
     *
     * `send_message` is the likeliest trigger: it sits next to this plugin's own
     * `send_wechat_text` in the same tool list, and the two names are easy to
     * conflate. None of these tools have a role in a one-on-one WeChat chat, so
     * denying them removes the whole failure mode rather than guarding it.
     *
     * A deny list, not an allow list: everything the bot actually uses (bash,
     * read/glob/grep, web_search, the vision tools, schedule_*, memory) keeps
     * working untouched. Per-scope restrictions also leave scoped registrations
     * alone, so the WeChat tools registered just above survive.
     */
    private restrictTools;
    /** Tear down the owned agent handle (the persisted session log survives). */
    dispose(): Promise<void>;
}
//# sourceMappingURL=bridge.d.ts.map