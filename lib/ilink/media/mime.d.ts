/** Get MIME type from filename extension. Returns "application/octet-stream" for unknown extensions. */
export declare function getMimeFromFilename(filename: string): string;
/** Get file extension from MIME type. Returns ".bin" for unknown types. */
export declare function getExtensionFromMime(mimeType: string): string;
/** Get file extension from Content-Type header or URL path. Returns ".bin" for unknown. */
export declare function getExtensionFromContentTypeOrUrl(contentType: string | null, url: string): string;
//# sourceMappingURL=mime.d.ts.map