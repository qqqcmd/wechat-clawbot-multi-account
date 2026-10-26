export type RpcMessage = {
    id?: number | string;
    method?: string;
    params?: Record<string, unknown>;
    result?: unknown;
    error?: {
        code?: number;
        message: string;
    };
};
export interface CodexRpc {
    request<T>(method: string, params?: Record<string, unknown>): Promise<T>;
    close(): void;
}
export declare class CodexRpcError extends Error {
    readonly code?: number | undefined;
    constructor(message: string, code?: number | undefined);
}
export type CodexRpcOptions = {
    command?: string;
    args?: string[];
    socketPath?: string;
    timeoutMs?: number;
    onNotification?: (message: RpcMessage) => void;
    /** Undefined leaves the request with the other clients of a shared server. */
    onRequest?: (message: RpcMessage) => Promise<unknown | undefined>;
};
/** Also works when a desktop-launched DSH has a minimal PATH. */
export declare function findCodexBinary(override?: string): string;
export declare class CodexAppServer implements CodexRpc {
    private readonly options;
    private child;
    private socket;
    private connecting;
    private closed;
    private nextId;
    private readonly pending;
    constructor(options: CodexRpcOptions);
    private connect;
    private connectSocket;
    private openSocket;
    private initialize;
    private write;
    private receive;
    private rawRequest;
    request<T>(method: string, params?: Record<string, unknown>): Promise<T>;
    close(): void;
}
//# sourceMappingURL=codex-rpc.d.ts.map