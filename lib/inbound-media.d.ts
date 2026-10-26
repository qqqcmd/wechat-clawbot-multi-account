import type { MessageItem } from "./ilink/api/types.js";
export type InboundMediaResult = {
    /** Local path of a downloaded/decrypted image. */
    imagePath?: string;
    /** Local path of a downloaded/decrypted file attachment. */
    filePath?: string;
    mime?: string;
};
/**
 * Download and decrypt media from a single MessageItem (image or file).
 * Returns an empty object when the item is unsupported or failed.
 */
export declare function downloadMediaFromItem(item: MessageItem, deps: {
    cdnBaseUrl: string;
    label: string;
}): Promise<InboundMediaResult>;
//# sourceMappingURL=inbound-media.d.ts.map