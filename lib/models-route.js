import { logger } from "./ilink/util/logger.js";
/**
 * Build the catalogue.
 *
 * `resolveModelInfo` is what carries the effort list, and it is called per model —
 * that is one adapter round trip each, so failures are absorbed per model
 * rather than failing the whole response: a provider with one unreachable
 * model should still populate the dropdown with the rest.
 */
async function catalogue(llm) {
    const providers = llm.listProviders?.() ?? [];
    const out = [];
    for (const provider of providers) {
        let models = [];
        try {
            models = (await llm.listModels?.(provider.id)) ?? [];
        }
        catch (err) {
            logger.warn(`models route: 列 ${provider.id} 的模型失败: ${String(err).slice(0, 100)}`);
        }
        const entries = [];
        for (const model of models) {
            let efforts = [];
            let defaultEffort;
            let takesImages = model.inputModalities?.includes("image") === true;
            try {
                const resolved = await llm.resolveModelInfo?.(provider.id, model.id);
                efforts = (resolved?.reasoning?.efforts ?? []).map((e) => ({ id: e.id, name: e.name ?? e.id }));
                defaultEffort = resolved?.reasoning?.defaultEffort;
                if (resolved?.inputModalities !== undefined) {
                    takesImages = resolved.inputModalities.includes("image");
                }
            }
            catch {
                // A model that will not resolve still belongs in the list — the user may
                // be configuring it before its key exists. It just has no effort list.
            }
            entries.push({
                id: model.id,
                name: model.name ?? model.id,
                efforts,
                ...(defaultEffort === undefined ? {} : { defaultEffort }),
                takesImages,
            });
        }
        out.push({ id: provider.id, name: provider.name ?? provider.id, models: entries });
    }
    return out;
}
/**
 * Register the route, but only where both services exist.
 *
 * Both are read through `ctx.inject`: naming them in the plugin's own `inject`
 * list would make them hard requirements and take the whole loader tree down in
 * a headless composition that has neither. A bare property read is not an
 * option either — cordis THROWS for an un-injected service.
 */
export function registerModelsRoute(ctx) {
    ctx.inject(["webServer", "llm"], (scoped) => {
        const server = scoped.webServer;
        const llm = scoped.llm;
        scoped.effect(() => server.register({
            kind: "exact",
            path: "/plugins/clawbot/models",
            async handler(_req, res) {
                try {
                    const providers = await catalogue(llm);
                    const body = JSON.stringify({ ok: true, providers });
                    res.writeHead(200, {
                        "content-type": "application/json; charset=utf-8",
                        "cache-control": "no-store",
                    });
                    res.end(body);
                }
                catch (err) {
                    logger.warn(`models route 失败: ${String(err).slice(0, 160)}`);
                    res.writeHead(500, { "content-type": "application/json; charset=utf-8" });
                    res.end(JSON.stringify({ ok: false, message: String(err).slice(0, 200) }));
                }
            },
        }), "clawbot: models route");
    });
}
//# sourceMappingURL=models-route.js.map