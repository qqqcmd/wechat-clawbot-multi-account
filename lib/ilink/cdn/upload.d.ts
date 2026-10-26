import type { WeixinApiOptions } from "../api/api.js";
export type UploadedFileInfo = {
    filekey: string;
    /** 由 upload_param 上传后 CDN 返回的下载加密参数; fill into ImageItem.media.encrypt_query_param */
    downloadEncryptedQueryParam: string;
    /** AES-128-ECB key, hex-encoded; convert to base64 for CDNMedia.aes_key */
    aeskey: string;
    /** Plaintext file size in bytes */
    fileSize: number;
    /** Ciphertext file size in bytes (AES-128-ECB with PKCS7 padding); use for ImageItem.hd_size / mid_size */
    fileSizeCiphertext: number;
};
/**
 * Download a remote media URL (image, video, file) to a local temp file in destDir.
 * Returns the local file path; extension is inferred from Content-Type / URL.
 */
export declare function downloadRemoteImageToTemp(url: string, destDir: string): Promise<string>;
/** Upload a local image file to the Weixin CDN with AES-128-ECB encryption. */
export declare function uploadFileToWeixin(params: {
    filePath: string;
    toUserId: string;
    opts: WeixinApiOptions;
    cdnBaseUrl: string;
}): Promise<UploadedFileInfo>;
/** Upload a local video file to the Weixin CDN. */
export declare function uploadVideoToWeixin(params: {
    filePath: string;
    toUserId: string;
    opts: WeixinApiOptions;
    cdnBaseUrl: string;
}): Promise<UploadedFileInfo>;
/**
 * Upload a local file attachment (non-image, non-video) to the Weixin CDN.
 * Uses media_type=FILE; no thumbnail required.
 */
export declare function uploadFileAttachmentToWeixin(params: {
    filePath: string;
    fileName: string;
    toUserId: string;
    opts: WeixinApiOptions;
    cdnBaseUrl: string;
}): Promise<UploadedFileInfo>;
//# sourceMappingURL=upload.d.ts.map