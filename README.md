# wechat-clawbot-multi-account

DeepSeek Harness 的微信 ClawBot 插件 —— **多微信账号补丁版**（基于官方 `wechat-clawbot` v0.9.10）。

让一个 DSH 同时把**多个微信号**都挂上线（各自的 ClawBot 都能显示「已连接」并双向收发），
而不是只有字母序第一个绑定能用。

## 和官方版的区别

| 位置 | 官方 v0.9.10 | 本补丁版 |
|---|---|---|
| `lib/index.js` | `pickAccount()` 返回 `ids[0]`，只认第一个账号 | 每个账号一个独立 runtime，全部上线 |
| `lib/index.js` | `startMonitor()` 一次只跑一条长轮询 | 每账号独立长轮询，互不阻塞 |
| `lib/index.js` | 单账号 `sessionId` | 主账号用 `wechat-main`，其余账号按后缀分配会话 |
| 扫码 | 只能绑一个 | 可绑多个，各自扫码各自连接 |

## 安装

```bash
dsh plugin --profile desktop add qqqcmd/wechat-clawbot-multi-account
```

装完重启 DSH。然后在 **设置 → 插件 → 微信 Bot** 卡片里扫码登录即可；
每个微信号扫一次，全部会同时在线。

## 行为细节

- 主账号（第一个登录的）占用 `config.sessionId`（默认 `wechat-main`）；
  其余账号的会话 id 自动带后缀（如 `wechat-main-20e8`）。
- 跨账号发消息：同一微信用户在不同账号间的消息按扫码人路由。
- 补丁会保留官方所有功能：MCP 路由、定时提醒（dsh-schedule）、记忆、图片压缩等。

## 源码与上游

- 本包 = 官方 `wechat-clawbot@0.9.10`（npm）全量文件 + 5 个补丁文件
  （`lib/index.js`、`lib/prompt.js`、`lib/approvals.js`、`lib/bridge.js`、`lib/tool.js`）。
- 上游：https://github.com/Alphainfix/wechat-clawbot （MIT）
- 补丁源码与回滚脚本见工作区 `clawbot-multi-account/`（`orig/` 原版、`patched/` 补丁、`apply.ps1`）。

## License

MIT（上游）; 多账号补丁部分由本仓库作者贡献，同样 MIT。
