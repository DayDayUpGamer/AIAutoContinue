# AI Auto Continue v1.2.1 implementation report

## Scope

This release audits and hardens v1.2.0 without changing its product model: free local-first operation, dual continuation strategies, automatic prompt language, multi-browser builds and the static muhook.com publisher link.

## Implemented changes

- Deferred and cached Auto-language resolution.
- Detection timeout and stale-conversation guard.
- CJK ambiguity correction.
- Manual Enter/form-submit protection.
- Settings migration validation and numeric bounds.
- Persisted binding validation.
- Userscript active-run mutual exclusion and automatic metadata versioning.
- Build/audit checks for generated caches, passive probes and version drift.

## Compatibility

- Custom prompt behavior is unchanged.
- Explicitly selected prompt languages still resolve immediately.
- Existing v1.2.0 settings migrate from schema version 3 to version 4.
- Auto mode remains Auto; legacy v1.1.x prompts remain Custom.
- The publisher destination remains exactly `https://muhook.com/`.
