# Architecture

AI Auto Continue is a local-first WebExtension. Production builds intentionally have a narrow execution boundary.

## Runtime flow

1. The user opens the Popup on the active tab.
2. The shared platform registry resolves the active URL by **exact HTTPS host**.
3. Known login, account, settings, billing, support, and other non-chat paths fail closed.
4. The background service worker injects bundled scripts only after the user explicitly starts a run on a supported page.
5. The content runtime creates the matching built-in adapter and independently re-validates page readiness.
6. The state machine waits for the current response to finish, prefers a verified native continuation control, and otherwise sends a bounded continuation prompt.
7. Manual input, manual send, navigation, blocking/usage-limit UI, ambiguous send state, and similar safety events pause or stop automation.

## Trust boundaries

- Web-page content is untrusted.
- The extension does not accept user-defined site bindings.
- Built-in adapters are project-maintained and shipped locally.
- Test-only broad DOM adapters live under `tests/fixtures/` and are not copied into browser builds.
- The extension does not expose an installed/running signal through page-world `postMessage`.
- Browser settings are stored locally through extension storage.

## Main modules

- `src/shared/platforms.js` — exact host registry and URL/page-mode gate.
- `src/content/adapters.js` — platform-specific DOM adapter definitions and scoped control discovery.
- `src/content/core.js` — automation state machine and bounded continuation logic.
- `src/content/entry.js` — content runtime, manual-action protection, deferred language resolution, and lifecycle.
- `src/background/service-worker.js` — active-tab support gate and injection orchestration.
- `src/popup/` — compact high-frequency controls.
- `src/options/` — low-frequency settings.

See `SECURITY_MODEL.md` for the fail-closed security rules.
