# Open-source hardening audit — v1.3.2

## Outcome

All issues identified in the v1.3.1 public-release audit have been addressed in v1.3.2. No Critical or High severity issue was found during this hardening pass. This is not a claim that future vulnerabilities are impossible.

## Security boundary changes

- Exact HTTPS host allowlists replace suffix-based subdomain inheritance.
- Known non-chat URL modes fail closed before injection.
- Content runtime independently revalidates adapter page readiness.
- All composers, including strict selectors, require a verified chat root.
- Send, stop, assistant, user, and native-continuation discovery is scoped to that chat area.
- Generic DOM adapters are physically absent from production source/builds and exist only in `tests/fixtures/`.
- Extension/Userscript `window.postMessage` activity signaling and page-visible Userscript globals were removed.

## Open-source / supply-chain changes

- GitHub Actions references are pinned to full commit SHAs.
- Dependabot monitors GitHub Actions and Python test dependencies.
- Tag releases run the full test/build/audit/package pipeline.
- Release ZIPs receive GitHub artifact attestations in the release workflow.
- Vulnerability reporting is documented through GitHub Private Vulnerability Reporting.
- Firefox uses stable ID `ai-auto-continue@oppanda.com`.

## Reproducible release changes

- Packaging no longer shells out to OS `zip`.
- ZIP entries are sorted and use fixed timestamps/mode metadata.
- Release packaging is cross-platform Node.js code.
- A regression test verifies byte-identical archives after source-file timestamp changes.
- The full five-package output was generated twice and produced identical checksums.

## Documentation changes

- Public wording now uses “built-in” / “project-maintained” adapters instead of “official adapters”.
- Current architecture, adapter, security, testing, and release documents are separated from historical reports.
- Historical version documents are retained under `docs/archive/` and explicitly marked non-authoritative.
- Userscript Lite documentation warns against simultaneous use with the browser extension.

## Verification

- Node tests: 74/74 passed.
- Chromium DOM integration: passed.
- Browser builds: passed.
- Static verification: passed.
- Security/release audit: passed.
- Deterministic packaging: passed.
- Independent ZIP integrity check: passed.
