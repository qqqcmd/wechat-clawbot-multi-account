/** Codex RPC over stdio or a local WebSocket/Unix socket. No private UI APIs. */
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { connect as connectUnix } from "node:net";
/**
 * `ws` is loaded on first socket connection, not at import time: this module
 * sits on the plugin's main load path, and a missing dependency there would
 * keep the whole plugin — the WeChat bot included — from loading. Now it can
 * only break Codex socket mode.
 */
let wsModule;
const loadWs = () => (wsModule ??= import("ws"));
export class CodexRpcError extends Error {
    code;
    constructor(message, code) {
        super(message);
        this.code = code;
    }
}
/** Also works when a desktop-launched DSH has a minimal PATH. */
export function findCodexBinary(override) {
    if (override?.trim())
        return override.trim();
    const candidates = [
        ...(process.env.PATH ?? "").split(path.delimiter).filter(Boolean).map((dir) => path.join(dir, "codex")),
        path.join(os.homedir(), ".local", "bin", "codex"),
        "/opt/homebrew/bin/codex",
        "/usr/local/bin/codex",
        "/Applications/Codex.app/Contents/Resources/codex",
        "/Applications/ChatGPT.app/Contents/Resources/codex-cli/CodexCLI.app/Contents/MacOS/codex",
    ];
    for (const candidate of candidates) {
        try {
            fs.accessSync(candidate, fs.constants.X_OK);
            return candidate;
        }
        catch { /* next */ }
    }
    return "codex";
}
export class CodexAppServer {
    options;
    child;
    socket;
    connecting;
    closed = false;
    nextId = 1;
    pending = new Map();
    constructor(options) {
        this.options = options;
    }
    connect() {
        if (this.closed)
            return Promise.reject(new Error("Codex bridge was disposed"));
        if (this.connecting)
            return this.connecting;
        if (this.options.socketPath)
            return this.connectSocket(this.options.socketPath);
        if (!this.options.command)
            return Promise.reject(new Error("Codex command or socket is required"));
        const child = spawn(this.options.command, this.options.args ?? [], {
            stdio: ["pipe", "pipe", "pipe"],
            // Keep the user's Codex login and configuration in their existing home.
            env: { ...process.env },
            windowsHide: true,
        });
        this.child = child;
        let buffer = "";
        let stderr = "";
        const failed = (error) => {
            if (this.child !== child)
                return;
            this.child = undefined;
            this.connecting = undefined;
            child.kill();
            for (const entry of this.pending.values()) {
                clearTimeout(entry.timer);
                entry.reject(error);
            }
            this.pending.clear();
        };
        child.on("error", () => failed(new Error("Could not launch Codex. Configure codexBinary or install the CLI.")));
        child.stdin.on("error", () => failed(new Error("Codex RPC input closed")));
        child.on("exit", () => failed(new Error("Codex app-server disconnected. For live sessions, start a shared daemon or configure codexSocket."
            + (stderr ? ` ${stderr.trim().slice(-500)}` : ""))));
        child.stderr.setEncoding("utf8");
        child.stderr.on("data", (chunk) => { stderr = (stderr + chunk).slice(-2_000); });
        child.stdout.setEncoding("utf8");
        child.stdout.on("data", (chunk) => {
            buffer += chunk;
            // A corrupt or non-RPC executable must not accumulate unbounded output.
            if (Buffer.byteLength(buffer) > 8 * 1024 * 1024) {
                failed(new Error("Codex RPC frame exceeds 8 MiB"));
                return;
            }
            let end;
            while ((end = buffer.indexOf("\n")) >= 0) {
                const line = buffer.slice(0, end).trim();
                buffer = buffer.slice(end + 1);
                if (!line)
                    continue;
                try {
                    const message = JSON.parse(line);
                    if (!message || typeof message !== "object")
                        throw new Error("invalid frame");
                    this.receive(child, message);
                }
                catch {
                    failed(new Error("Codex returned an invalid JSON-RPC frame"));
                    return;
                }
            }
        });
        this.connecting = this.initialize(child).catch((error) => { failed(error); throw error; });
        return this.connecting;
    }
    connectSocket(socketPath) {
        if (!path.isAbsolute(socketPath)) {
            return Promise.reject(new Error("codexSocket must be an absolute IPC path"));
        }
        const attempt = loadWs().then(({ default: WebSocketImpl }) => this.openSocket(WebSocketImpl, socketPath), () => {
            wsModule = undefined;
            if (this.connecting === attempt)
                this.connecting = undefined;
            throw new Error("Codex socket mode needs the ws package: run npm install in the plugin directory");
        });
        this.connecting = attempt;
        return attempt;
    }
    openSocket(WebSocketImpl, socketPath) {
        if (this.closed)
            return Promise.reject(new Error("Codex bridge was disposed"));
        const socket = new WebSocketImpl("ws://localhost", {
            // The HTTP Upgrade goes over IPC, never TCP/DNS. This also preserves spaces in paths.
            createConnection: () => connectUnix({ path: socketPath }),
            handshakeTimeout: this.options.timeoutMs ?? 30_000,
            maxPayload: 8 * 1024 * 1024,
            followRedirects: false,
        });
        this.socket = socket;
        this.connecting = new Promise((resolve, reject) => {
            const failed = (error) => {
                if (this.socket === socket) {
                    this.socket = undefined;
                    this.connecting = undefined;
                    socket.terminate();
                    for (const entry of this.pending.values()) {
                        clearTimeout(entry.timer);
                        entry.reject(error);
                    }
                    this.pending.clear();
                }
                // Disposal can clear this.socket before the handshake rejects.
                // Always settle this connection's promise without touching a newer one.
                reject(this.closed ? new Error("Codex bridge was disposed") : error);
            };
            socket.on("error", (error) => failed(new Error(error.code === "WS_ERR_UNSUPPORTED_MESSAGE_LENGTH"
                ? "Codex RPC frame exceeds 8 MiB; reduce the history page size or use summarized items"
                : "Cannot connect to the shared Codex App Server. Start the correct server or configure codexSocket.")));
            socket.on("close", () => failed(new Error("Shared Codex App Server disconnected; delivery of pending messages is unknown")));
            socket.on("message", (data, isBinary) => {
                try {
                    if (isBinary)
                        throw new Error("binary frame");
                    const message = JSON.parse(data.toString());
                    if (!message || typeof message !== "object")
                        throw new Error("invalid frame");
                    this.receive(socket, message);
                }
                catch {
                    failed(new Error("Codex returned an invalid WebSocket RPC frame"));
                }
            });
            socket.once("open", () => { void this.initialize(socket).then(resolve).catch(failed); });
        });
        return this.connecting;
    }
    async initialize(connection) {
        await this.rawRequest("initialize", {
            clientInfo: { name: "wechat_clawbot", title: "WeChat Clawbot", version: "1.0.0" },
            capabilities: { experimentalApi: true },
        });
        this.write(connection, { method: "initialized", params: {} });
    }
    write(connection, message) {
        const data = JSON.stringify(message);
        if ("stdin" in connection)
            connection.stdin.write(`${data}\n`);
        else
            connection.send(data);
    }
    receive(connection, message) {
        if (message.method) {
            if (message.id !== undefined) {
                // No automatic approval of commands, files, or permissions.
                void this.options.onRequest?.(message).then((result) => {
                    if (result !== undefined && (this.child === connection || this.socket === connection))
                        this.write(connection, { id: message.id, result });
                }).catch((error) => {
                    if (this.child === connection || this.socket === connection)
                        this.write(connection, {
                            id: message.id,
                            error: { code: error instanceof CodexRpcError ? error.code ?? -32603 : -32603,
                                message: error instanceof Error ? error.message : "Codex client request failed" },
                        });
                });
            }
            else {
                this.options.onNotification?.(message);
            }
            return;
        }
        if (typeof message.id !== "number")
            return;
        const entry = this.pending.get(message.id);
        if (!entry)
            return;
        this.pending.delete(message.id);
        clearTimeout(entry.timer);
        if (message.error)
            entry.reject(new CodexRpcError(message.error.message, message.error.code));
        else
            entry.resolve(message.result);
    }
    rawRequest(method, params) {
        const connection = this.child ?? this.socket;
        if (!connection)
            return Promise.reject(new Error("Codex app-server is not connected"));
        const id = this.nextId++;
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                this.pending.delete(id);
                // Do not replay timed-out mutations: the server may already have acted.
                reject(new Error(`Codex ${method} timed out; delivery is unknown. Check the session before retrying.`));
            }, this.options.timeoutMs ?? 30_000);
            this.pending.set(id, { resolve: (value) => resolve(value), reject, timer });
            this.write(connection, { id, method, params });
        });
    }
    async request(method, params = {}) {
        await this.connect();
        return this.rawRequest(method, params);
    }
    close() {
        this.closed = true;
        for (const entry of this.pending.values()) {
            clearTimeout(entry.timer);
            entry.reject(new Error("Codex bridge was disposed"));
        }
        this.pending.clear();
        const child = this.child;
        this.child = undefined;
        const socket = this.socket;
        this.socket = undefined;
        // Socket mode only closes our connection, never the shared daemon.
        socket?.terminate();
        child?.kill();
    }
}
//# sourceMappingURL=codex-rpc.js.map