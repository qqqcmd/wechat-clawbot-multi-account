/**
 * Cheap pre-filter. Returns true when the message MIGHT contain a durable
 * user fact. Deliberately loose — the LLM does the final call. The previous
 * brittle exact-matching regex is gone; we only gate obvious noise.
 */
declare function mightContainFact(text: string): boolean;
/**
 * How the classifier reaches a model.
 *
 * Takes the fully rendered prompt, returns the model's raw text (or null when
 * the call failed). The bridge supplies one bound to the WeChat session's own
 * provider/model; tests supply a stub. Keeping it an injected function is what
 * lets this module stay free of any vendor URL, key, or wire format.
 */
export type MemoryJudge = (prompt: string) => Promise<string | null>;
/**
 * Ask the bot's own model whether the message holds a durable user fact.
 *
 * Returns { section, fact } or null. Never throws: a classifier failure must
 * not cost the user their reply, so every error path degrades to "nothing
 * worth remembering".
 */
declare function confirmWithLLM(text: string, judge: MemoryJudge | undefined): Promise<{
    section: string;
    fact: string;
} | null>;
/**
 * Scan the user messages of one just-finished turn; for each that passes the
 * cheap pre-filter, ask the LLM to confirm + rewrite, then append. Returns
 * how many facts were added. Never throws.
 */
export declare function captureTurnMemory(userTexts: string[], judge?: MemoryJudge): Promise<number>;
export { mightContainFact as extractMemoryCandidates, confirmWithLLM };
//# sourceMappingURL=memory-auto.d.ts.map