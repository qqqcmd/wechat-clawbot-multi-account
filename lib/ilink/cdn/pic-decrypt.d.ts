/**
 * Download and AES-128-ECB decrypt a CDN media file. Returns plaintext Buffer.
 * aesKeyBase64: CDNMedia.aes_key JSON field (see parseAesKey for supported formats).
 */
export declare function downloadAndDecryptBuffer(encryptedQueryParam: string, aesKeyBase64: string, cdnBaseUrl: string, label: string, fullUrl?: string): Promise<Buffer>;
/**
 * Download plain (unencrypted) bytes from the CDN. Returns the raw Buffer.
 */
export declare function downloadPlainCdnBuffer(encryptedQueryParam: string, cdnBaseUrl: string, label: string, fullUrl?: string): Promise<Buffer>;
//# sourceMappingURL=pic-decrypt.d.ts.map