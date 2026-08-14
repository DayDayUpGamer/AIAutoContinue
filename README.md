# AI Auto Continue

[简体中文](README.zh-CN.md)

AI Auto Continue is a local-first browser extension that helps long AI-chat tasks keep moving. After the user explicitly starts a run, the extension waits for the current AI reply to finish, prefers the platform's native **Continue generating** control when available, and otherwise sends a bounded follow-up message.

Current version: **1.3.2**

![AI Auto Continue](assets/store/AI_Auto_Continue_Chrome_Store_English_1280x800.png)

## Highlights

- **Built-in adapters only** — production builds reject unknown websites instead of guessing DOM controls.
- **User-controlled runs** — choose 1, 3, 5, or 10 follow-ups and start explicitly on the current tab.
- **Native Continue first** — uses a reliable platform-native continuation control before sending a new prompt.
- **Language-aware prompts** — automatic continuation prompts can follow the completed AI reply language.
- **Manual-action protection** — typing, manual send, navigation, and related user actions can pause automation.
- **Local-first** — conversation content is processed in the browser and is not uploaded to a developer server.
- **Compact UI** — the popup is designed for daily use without scrolling; low-frequency settings live in the Options page.
- **Multi-browser source** — Chrome, Edge, Firefox, Safari Web Extension source, plus a limited Userscript Lite build.
- **Open source** — MIT licensed.

## Supported AI platforms

Built-in adapters currently exist for:

- ChatGPT
- Claude
- Gemini
- Doubao
- Qwen
- DeepSeek
- Kimi
- Tencent Yuanbao
- ChatGLM
- Microsoft Copilot
- Perplexity
- Grok

All live-site adapters are treated as **Beta** until authenticated regression has been completed for the current site version. Third-party AI websites change frequently; an adapter can require maintenance even when the extension itself has not changed.

## Safety boundaries

AI Auto Continue intentionally does **not**:

- run on arbitrary or user-bound websites;
- bypass login, CAPTCHA, rate limits, quotas, or AI-service safety controls;
- request broad `<all_urls>` access in Chromium builds;
- read cookies or browser history;
- load remote JavaScript or remote adapter definitions;
- upload complete AI conversations to the developer.

Ambiguous automation state is expected to fail closed and pause rather than guess.

## Permissions

Chromium builds use only:

- `activeTab` — operate on the tab where the user starts the extension;
- `scripting` — inject the bundled runtime into that supported AI tab;
- `storage` — keep local extension preferences and run-related settings.

See [Privacy Policy](docs/PRIVACY_POLICY.md) for the detailed data-handling description.

## Interface languages

The Popup and Options page support:

- Browser default
- English
- Simplified Chinese
- Traditional Chinese
- Japanese
- Korean

Interface language is independent from the language used for automatic continuation messages.

## Development setup

Requirements:

- Node.js 20+
- Python 3.10+
- Python Playwright
- Chromium (system installation or Playwright-managed browser)

Release packaging is implemented in Node.js and does not require a system `zip` executable.

Install the browser-test dependency:

```bash
python3 -m pip install -r requirements-dev.txt
python3 -m playwright install chromium
```

Run the full verification pipeline:

```bash
npm run all
```

The pipeline runs:

```text
Node tests
→ Chromium DOM integration
→ browser builds
→ static verification
→ security/release audit
→ ZIP packaging
```

Individual commands:

```bash
npm test
npm run test:browser
npm run build
npm run verify
npm run audit
npm run package
```

## Build outputs

Generated artifacts are intentionally ignored by Git:

- `dist/` — unpacked browser builds
- `packages/` — release ZIPs and SHA-256 checksums

To build locally:

```bash
npm run build
```

To produce deterministic release ZIPs:

```bash
npm run package
```

Repeated packaging of the same source/build tree produces byte-identical archives. Git tag releases are also automated by `.github/workflows/release.yml`.

## Load unpacked

### Chrome / Edge

1. Run `npm run build`.
2. Open the browser extension management page.
3. Enable Developer mode.
4. Choose **Load unpacked**.
5. Select `dist/chrome` or `dist/edge`.

### Firefox

1. Run `npm run build`.
2. Open `about:debugging#/runtime/this-firefox`.
3. Load `dist/firefox/manifest.json`.

### Safari

`dist/safari` is Web Extension source material only. Conversion, signing, and distribution require Xcode and the appropriate Apple developer workflow.

## Repository layout

```text
src/                 Extension runtime source
src/content/         State machine integration and project-maintained adapters
src/popup/           Compact popup UI
src/options/         Full settings UI
src/_locales/        Packaged UI translations
manifest/            Base and browser-specific manifests
build/               Build, verification, audit, and packaging scripts
tests/               Node and Chromium integration tests
userscript/          Limited native-continue Userscript variant
assets/store/        Store and documentation screenshots
docs/                Current architecture, adapters, security, testing, privacy, and release docs
privacy-site/        Deployable privacy-policy page
support-site/        Deployable support page
reference/           External architecture research record (no third-party source)
.github/              CI, issue forms, and pull-request template
```

## Current technical documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Built-in adapter policy](docs/ADAPTERS.md)
- [Security model](docs/SECURITY_MODEL.md)
- [Testing](docs/TESTING.md)
- [Release process](docs/RELEASE.md)
- [Privacy policy](docs/PRIVACY_POLICY.md)

Older implementation reports and version-specific reviews are retained under `docs/archive/` for historical context only.

## Userscript Lite

The Userscript Lite build is intentionally independent from the browser extension and implements only a limited native-continuation behavior. **Do not run Userscript Lite and the browser extension on the same AI page at the same time.** Page-world coordination was intentionally removed so websites cannot observe or spoof an extension-running signal.

## Privacy and support

- Privacy policy: https://www.oppanda.com/ai-auto-continue/privacy/
- Support: https://www.oppanda.com/ai-auto-continue/support/

The popup also contains a clearly labeled, user-initiated publisher link to `https://muhook.com/`. It is not required for extension functionality and contains no tracking or affiliate parameters in the extension source.

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md) before proposing changes. Adapter contributions require conservative selectors, automated tests, and live-site verification before being described as stable.

Security-sensitive findings should follow [SECURITY.md](SECURITY.md), not a public bug report.

## Third-party services and references

AI Auto Continue is an independent project and is not affiliated with the AI services it interoperates with. See [TRADEMARKS.md](TRADEMARKS.md).

Architecture research included the public `adamlui/chatgpt-auto-continue` project, but no source from that project is redistributed. See [NOTICE.md](NOTICE.md) and [reference/README.md](reference/README.md).

## License

MIT — see [LICENSE](LICENSE).
