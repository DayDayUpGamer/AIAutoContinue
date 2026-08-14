# AI Auto Continue v1.2.0 Implementation Report

## Objective

Replace the fixed Chinese continuation prompt with a run-scoped, language-aware prompt while preserving custom prompt behavior and existing user settings.

## Resolution order

1. User custom prompt.
2. User-selected prompt language.
3. Latest completed assistant reply language.
4. Browser UI language.
5. English fallback.

The result is resolved once when a run starts and stored in the engine options for that run.

## Prompt languages

- Simplified Chinese
- Traditional Chinese
- English
- Japanese
- Korean
- Spanish
- French
- German
- Portuguese
- Italian
- Russian
- Arabic
- Hindi
- Turkish
- Indonesian
- Vietnamese
- Thai
- Dutch
- Polish

## Detection safety

- Reads only a bounded tail sample of the latest assistant reply.
- Removes fenced code, inline code, URLs, long hashes, and control characters before detection.
- Uses strong script detection for Chinese, Japanese, Korean, Arabic, Hindi, and Thai.
- Uses the browser i18n language detector for other supported languages.
- Rejects low-confidence language results.
- Does not persist the assistant sample.
- Does not transmit the sample to a server.
- Does not re-resolve language during the same run.

## Settings migration

Settings schema was upgraded to version 3.

- New installation: `promptMode = auto`.
- Existing settings containing the legacy `prompt` field: migrate to `promptMode = custom` and retain the exact prompt.
- Custom text remains stored while Auto is selected, allowing users to switch modes without losing it.

## Runtime changes

- Added `content/prompt-language.js`.
- Added `popup/prompt-settings.js`.
- Added `getLatestAssistantText()` to adapters.
- Added prompt-language resolution to the content runtime before engine construction.
- Added `promptLanguage` and `promptSource` to runtime status.
- Added prompt-language script to dynamic injection before the core runtime.

## UI changes

- Prompt mode selector: Auto / Custom.
- Explicit auto-prompt language selector.
- Localized fallback preview.
- Run-time language/source status.
- Popup localization for English, Simplified Chinese, Traditional Chinese, Japanese, and Korean.

## Compatibility

Legacy direct calls that pass only `prompt` remain supported and are interpreted as custom prompts. This protects older popup/content combinations during an extension reload.
