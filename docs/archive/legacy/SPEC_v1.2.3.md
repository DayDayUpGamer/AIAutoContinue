# AI Auto Continue release specification v1.2.3

## Product boundary

AI Auto Continue operates only on officially maintained platform adapters. Users cannot bind arbitrary websites, and production builds do not guess controls on unknown domains.

## Supported adapter registry

ChatGPT, Claude, Gemini, Doubao, Qwen, DeepSeek, Kimi, Tencent Yuanbao, ChatGLM, Microsoft Copilot, Perplexity, and Grok. All remain Beta until authenticated live-site certification is complete.

## Unsupported behavior

- Popup displays an unsupported-site notice.
- Start and Stop controls are disabled.
- Background rejects `START_ACTIVE` before injection.
- Content Runtime independently rejects direct starts with `unsupported_site`.
- No text is written and no page control is clicked.

## Upgrade migration

The background deletes storage keys beginning with `aiac_binding:` plus `siteBindings`, `bindingSchemaVersion`, and `customLocators`.

## Development fixtures

Generic DOM detection is available only through `allowGenericForTesting:true` inside isolated automated tests. Production callers never pass this flag.
