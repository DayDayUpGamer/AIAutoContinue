# Security and reliability review — v1.2.1

## Audit result

The v1.2.0 implementation passed its existing tests but contained several uncovered reliability and privacy weaknesses. They have been corrected in v1.2.1.

## Findings and fixes

### High: language resolved from an incomplete response

v1.2.0 resolved Auto language when Start was clicked. If the AI was still generating, a partial answer or browser-language fallback could be cached for the complete run.

**Fix:** prompt language is now resolved only before the first prompt submission, after response stability and all native Continue actions. The result is cached once for the remaining run.

### High: asynchronous resolution could revive paused work

Adding asynchronous prompt resolution creates a state transition boundary. Without an epoch/cycle check after the await, a manual pause could be followed by a stale transition to WRITING.

**Fix:** run epoch and cycle ownership are revalidated immediately after resolution.

### Medium: language detector could hang

A browser callback that never resolves could keep the run in prompt resolution indefinitely.

**Fix:** language detection has a bounded 1.5-second default timeout and safely falls back.

### Medium: Han-only Japanese could be misclassified

Script heuristics could classify short Japanese text containing mostly Kanji as Chinese before consulting a reliable browser result.

**Fix:** reliable Japanese/Korean results may override the ambiguous Han-only fallback, while Latin-language guesses cannot override clear Han text.

### Medium: keyboard send race

Some chat sites submit on Enter without dispatching a trusted Send-button click. v1.2.0 did not pause on that path.

**Fix:** trusted Enter-key and trusted form-submit events in the composer pause automation. Shift+Enter and IME composition are excluded.

### Medium: persisted binding validation

Locally stored bindings were schema-checked but not fully bounded. Corrupted storage could contain a foreign origin or excessive selectors.

**Fix:** exact origin, pathname, locator schema, selector count, selector length and total serialized size are validated before use.

### Low: passive extension probing

The Lite Userscript actively probed for the full extension, allowing a page to imitate the probe after content-script injection.

**Fix:** the probe/response handshake was removed. The full extension sends a one-way notification only when the user actually starts a run.

### Low: Userscript version drift

The 1.2.0 package filename contained 1.2.0 while the Userscript header still declared 1.1.0.

**Fix:** the build rewrites `@version` from `package.json`, and verification rejects a mismatch.

## Remaining release boundary

The shared implementation and simulated DOM paths are verified. Authenticated live-site regression is still required for every advertised AI service because their DOM and product modes can change independently.
