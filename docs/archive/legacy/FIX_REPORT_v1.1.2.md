# v1.1.2 Manual Input Misclassification Fix

## Symptom

The extension inserted the configured prompt into an AI rich-text composer, but immediately paused with `manual_input`, so the prompt remained visible and was not sent.

## Root cause

ChatGPT and similar sites use `contenteditable` editors. The adapter uses the browser insertion path (`execCommand('insertText')` as a compatibility fallback) so the site's editor state updates correctly. Chromium can emit trusted `beforeinput` / `input` events for that operation. The runtime previously treated every trusted composer event as human input, so it paused its own write.

## Fix

- Added `onInternalWriteStart` and `onInternalWriteEnd` engine hooks.
- Added a Runtime internal write token scoped to runtime epoch, cycle, composer and expected prompt.
- Trusted events are ignored only while they match the internal write token and protected states.
- If the user changes the text, the composer no longer matches the token and the runtime pauses with `manual_input`.
- The token is cleared on stop, pause, cleanup, navigation or expiry.

## Validation

- Programmatic contenteditable insertion of `继续下一步` no longer pauses.
- The Send control enables and the prompt is submitted.
- Real keyboard input still pauses immediately.
- Node tests: 30/30 passed.
- Chromium DOM integration passed.
- Four browser builds, verification and security audit passed.
