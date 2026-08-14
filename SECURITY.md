# Security Policy

## Supported versions

Security fixes are applied to the latest release line. Older releases may not receive fixes.

## Reporting a vulnerability

Please report undisclosed vulnerabilities through **GitHub Private Vulnerability Reporting**:

1. Open this repository's **Security** tab.
2. Choose **Report a vulnerability**.
3. Submit the report privately to the maintainers.

Do **not** open a public issue for an undisclosed vulnerability.

Include, when available:

- affected browser and extension version;
- target AI site and page mode;
- exact reproduction steps;
- whether an unintended message or control activation occurred;
- redacted console output.

Do **not** include passwords, cookies, tokens, authentication headers, or private conversation content.

After publishing the repository, maintainers should enable **Settings → Security → Private vulnerability reporting** before announcing the project publicly.

## Security boundaries

The project intentionally follows these constraints:

- production builds run only on project-maintained, built-in adapters;
- host matching is exact: unlisted subdomains do not inherit support;
- login, account, billing, settings, and other known non-chat page modes fail closed;
- fallback composer selectors are scoped to a verified chat root rather than the full document;
- generic DOM adapters exist only as test fixtures and are not shipped in browser packages;
- unknown sites and user-defined bindings are rejected;
- permissions are limited to `activeTab`, `scripting`, and `storage` on Chromium builds;
- runtime code is bundled locally and does not load remote JavaScript;
- the extension does not broadcast an installed/running signal into the page world;
- the extension does not attempt to bypass login, CAPTCHA, rate limits, usage quotas, or AI-service safety controls;
- trusted manual input, manual send, navigation, and related user actions can pause automation;
- ambiguous automation state should fail closed rather than guess.
