# ChatGPT Auto-Continue reference analysis

Reference: https://github.com/adamlui/chatgpt-auto-continue

Reviewed during the initial implementation:

- Chromium Manifest V3 packaging;
- Firefox background-script packaging;
- native “Continue generating” control detection;
- userscript distribution.

Applied independently in this project:

- Native Continue is one strategy in a mutually exclusive dual-strategy engine.
- Prompt submission runs only when no reliable native control exists and the answer is stable.
- Native clicks are bounded, fingerprinted and verified.
- Shared code builds Chrome, Edge, Firefox, Safari source and Userscript packages.
- Runtime code has no remote CDN dependency.

Third-party source snapshots are not redistributed. The reference record and reviewed snapshot hashes are stored in `reference/README.md`.
