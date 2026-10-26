/**
 * At most one live clawbot instance per process.
 *
 * When DSH reloads this plugin in place — a cold setting changed, or a hot code
 * reload — the old instance is supposed to be disposed first, which is what the
 * function `apply` returns is for. In practice its unload line has never once
 * appeared in the log: on 2026-10-07 two settings edits left three instances
 * running side by side, each with its own WeChat long-poll. Every message was
 * handled three times, and the stale instances' 「正在输入」 never stopped.
 *
 * So whatever the host does, a new instance takes over: it stops the previous
 * one (monitor, bridge, typing, Codex peer, account watcher) before starting its
 * own monitor. The slot lives on `globalThis`, so a re-imported module (HMR)
 * still finds the instance the old module started.
 */
const KEY = Symbol.for("wechat-clawbot/active-instance");
function slot() {
    const g = globalThis;
    return (g[KEY] ??= { seq: 0 });
}
/**
 * Become the live instance. `stop` is what a newer instance calls to retire
 * this one; it must leave nothing running that talks to WeChat.
 */
export function claimInstance(stop) {
    const s = slot();
    const me = { id: ++s.seq, stop };
    const previous = s.active;
    s.active = me;
    const ready = previous === undefined
        ? Promise.resolve()
        : Promise.resolve()
            .then(() => previous.stop(`superseded by instance #${me.id}`))
            .catch(() => undefined);
    return {
        id: me.id,
        isCurrent: () => slot().active === me,
        ready,
        release: () => {
            const current = slot();
            if (current.active === me)
                current.active = undefined;
        },
    };
}
//# sourceMappingURL=instance-guard.js.map