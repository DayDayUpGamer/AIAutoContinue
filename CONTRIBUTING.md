# Contributing to AI Auto Continue

Thank you for contributing.

## Ground rules

AI Auto Continue automates actions inside third-party AI chat interfaces. Changes must favor **safety over broad compatibility**.

- Do not add unknown-site or user-defined DOM bindings to production builds.
- Do not add remote code, remote configuration, analytics, tracking, affiliate parameters, or hidden network requests.
- Do not add broad host access such as `<all_urls>` unless the project architecture and privacy model are explicitly redesigned and reviewed.
- Do not bypass login, CAPTCHA, rate limits, usage quotas, or AI-service safety controls.
- Do not copy source code from third-party browser extensions. Architectural references must be documented in `NOTICE.md` / `reference/README.md`.
- Never include credentials, cookies, tokens, private conversations, or user-identifying screenshots in issues or tests.

## Development setup

Requirements:

- Node.js 20+
- Python 3.10+
- Python Playwright for browser integration tests
- Chromium (system Chromium or Playwright-managed Chromium)

Packaging is cross-platform and does not require a system `zip` executable.

Install browser-test dependency:

```bash
python3 -m pip install -r requirements-dev.txt
python3 -m playwright install chromium
```

Run the full verification pipeline:

```bash
npm run all
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

## Adapter changes

When adding or updating a project-maintained AI-site adapter:

1. Keep selectors conservative and scoped to a verified chat root inside the supported AI conversation UI.
2. Prefer semantic attributes and platform-native controls over brittle CSS chains.
3. Treat ambiguous UI state as a reason to pause, not to guess.
4. Add or update automated tests.
5. Perform authenticated live-site regression before describing the adapter as stable.
6. Keep new adapters at `supportLevel: 'beta'` until live certification criteria are met.
7. Add hosts explicitly; never authorize arbitrary subdomains by suffix matching.
8. Keep generic DOM behavior in `tests/fixtures/`, never in production source.
7. Add hosts explicitly; never authorize arbitrary subdomains by suffix matching.
8. Keep generic DOM behavior in `tests/fixtures/`, never in production source.

## Pull requests

A pull request should:

- explain the user-visible behavior change;
- include tests for the change;
- pass `npm run all`;
- avoid generated `dist/` and `packages/` files;
- update documentation when behavior, privacy, permissions, or supported platforms change.

Small, focused pull requests are preferred.
