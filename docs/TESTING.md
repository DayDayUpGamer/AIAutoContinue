# Testing

## Full verification

```bash
npm run all
```

This executes:

1. Node unit/regression tests.
2. Chromium DOM integration tests.
3. Multi-browser build.
4. Static build verification.
5. Security/release audit.
6. Deterministic browser ZIP packaging.

## Browser integration

```bash
npm run test:browser
```

The test runner uses `AIAC_CHROMIUM_PATH` when provided, otherwise a system Chromium when available, and otherwise Playwright-managed Chromium.

## Adapter regression

Changes to built-in adapters should test exact host rejection, page-mode rejection, composer scoping, manual-action pause behavior, native-continuation priority, dynamic send controls, and fail-closed behavior when send confirmation is ambiguous.

## Live-site certification

Automated DOM fixtures do not prove compatibility with a current third-party AI website. A platform remains Beta until authenticated live-site regression is completed against the current site version.
