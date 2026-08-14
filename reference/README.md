# External reference record

The project `adamlui/chatgpt-auto-continue` was downloaded and reviewed during architecture research on 2026-07-27:

- Repository: https://github.com/adamlui/chatgpt-auto-continue
- Reviewed areas: Chromium content script, Chromium manifest, Firefox manifest, userscript/multi-browser packaging approach.

The reviewed snapshots had these local SHA-256 hashes:

- Chromium content script: `81909666f9e668b41fd208e1dfc267dd9d82405e6cf29f218485fcbe428f57dc`
- Chromium manifest: `fc131c1bd92d6d6077ee412416f613636675e62a882c0ca31e53912308b5fe10`
- Firefox manifest: `77adcbd4f5dd3f25316a190f895e65d7659989ff84be451bbc078824c99f9bf0`

No third-party source file is redistributed in this project. Runtime code was independently implemented. The reference influenced only these architectural ideas:

1. Detect and click a platform-native continuation control.
2. Generate separate Chromium and Firefox packages.
3. Offer a limited userscript variant.
