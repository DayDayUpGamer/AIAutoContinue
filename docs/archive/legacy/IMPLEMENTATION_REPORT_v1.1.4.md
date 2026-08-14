# Implementation report — v1.1.4

## Goal

Keep AI Auto Continue free and add one low-interruption promotional link at the bottom of the extension settings panel.

## Implementation

- Destination: `https://muhook.com/`
- Placement: bottom of the popup/settings panel
- Label: “More from the publisher”
- Disclosure: promotional link, user-click only, no tracking parameters
- Opening mode: new browser tab
- Validation: exact canonical HTTPS URL and exact `muhook.com` hostname

## Explicitly not implemented

- No payment or license system
- No affiliate or referral parameters
- No click analytics
- No remote advertisement SDK
- No remote advertisement configuration
- No third-party-page advertisement injection
- No automatic opening

## Privacy behavior

Clicking the link does not cause the extension to send conversation content, prompts, settings or browsing activity to muhook.com. The destination website receives only the normal browser request produced by the user's explicit navigation.

## v1.1.4 copy update

The promotion description now reads: `Find your next favorite song hook.`
