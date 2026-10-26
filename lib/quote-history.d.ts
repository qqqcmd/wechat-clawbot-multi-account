type QuoteEntry = {
    msgId: string;
    /** Text content of the message ("" for media-only messages). */
    text: string;
    /** Local path when the message was an image we downloaded. */
    imagePath?: string;
    time: number;
};
/** Record a message (inbound or outbound) by its server msg id. */
export declare function recordQuoteMessage(entry: QuoteEntry): void;
/**
 * Look up a quoted message's content by its (possibly precision-lossy)
 * server msg id. Returns the best matching entry when one exists within
 * tolerance.
 */
export declare function lookupQuoteMessage(msgId: string): QuoteEntry | null;
export {};
//# sourceMappingURL=quote-history.d.ts.map