# Security model

## Primary safety goal

Prevent unintended input or message submission when the current website, page mode, conversation state, or DOM target cannot be identified with sufficient confidence.

## Fail-closed rules

Automation must not start, or must pause, when any of these conditions applies:

- host is not an exact built-in host;
- URL is a known non-chat page mode;
- a trusted chat composer cannot be identified;
- send state is ambiguous after writing;
- a user types or sends manually;
- the conversation/navigation context changes;
- usage-limit, quota, login, CAPTCHA, upgrade, or other blocking UI is detected;
- a native continuation control would be clicked repeatedly for the same response fingerprint;
- configured continuation limits are reached.

## Data boundary

AI response text and composer state may be inspected locally to operate the extension and resolve automatic continuation language. The production runtime does not upload conversation content to a developer server and does not load remote executable code.

## Page-world boundary

The extension does not intentionally broadcast installation or runtime state through `window.postMessage`. The limited Userscript Lite build is independent; users should not run the Userscript and browser extension simultaneously on the same page.

## Permissions

Chromium builds use `activeTab`, `scripting`, and `storage`. Broad host permissions and sensitive browser-data permissions are intentionally excluded.
