# Built-in adapter policy

Production builds use only built-in, project-maintained adapters. Unknown hosts are unsupported.

## Host matching

Hosts are matched exactly. A listed host does not automatically authorize arbitrary subdomains. Any additional host must be explicitly added to both the shared platform registry and the corresponding adapter configuration.

## Page-mode gate

Known non-chat paths such as login, signup, account, settings, billing, pricing, subscription, privacy, terms, help, and support are rejected before automation begins.

The content adapter performs an additional readiness check before the state machine starts.

## DOM discovery rules

- Prefer stable semantic attributes and platform-specific selectors.
- Use `composerStrict` selectors first.
- A `composerFallback` may be used only inside a verified chat root.
- Send and stop controls are searched within a scope derived from the verified composer/chat root rather than across the entire document.
- Do not add generic whole-page `textarea`, arbitrary `contenteditable`, or all-button guessing to production adapters.
- Ambiguous candidates must fail closed.

## Support level

All built-in live-site adapters remain `beta` until current authenticated live-site regression criteria are met. Third-party page changes can require adapter maintenance independently of extension releases.

## Test fixtures

Broad generic DOM behavior used by automated browser fixtures belongs only in `tests/fixtures/`. The build and audit scripts verify that generic-test tokens do not appear in production browser packages.
