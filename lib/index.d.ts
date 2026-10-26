import type { Context } from "@deepseek-ai/cordis";
import { type ClawbotConfig } from "./config.js";
/** Stable Cordis plugin name for the clawbot row. */
export declare const name = "clawbot";
/**
 * Services the plugin uses directly. `agentPresets` and `userQuestions` are
 * deliberately NOT listed: they are optional (agent-presets only ships with
 * web/headless bundles) and are accessed defensively instead.
 */
export declare const inject: string[];
export { Config } from "./config.js";
export declare function apply(ctx: Context, rawConfig?: Partial<ClawbotConfig>): () => Promise<void>;
//# sourceMappingURL=index.d.ts.map