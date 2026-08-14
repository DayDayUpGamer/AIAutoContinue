# Changelog

## 1.3.2 — Open-source hardening

- Changed supported-host matching to exact HTTPS host allowlists; unlisted subdomains no longer inherit support.
- Added a fail-closed page-mode gate for known login, account, settings, billing, pricing, subscription, privacy, terms, help, and support routes.
- Scoped strict and fallback composers, send/stop controls, user messages, assistant messages, and native continuation controls to a verified chat root.
- Removed the Generic Test Adapter from production source and moved broad DOM behavior to `tests/fixtures/` only.
- Removed page-world Extension ↔ Userscript runtime signaling and page-visible Userscript globals.
- Kept Userscript source metadata version synchronized with `package.json` and added regression coverage.
- Added deterministic, cross-platform ZIP packaging with fixed metadata and no system `zip` dependency.
- Pinned GitHub Actions to immutable commit SHAs, added Dependabot, and added tag-driven GitHub Release automation with artifact attestations.
- Switched security reporting guidance to GitHub Private Vulnerability Reporting.
- Set a stable Firefox extension ID: `ai-auto-continue@oppanda.com`.
- Renamed public terminology from “official adapters” to “built-in / project-maintained adapters”.
- Reorganized current technical documentation and moved version-specific historical reports under `docs/archive/`.
- Added fail-closed tests for exact hosts, non-chat page modes, pending navigation URLs, production/test-code separation, and reproducible ZIPs.

## 1.3.1 — Selectable interface language

- Added an independent interface-language preference for the Popup and Options page.
- Added Browser default, English, Simplified Chinese, Traditional Chinese, Japanese, and Korean choices.
- English can now be selected while Chrome itself remains in Chinese.
- Kept interface language independent from continuation-message language.
- Added localized loading from packaged extension resources only; no remote translation service or new permission is used.
- Added migration to settings schema v5 and English-UI regression coverage.

## 1.3.0 — Compact popup and settings center

- Rebuilt the popup as a no-scroll quick controller with platform status, message summary, one-tap follow-up counts, progress, and a single context-aware Start/Stop action.
- Moved prompt mode, language, custom message, delay, native-continue limits, safety information, and supported-platform details to a dedicated Options page.
- Added user-facing state and pause/error descriptions instead of exposing internal state codes as the primary UI.
- Added a dedicated unsupported-site view that hides irrelevant automation controls.
- Replaced the large publisher card with a lightweight popup-footer link: `muhook.com · Find your next favorite song hook.`
- Added Chrome/Edge/Firefox/Safari Options-page builds and `options_ui` manifest configuration.
- Added Chromium UI regression tests for popup height, settings navigation, unsupported-site presentation, and Options auto-save.

## 1.2.3 — Built-in adapters only

- Removed the “Bind current AI site” UI and element-selection overlay.
- Removed persisted binding loading, binding message protocols and binding adapters.
- Disabled unknown-site Generic Adapter fallback in production; Generic DOM detection is test-only.
- Added a shared built-in-platform registry used by Popup and background support gates.
- Unsupported websites now show a clear notice and cannot start a run.
- Added automatic cleanup of legacy `aiac_binding:*`, `siteBindings`, `bindingSchemaVersion` and `customLocators` storage keys.
- Added unsupported-site, registry synchronization and no-binding build tests.

# 1.2.2

- Prevented programmatic form submissions from being misclassified as manual user sends.
- Added a real Chromium `<form>` regression test for trusted `submit` events.
- Corrected Auto-language timing disclosures and capability-matrix version.
- Added explicit AI-service safeguard and usage-limit policy disclosures.
- Added an in-product local-processing disclosure near the Start control.

## 1.2.1 — Deferred language resolution and release hardening

### Fixed

- Deferred Auto prompt language resolution until the first actual prompt submission, after the response and any native Continue operations finish.
- Prevented partial streaming text or browser language from being cached too early.
- Added a bounded language-detection timeout so a non-responsive browser API cannot hang Start.
- Corrected ambiguous Han-only Japanese/Korean detection when the browser detector is reliable.
- Added Enter-key and trusted form-submit protection for manual sends that do not emit a button click.
- Revalidated the run epoch and response cycle after asynchronous prompt resolution.
- Validated persisted site bindings for origin, schema, selector count and selector size before adapter construction.
- Normalized corrupted persisted settings and bounded all numeric settings during migration.
- Removed passive Userscript probing for the installed extension; Lite now disables only after an active full-extension run is announced.
- Synchronized Userscript metadata version with `package.json` during every build.
- Removed generated Python cache files from the release source package.

