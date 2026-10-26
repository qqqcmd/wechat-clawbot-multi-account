export type ImageCompressOptions = {
    /** Long-edge pixel cap for the compressed image. */
    maxImageEdge: number;
    /** Primary JPEG quality (ladder falls back to 60 then 40). */
    imageQuality: number;
    /** Only compress images larger than this many bytes. */
    compressThresholdBytes: number;
};
/**
 * Create a downscaled JPEG copy of an image for FAST local analysis (vision
 * tools choke on multi-megapixel originals). Returns the copy path, or the
 * original path when the image is already small or not an image. The caller
 * must delete the returned temp file when it differs from the input path.
 */
export declare function makePreviewCopy(filePath: string, opts: ImageCompressOptions): string;
/** What {@link compressForUpload} decided. `temp` marks a file the caller must delete. */
export type UploadPrep = {
    path: string;
    bytes: number;
    temp: boolean;
    /** Human note for the pre-upload notice, e.g. "5568x3712 11.5MB → 2048x1365 0.6MB". */
    note?: string;
};
/**
 * Shrink an outbound image so the WeChat CDN will actually accept it.
 *
 * Full-resolution camera files (5568x3712, 5-12MB) make the C2C CDN answer
 * HTTP 500 — not a clean size error — and each failure burns the whole retry
 * ladder, so a single photo could hang for minutes and then fail. Downscaling
 * to `maxImageEdge` and walking the quality ladder until the copy fits
 * `compressThresholdBytes` keeps uploads in the range that works (a 108KB
 * image sends in ~9s).
 *
 * Best effort throughout: any sips failure returns the original, because
 * sending something beats sending nothing.
 */
export declare function compressForUpload(filePath: string, opts: ImageCompressOptions): UploadPrep;
//# sourceMappingURL=image-compress.d.ts.map