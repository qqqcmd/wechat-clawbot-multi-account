import type { WeixinApiOptions } from "../api/api.js";
import type { SendMessageReq } from "../api/types.js";
import type { UploadedFileInfo } from "../cdn/upload.js";
export type WeixinMessageSendOptions = WeixinApiOptions & {
    contextToken?: string;
    runId?: string;
};
/** Build a SendMessageReq containing a single text message. */
export declare function buildTextMessageReq(params: {
    to: string;
    text: string;
    contextToken?: string;
    runId?: string;
    clientId: string;
}): SendMessageReq;
/**
 * Send a plain text message downstream.
 * @returns the generated client message id.
 */
export declare function sendMessageWeixin(params: {
    to: string;
    text: string;
    opts: WeixinMessageSendOptions;
}): Promise<{
    messageId: string;
}>;
/** Send an image message downstream using a previously uploaded file. */
export declare function sendImageMessageWeixin(params: {
    to: string;
    text: string;
    uploaded: UploadedFileInfo;
    opts: WeixinMessageSendOptions;
}): Promise<{
    messageId: string;
}>;
/** Send a video message downstream using a previously uploaded file. */
export declare function sendVideoMessageWeixin(params: {
    to: string;
    text: string;
    uploaded: UploadedFileInfo;
    opts: WeixinMessageSendOptions;
}): Promise<{
    messageId: string;
}>;
/** Send a file attachment downstream using a previously uploaded file. */
export declare function sendFileMessageWeixin(params: {
    to: string;
    text: string;
    fileName: string;
    uploaded: UploadedFileInfo;
    opts: WeixinMessageSendOptions;
}): Promise<{
    messageId: string;
}>;
//# sourceMappingURL=send.d.ts.map