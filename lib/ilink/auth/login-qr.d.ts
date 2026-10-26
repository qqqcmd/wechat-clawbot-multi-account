/** Default `bot_type` for ilink get_bot_qrcode / get_qrcode_status (this channel build). */
export declare const DEFAULT_ILINK_BOT_TYPE = "3";
/**
 * 在终端展示二维码及备用链接。
 * 供 CLI 登录流程和 MCP Tool 登录流程共同复用。
 */
export declare function displayQRCode(qrcodeUrl: string): Promise<void>;
export type WeixinQrStartResult = {
    qrcodeUrl?: string;
    message: string;
    sessionKey: string;
};
export type WeixinQrWaitResult = {
    connected: boolean;
    /**
     * Server reported `binded_redirect`: the scanned bot is already bound to
     * this OpenClaw instance, so no new credentials are issued and existing
     * local credentials remain valid. Callers should treat this as a successful
     * outcome (semantically "already done") rather than a login failure.
     */
    alreadyConnected?: boolean;
    botToken?: string;
    accountId?: string;
    baseUrl?: string;
    /** The user ID of the person who scanned the QR code; add to allowFrom. */
    userId?: string;
    message: string;
};
export declare function startWeixinLoginWithQr(opts: {
    verbose?: boolean;
    force?: boolean;
    accountId?: string;
    apiBaseUrl: string;
    botType?: string;
}): Promise<WeixinQrStartResult>;
export declare function waitForWeixinLogin(opts: {
    timeoutMs?: number;
    verbose?: boolean;
    sessionKey: string;
    apiBaseUrl: string;
    botType?: string;
}): Promise<WeixinQrWaitResult>;
//# sourceMappingURL=login-qr.d.ts.map