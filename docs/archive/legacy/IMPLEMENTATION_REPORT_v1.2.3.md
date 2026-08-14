# Implementation report — v1.2.3 Official Adapters Only

## Implemented

- Removed the Popup binding action and all binding instructions.
- Removed the element-selection overlay, locator generation and persisted binding loading.
- Removed binding-derived Adapter construction.
- Production `createAdapter()` now returns `null` for unknown hosts.
- Generic DOM detection is available only to isolated fixtures through `allowGenericForTesting:true`.
- Added a shared registry for twelve official AI platform host groups.
- Popup disables Start and displays an unsupported-site notice on unknown URLs.
- Background rejects unknown URLs before script injection.
- Content Runtime independently rejects direct unknown-site starts.
- Upgrade cleanup deletes legacy binding storage while preserving normal settings.

## Verification

- Node tests: 61/61 passed.
- Chromium DOM integration: passed.
- Multi-browser builds: passed.
- Static verification: passed.
- Security/release audit: passed.
- Browser packages and checksums: generated.
