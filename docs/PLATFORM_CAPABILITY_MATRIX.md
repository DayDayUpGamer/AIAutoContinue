# Platform capability matrix — 1.3.2

| Adapter | Exact hosts | Scoped chat root | Native continuation | Live certification | Release label |
|---|---|---:|---:|---:|---|
| ChatGPT | chatgpt.com | Yes | Built-in selector + exact phrase | Pending | Beta |
| Claude | claude.ai, claude.com | Yes | Conservative exact-phrase fallback | Pending | Beta |
| Gemini | gemini.google.com | Yes | Conservative exact-phrase fallback | Pending | Beta |
| Doubao | doubao.com, www.doubao.com | Yes | Conservative exact-phrase fallback | Pending | Beta |
| Qwen | qianwen.com, www.qianwen.com, chat.qwen.ai | Yes | Conservative exact-phrase fallback | Pending | Beta |
| DeepSeek | chat.deepseek.com | Yes | Conservative exact-phrase fallback | Pending | Beta |
| Kimi | kimi.com, www.kimi.com | Yes | Conservative exact-phrase fallback | Pending | Beta |
| Yuanbao | yuanbao.tencent.com | Yes | Conservative exact-phrase fallback | Pending | Beta |
| ChatGLM | chatglm.cn, www.chatglm.cn | Yes | Conservative exact-phrase fallback | Pending | Beta |
| Copilot | copilot.microsoft.com, copilot.com | Yes | Conservative exact-phrase fallback | Pending | Beta |
| Perplexity | perplexity.ai, www.perplexity.ai | Yes | Conservative exact-phrase fallback | Pending | Beta |
| Grok | grok.com, www.grok.com | Yes | Conservative exact-phrase fallback | Pending | Beta |

Hosts are exact allowlist entries; unlisted subdomains are unsupported. Known login/account/settings/billing and other non-chat page modes fail closed. Composer fallback and control discovery require a verified chat root.

A platform may be promoted to Stable only after its current live test matrix passes with zero premature sends, duplicate sends, wrong-conversation sends, or sends after a trusted user Stop.
