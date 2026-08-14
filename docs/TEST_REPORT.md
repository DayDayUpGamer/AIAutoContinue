# v1.3.2 test report

## Node suite

**74 tests passed.** Coverage includes:

- exact platform/host registry synchronization;
- arbitrary-subdomain rejection;
- non-chat page-mode rejection;
- pending navigation URL fail-closed handling;
- verified chat-root requirements even for strict composers;
- scoped send/stop/assistant/user/native discovery;
- state-machine safety and bounded options;
- native Continue priority and duplicate-fingerprint protection;
- manual input, click, Enter-key, and trusted-form-submit pause behavior;
- dynamic Send-button activation and send-readiness timeout;
- automatic/deferred prompt-language resolution;
- settings migration and UI-language selection;
- publisher-link restrictions and no tracking parameters;
- multi-browser manifests and minimum permissions;
- removal of user binding and production Generic Adapter behavior;
- source/build Userscript version consistency;
- deterministic ZIP byte identity;
- GitHub workflow full-SHA pinning;
- Dependabot / private security reporting / automated release attestation configuration;
- stable Firefox extension ID.

## Chromium DOM suite

The Chromium integration suite passed for engine submission, native continuation, streaming/no-stop detection, programmatic trusted form submission, manual-send protection, rich-text insertion, deferred language selection, unsupported runtime rejection, compact Popup behavior, Options persistence, localization, and support-page rendering.

Broad DOM behavior used by these fixtures is supplied from `tests/fixtures/dom-fixture-adapter.js`; the production adapter bundle no longer contains a Generic Test Adapter.

## Packaging verification

All five release ZIPs were generated twice with the deterministic packager. `SHA256SUMS` was byte-identical across both runs. An independent Python ZIP reader successfully parsed every archive and found no corrupt entry. No `tests/` path or generic fixture file is present in production packages.
