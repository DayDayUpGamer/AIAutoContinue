# Security and reliability review — v1.2.3

## Product-boundary hardening

The user-binding workflow and production Generic Adapter fallback were removed. This prevents users from accidentally selecting unrelated forms or buttons and prevents the extension from guessing controls on arbitrary websites.

## Defense in depth

1. The Popup identifies the active tab through the shared official-platform registry and disables Start on unsupported URLs.
2. The background rejects `START_ACTIVE` before content-script injection on unsupported URLs.
3. The Content Runtime independently refuses to construct an Adapter on an unknown hostname.
4. Generic DOM detection requires the explicit isolated-test flag `allowGenericForTesting:true`.

## Upgrade cleanup

The background removes legacy keys beginning with `aiac_binding:` and the older aggregate keys `siteBindings`, `bindingSchemaVersion`, and `customLocators`. Prompt and run settings are preserved.

## Retained safeguards

- Internal rich-text write token.
- Internal programmatic submit token.
- Manual typing, click, Enter, submit, Stop and native Continue pause guards.
- Native Continue and prompt submission mutual exclusion.
- Ambiguous submission pauses rather than retrying blindly.
- Login, CAPTCHA, rate-limit and quota blocking-state detection.
- Minimal extension permissions and no remote executable code.

## Remaining release boundary

Official Adapter presence does not certify live compatibility. Each advertised platform still requires authenticated live-site regression after every material UI change.
