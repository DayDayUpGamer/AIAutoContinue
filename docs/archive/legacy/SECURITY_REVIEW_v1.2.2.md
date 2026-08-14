# Security and release review — v1.2.2

## Fixed release blocker

Chromium emits a trusted `submit` event even when a submit button is activated through programmatic `.click()`. v1.2.1 treated every trusted form submission as manual user activity, so AI pages implemented with a `<form>` could pause during the extension's own submission.

v1.2.2 brackets internal prompt/native actions with a short-lived run- and cycle-scoped token. Trusted submit events generated synchronously by the internal click are ignored, while trusted user clicks and Enter key presses still pause before submission.

## Policy hardening

The store and privacy disclosures now explicitly state that the extension does not bypass AI service login, CAPTCHA, rate-limit, quota or safety controls and pauses on detected blocking states. Auto-language timing text now matches runtime behavior.

## Remaining boundary

No static or simulated test can certify third-party live DOM compatibility. Public Stable labeling remains conditional on authenticated live-site testing.


## Additional release-policy hardening

- **Per-run message authorization:** the popup shows the current recipient site, prompt behavior and maximum automatic message count before Start.
- **AI service safeguards:** visible rate-limit, quota, login, CAPTCHA and verification states pause automation; the extension does not attempt to bypass them.
- **Publisher promotion:** remains click-only, static and disclosed, but is still an unrelated-content review risk under Chrome Web Store single-purpose review. Removing it from the first store submission gives the lowest policy risk.


## v1.2.3 official-adapter-only update

The user-binding workflow and production unknown-site fallback have been removed. Legacy binding storage is deleted during upgrade; unsupported sites cannot start automation. See `REMOVAL_REPORT_v1.2.3.md`.