### Tests

- 54 Node tests.
- Chromium DOM integration includes deferred language resolution during streaming, language API timeout, Enter-key manual send and unsafe binding rejection.
- Chrome, Edge, Firefox, Safari source and Userscript builds verified.


## 1.2.0 — Language-aware continuation prompts

- Added Auto and Custom prompt modes.
- Added prompt resolution priority: custom → selected language → conversation language → browser UI language → English fallback.
- Added localized prompts for 19 language variants, including Simplified and Traditional Chinese.
- Detects the latest completed assistant reply once at run start and caches the result for the complete run.
- Added code/URL filtering and bounded text sampling before language detection.
- Added explicit language selection in the popup.
- Migrates legacy saved prompts to Custom mode without silently changing existing user behavior.
- Added popup localization for English, Simplified Chinese, Traditional Chinese, Japanese, and Korean.
- Added prompt language/source to runtime status.
- Added unit, migration, build, and Chromium DOM integration tests.


## 1.1.4 — Muhook promotional copy update

- Replaced the generic publisher-site description with: `Find your next favorite song hook.`
- Kept the destination fixed to `https://muhook.com/`.
- No permissions, tracking behavior, runtime logic or privacy behavior changed.

## 1.1.3 — Free distribution and publisher website link

- Confirmed the extension as free to use with no account, license or paid feature.
- Added one clearly labeled publisher promotion at the bottom of the settings panel.
- Set the fixed destination to `https://muhook.com/`.
- Added exact HTTPS/domain/path validation before opening the link.
- Added `noopener`/`noreferrer` protections and new-tab behavior.
- Added no-tracking disclosure in the interface, privacy policy and store-listing text.
- Added tests and release audit rules prohibiting affiliate parameters, remote ad scripts and remote promotion configuration.

## 1.1.2 - Manual input source guard

- Added an internal write token around programmatic rich-text insertion.
- Prevented trusted `beforeinput` / `input` events produced by `execCommand('insertText')` from being misclassified as user input.
- Kept manual typing protection: any text that diverges from the protected prompt still pauses immediately.
- Added Chromium integration coverage for contenteditable editors.


## 1.1.1 — 2026-07-27

### Fixed

- Removed the circular smart-start dependency on an already-enabled Send button.
- Split prompt readiness into pre-write and post-write checks.
- Added `WAITING_SEND_READY` and a bounded wait for dynamic Send controls.
- Supports Send buttons that are initially disabled, hidden, replaced, or created after input.
- Added specific diagnostics for composer, assistant context, and post-write Send readiness.
- Added two animation-frame synchronization after controlled editor input.

### Tests

- Added a Chromium DOM scenario where Send is disabled until the prompt is written and enabled asynchronously.
- Added unit tests proving smart start does not require a Send button before writing.
- Added timeout coverage when Send never becomes ready.


## 1.1.0 — 2026-07-27

### Fixed

- Invalidated the old engine when Start is clicked again.
- Coalesced MutationObserver Tick requests to prevent unbounded asynchronous queues.
- Added a startup observation window to prevent premature prompt submission.
- Detected response generation through content changes when no Stop control exists.
- Paused on trusted manual Send and native Continue actions, not only input and Stop.
- Prevented one-time binding from activating controls through pointer/click interception.
- Removed unsafe bare-tag locator fallback for binding.
- Strengthened send/composer/control scoring and ambiguity handling.
- Strengthened submission confirmation and safe retry baselines.
- Added option limits and prompt length validation.
- Removed redistributed third-party reference source.

### Changed

- All live-site adapters are Beta pending authenticated regression.
- Safari output is explicitly marked as unsigned source material.
- Package versions are generated from `package.json`.
- Browser ZIPs include SHA-256 checksums.

### Tests

- 27 Node tests.
- Chromium DOM integration covering strategy priority, no-stop generation, restart invalidation, manual Send protection and safe binding.
- Static syntax, permission and security audit.
