/**
 * `GET /plugins/clawbot/models` — the catalogue the settings card's dropdowns
 * are built from.
 *
 * The card needs three lists: providers, each provider's models, and each
 * model's reasoning efforts. All three are server facts (they come from
 * registered adapters and provider config), and the browser has no way to ask
 * for them: the client-side `modelDirectories` service reports the *current*
 * selection for a session, not the catalogue. So the plugin publishes what it
 * knows, the same way `dsh-balance-sidebar` publishes `/api/model-balance`.
 *
 * Everything here is name/metadata only — no keys, no endpoints, no counts.
 */
import type { Context } from "@deepseek-ai/cordis";
/**
 * Register the route, but only where both services exist.
 *
 * Both are read through `ctx.inject`: naming them in the plugin's own `inject`
 * list would make them hard requirements and take the whole loader tree down in
 * a headless composition that has neither. A bare property read is not an
 * option either — cordis THROWS for an un-injected service.
 */
export declare function registerModelsRoute(ctx: Context): void;
//# sourceMappingURL=models-route.d.ts.map