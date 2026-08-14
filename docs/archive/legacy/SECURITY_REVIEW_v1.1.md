# Security and reliability review — v1.1.2

Date: 2026-07-27

## Review result

The original 1.0.0 package passed its own tests, but the tests did not cover several browser-runtime races and unsafe fallback paths. Version 1.1.0 resolves the identified high-priority issues and expands the verification gates.

## Findings and resolutions

| Severity | Finding | Resolution |
|---|---|---|
| Critical | Starting again replaced the engine without invalidating pending work from the previous engine | Runtime epoch plus explicit old-engine stop before replacement |
| Critical | Every DOM mutation added another serialized Tick and could produce a large queue during streaming | Runtime and engine Tick coalescing |
| High | Smart start immediately submitted even when a site was streaming without a detectable Stop button | Startup observation window and response-activity detection |
| High | Sites without a Stop control could never enter a new response cycle after submission | Waiting-state response snapshot detection |
| High | Manual Send or native Continue did not pause automation | Trusted-control click guards |
| High | Binding intercepted only click; pointer handlers could execute first | Capture-phase pointerdown, mousedown, touchstart and click interception |
| High | Binding could save a plain `button` selector and later resolve the wrong control | Unique semantic/structural locators; no broad tag fallback |
| High | Generic `button[type=submit]` could be selected without sufficient semantic context | Scored control selection with proximity, semantics and ambiguity thresholds |
| High | Retry baseline checked too little state | User-message hash, response snapshot, composer and generation state must all remain unchanged |
| Medium | Full long answers were hashed repeatedly | Bounded response tail plus total length fingerprint |
| Medium | Options accepted negative, NaN or excessive values | Central option sanitization and UI validation |
| Medium | Adapter labels implied stability without authenticated regression | All current adapters marked Beta |
| Medium | Third-party source snapshots were redistributed without a complete license record | Removed snapshots; retained only reference metadata and hashes |
| Medium | Background tab cleanup could reject after tab removal | Defensive badge/storage cleanup |
| Low | Explicit Stop left stale overlay behavior | Explicit stop removes overlay; Pause retains explanatory overlay |

## Remaining limitations

- DOM selectors require live authenticated regression before store submission.
- Some rich-text editors may require platform-specific write methods.
- Script-generated clicks can be rejected by websites that require trusted user input; those modes must be marked unsupported.
- Safari still requires Xcode conversion, signing and native packaging tests.
