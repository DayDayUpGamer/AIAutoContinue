# Manual test guide — 1.2.3

## Automated gate

```bash
npm run all
```

Do not begin live-site testing unless all automated tests, static verification and audit pass.

## Local simulator

```bash
cd tests/simulator
python3 -m http.server 8765
```

Open `http://localhost:8765/chat-simulator.html` and load the unpacked browser build.

Verify:

1. A completed conversation waits through the startup observation window and sends once.
2. A fresh conversation with no Assistant response pauses instead of sending “继续”.
3. Streaming output is not interrupted.
4. Output mutation works even if the simulator hides the Stop button.
5. Native Continue is used before prompt submission.
6. Manual typing, Send, Stop and native Continue pause automation.
7. Existing composer text is never overwritten.
8. Repeated DOM mutations do not duplicate a send.
9. Clicking Start twice produces only the second run.
10. On an unsupported website, Start is disabled and no content script is injected.
11. Upgrade cleanup removes legacy `aiac_binding:*` and aggregate binding keys.
12. Rate-limit or login alerts pause execution.

## Live platform gate

For every target platform and browser, record:

- date and browser version;
- account type and locale;
- normal chat / reasoning / search / Agent mode;
- Adapter version;
- five-cycle result;
- premature sends;
- duplicate sends;
- wrong-conversation sends;
- behavior after manual Stop;
- selector or editor failures.

Promotion from Beta to Stable requires:

- at least 20 successful real runs;
- prompt submission success at least 95%;
- zero premature sends;
- zero duplicate sends;
- zero wrong-conversation sends;
- zero sends after trusted manual Stop.

Complex Agent, deep-research and document-generation modes are certified separately.


## Auto prompt language

1. Select Auto prompt mode and Auto language.
2. Open a completed Chinese AI conversation and start one run; verify the submitted prompt is `继续下一步`.
3. Open a completed English AI conversation and start a new run; verify the submitted prompt is `Continue with the next step.`.
4. Select Japanese explicitly while the conversation is English; verify the submitted prompt is `次のステップに進んでください。`.
5. Enter a custom prompt; verify it is sent unchanged regardless of conversation or browser language.
6. Upgrade from a version that stored `prompt`; verify the popup opens in Custom mode with the old prompt intact.
