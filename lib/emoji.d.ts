/**
 * Clean up outbound WeChat text. The model is unreliable at following "no
 * emoji" instructions, so the plugin enforces the policy deterministically
 * rather than trusting the prompt.
 *
 * Two different things, with two different rules:
 *
 *   - **Unicode emoji** (😊 ✅ 🎉) are a matter of taste, so they follow the
 *     `stripEmoji` setting. The prompt's rule C.3 flips with the same setting,
 *     so the model is not told to produce something that gets stripped on the
 *     way out.
 *
 *   - **WeChat's own bracket codes** (`[捂脸]`, `[好的]`) are removed
 *     unconditionally. They are WeChat's internal notation, and sending them
 *     through this bridge does NOT turn them into a picture on the recipient's
 *     client — he just sees the literal brackets. They are never right, so
 *     there is no setting for them.
 */
/**
 * Remove WeChat's bracket emoji codes. Applied to every outbound message,
 * whatever the emoji setting says, because they render as literal text.
 */
export declare function stripWechatCodes(text: string): string;
/** Remove Unicode emoji characters (and the bracket codes along the way). */
export declare function stripEmoji(text: string): string;
//# sourceMappingURL=emoji.d.ts.map