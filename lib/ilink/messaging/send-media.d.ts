import type { WeixinApiOptions } from "../api/api.js";
/**
 * Upload a local file and send it as a weixin message, routing by MIME type:
 *   video/*  → uploadVideoToWeixin        + sendVideoMessageWeixin
 *   image/*  → uploadFileToWeixin         + sendImageMessageWeixin
 *   else     → uploadFileAttachmentToWeixin + sendFileMessageWeixin
 *
 * Used by both the auto-reply deliver path (monitor.ts) and the outbound
 * sendMedia path (channel.ts) so they stay in sync.
 */
export declare function sendWeixinMediaFile(params: {
    filePath: string;
    to: string;
    text: string;
    opts: WeixinApiOptions & {
        contextToken?: string;
        runId?: string;
    };
    cdnBaseUrl: string;
}): Promise<{
    messageId: string;
}>;
//# sourceMappingURL=send-media.d.ts.map