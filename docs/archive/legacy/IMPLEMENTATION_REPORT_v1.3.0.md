# v1.3.0 compact UI implementation report

## Implemented

- Replaced the long settings-form popup with a compact quick controller.
- Added platform/status header and state color indicator.
- Added message-mode summary with an Edit shortcut.
- Added one-tap follow-up choices and persistent count selection.
- Added one state-aware primary action instead of simultaneous Start and Stop buttons.
- Added progress/activity view during a run.
- Added human-readable pause/error mappings.
- Added a dedicated unsupported-site view.
- Added a standalone Options page with automatic local saving.
- Moved all low-frequency controls from Popup to Options.
- Replaced the former publisher card with one lightweight footer hyperlink.
- Added `options_ui` to all browser manifests and build output.
- Added UI build, browser DOM, height, unsupported-state, navigation, and Options-save tests.

## Popup size

Chromium DOM test result for the supported idle popup:

- Width: 360 px.
- Rendered body height: approximately 342 px.
- No textarea or advanced settings controls in Popup.
- Main action visible without scrolling.

## Compatibility

The existing settings schema and automation runtime are unchanged. Existing user preferences continue to load and can be edited in Options.
