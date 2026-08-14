# Implementation Report — v1.3.1 English UI

## Implemented

- Added packaged UI localization loader `shared/ui-i18n.js`.
- Added `uiLanguage` to settings schema v5.
- Added a dedicated Interface card to Options.
- Added selectable English, Simplified Chinese, Traditional Chinese, Japanese, Korean, and Browser default modes.
- Applied the selected language to Popup and Options without changing Chrome language.
- Kept prompt-language selection independent.
- Added English Popup, English Settings, and 1280 × 800 store-preview assets.

## Security and permissions

- Localization files are loaded only from `_locales` inside the extension package.
- No remote localization service, remote code, host permission, or network permission was added.

## Verification

- 65 Node tests passed.
- Chromium DOM integration passed.
- Chrome, Edge, Firefox, Safari source, and Userscript builds passed.
- Static verification and security audit passed.
