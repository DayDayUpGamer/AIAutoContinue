# AI Auto Continue v1.3.2 final verification

## Automated results

- Node tests: **74/74 passed**.
- Chromium DOM integration: **passed**.
- Chrome, Edge, Firefox, Safari source, and Userscript builds: **passed**.
- Static JavaScript / Manifest verification: **passed**.
- Security and release audit: **passed**.
- Exact-host and unlisted-subdomain rejection: **passed**.
- Known non-chat page-mode rejection: **passed**.
- Pending-navigation fail-closed behavior: **passed**.
- Verified chat-root scoping for strict/fallback composers and controls: **passed**.
- Production/test Generic Adapter separation: **passed**.
- Page-world runtime-signal removal: **passed**.
- Userscript source/build version consistency: **passed**.
- GitHub workflow full-SHA pinning checks: **passed**.
- Cross-platform deterministic ZIP unit test: **passed**.
- Whole-release second-build SHA-256 comparison: **identical**.
- Independent ZIP integrity parsing: **passed**.
- Production archives contain no `tests/` or generic DOM fixture files: **confirmed**.

## Release artifacts

The release process generates:

- `ai-auto-continue-chrome-1.3.2.zip`
- `ai-auto-continue-edge-1.3.2.zip`
- `ai-auto-continue-firefox-1.3.2.zip`
- `ai-auto-continue-safari-1.3.2.zip`
- `ai-auto-continue-userscript-1.3.2.zip`
- `SHA256SUMS`

## Remaining release boundary

Automated verification cannot certify current authenticated behavior on third-party AI websites. Built-in adapters remain **Beta** until live-site regression is completed against the current version of each advertised AI service.
