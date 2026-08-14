# v1.2.3 User-binding removal report

## Decision

Production builds support only officially maintained platform adapters. Unknown AI sites are not operated automatically.

## Removed

- Popup binding button and instructions.
- Page element-selection overlay.
- `START_BINDING` runtime/background messages.
- Persisted binding validation and loading.
- Binding-derived adapters and locators.
- Production Generic Adapter fallback.

## Migration

The background worker deletes legacy storage keys beginning with `aiac_binding:` and the older aggregate keys `siteBindings`, `bindingSchemaVersion`, and `customLocators`.

## New behavior

- Official supported host: normal Beta adapter workflow.
- Unknown host or browser internal page: Popup displays Unsupported and disables Start.
- A direct runtime start on an unknown host returns `unsupported_site`.
- Generic detection is exposed only when the isolated test harness passes `allowGenericForTesting:true`.
