# v1.1.1 Smart Start Fix Report

## Root cause

v1.1.0 required an empty composer and an already-enabled Send button at the same time. ChatGPT and many modern AI pages disable, hide, or replace Send while the composer is empty, causing valid conversations to pause with `smart_start_not_ready`. The submission pre-check repeated the same circular dependency.

## Resolution

1. Smart-start readiness checks composer availability, empty draft, assistant context, and non-generating state only.
2. Prompt preparation no longer requires a Send control.
3. The prompt is written and verified first.
4. The engine enters `WAITING_SEND_READY` and waits for the Send control to become available.
5. Run epoch, cycle, prompt text, and generation state are revalidated before clicking.
6. Specific diagnostics replace the generic error where possible.

## Covered behaviours

- Send disabled while composer is empty.
- Send enabled asynchronously after input.
- Send hidden, replaced, or created after input.
- Send never becomes ready: safe pause without clicking unrelated controls.
