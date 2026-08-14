# AI Auto Continue v1.2.0 Test Report

## Automated coverage

- Prompt locale normalization.
- Simplified/Traditional Chinese variant handling.
- Localized prompt mapping.
- Custom prompt priority.
- Explicit language priority.
- Reliable conversation language detection.
- CJK and non-Latin script inference.
- Browser UI fallback.
- English fallback.
- Code/URL removal and bounded detection samples.
- New-install defaults.
- Legacy prompt migration.
- Build artifact inclusion.
- Content injection order.
- Runtime status metadata.
- Chromium DOM Chinese auto-prompt submission.
- Chromium DOM English auto-prompt submission.
- Existing smart-start, dynamic Send, rich editor, manual input, native Continue, binding, and promotion tests.

## Release boundary

Automated tests use local fixtures and Chromium DOM integration. Each supported AI website still requires authenticated live-site regression before the platform can be promoted from Beta.
