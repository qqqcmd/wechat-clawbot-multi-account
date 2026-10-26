/**
 * Unified CDN URL construction for Weixin CDN upload/download.
 */
/** 设为 true 时，当服务端未返回 full_url 字段，回退到客户端拼接 URL；false 则直接报错。 */
export declare const ENABLE_CDN_URL_FALLBACK = true;
/** Build a CDN download URL from encrypt_query_param. */
export declare function buildCdnDownloadUrl(encryptedQueryParam: string, cdnBaseUrl: string): string;
/** Build a CDN upload URL from upload_param and filekey. */
export declare function buildCdnUploadUrl(params: {
    cdnBaseUrl: string;
    uploadParam: string;
    filekey: string;
}): string;
//# sourceMappingURL=cdn-url.d.ts.map