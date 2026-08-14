# AI Auto Continue UI specification v1.3.0

## Popup purpose

The popup is a quick controller for daily use. It must not contain low-frequency configuration fields or require scrolling in the default supported-site state.

## Supported-site idle view

- App title and Settings control.
- Current official AI platform and human-readable state.
- One-line continuation-message summary.
- Follow-up choices: 1, 3, 5, and 10.
- One primary action: `Start {count} follow-ups`.
- One safety line: current tab only and pauses on user input.
- Lightweight publisher footer link.

## Running view

- Replace follow-up choices with sent/maximum progress.
- Show current activity in user language.
- Show native continuation count only when non-zero.
- Replace Start with one Stop action.

## Terminal states

- Paused/Error: show a human-readable notice and `Start again`.
- Finished: show completion state and `Run again`.
- Internal error codes remain available to runtime logs but are mapped to understandable UI copy.

## Unsupported websites

- Hide message and count controls.
- Show a dedicated unsupported-site explanation.
- Provide a link to the supported-platform section in Options.
- Never offer Start.

## Options page

The Options page owns:

- Automatic or custom continuation message.
- Automatic/fixed message language.
- Custom prompt editor.
- Default follow-up count.
- Send delay.
- Native continue enablement and per-response limit.
- Safety behavior summary.
- Officially supported platform list.
- Version and local-processing disclosure.

All settings save automatically to `storage.local` using the existing settings schema.

## Publisher link

Popup footer text:

`muhook.com · Find your next favorite song hook. ↗`

The URL is fixed to `https://muhook.com/`, opens only after a user click, and contains no tracking parameters.
