# Open-source readiness audit — v1.3.1

## Scope

This audit prepared AI Auto Continue v1.3.1 for publication as a public GitHub repository.

## Findings and actions

- **License:** MIT license already present and retained.
- **Secrets:** no API keys, access tokens, passwords, private keys, authentication headers, or embedded user credentials found in the source tree.
- **Permissions:** Chromium manifests remain limited to `activeTab`, `scripting`, and `storage`.
- **Remote code:** release audit rejects remote runtime code and dynamic `eval` / `new Function` execution.
- **Unknown-site behavior:** production runtime retains official-adapter-only gating; Generic DOM detection remains test-only.
- **Third-party source:** `reference/` contains only a research record; no reviewed third-party source is redistributed.
- **Version consistency:** source `manifest/base.json` updated from stale `1.3.0` to `1.3.1`; builds still take the authoritative version from `package.json`.
- **Browser-test portability:** Chromium integration test now supports `AIAC_CHROMIUM_PATH`, `/usr/bin/chromium`, or Playwright-managed Chromium.
- **Generated files:** `dist/` and `packages/` are excluded from the GitHub source package and added to `.gitignore`.
- **Repository hygiene:** added `.gitignore`, `.gitattributes`, contribution guide, code of conduct, support policy, trademark notice, Issue forms, PR template, and GitHub Actions CI.
- **Website sources:** deployable privacy and support pages are included.

## Public repository recommendation

Commit source, tests, documentation, website source, and store assets. Publish browser ZIPs as GitHub Release assets rather than committing generated `dist/` or `packages/` directories to the main branch.

## Remaining operational checks

These items are external to the source repository and should be maintained by the publisher:

- keep the public privacy and support URLs reachable over HTTPS;
- retest third-party AI adapters after significant website changes;
- keep Chrome Web Store and other store disclosures aligned with actual behavior;
- use GitHub private security reporting or another private channel for vulnerability disclosures if enabled later.

## Verification result

The GitHub-ready source tree was tested after repository preparation:

- Node automated tests: **65 / 65 passed**.
- Chromium DOM integration: **passed**.
- Chrome / Edge / Firefox / Safari source builds: **passed**.
- Static manifest and JavaScript verification: **passed**.
- Security and release audit: **passed**.
- Release ZIP packaging: **passed**.
- Generated Chrome build content was compared against the previously verified v1.3.1 Chrome package: **no file-content differences**.
