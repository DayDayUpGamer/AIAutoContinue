# v1.3.0 test report

## Unit/build suite

61 Node tests passed, including official platform gating, state-machine safety, prompt-language resolution, settings migration, publisher-link restrictions, multi-browser manifests, Options build output, and removal of user-binding behavior.

## Browser DOM suite

Chromium tests passed for:

- Dynamic Send-button activation.
- Native Continue priority.
- No-Stop-button generation detection.
- Trusted form submission protection.
- Internal rich-text write protection.
- Manual input and manual-send pause behavior.
- Automatic Chinese and English prompt resolution.
- Deferred language resolution.
- Unsupported runtime rejection.
- Compact popup height and one-action layout.
- Publisher link user-click behavior.
- Settings-page navigation.
- Unsupported-site dedicated Popup view.
- Options-page automatic saving and 12-platform rendering.

## Packaging

Chrome, Edge, Firefox, Safari Web Extension source, and Userscript Lite packages were generated with SHA-256 checksums.
