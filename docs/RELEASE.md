# Release process

## Local release verification

```bash
npm run all
```

Generated browser archives are written to `packages/` with `SHA256SUMS`.

Packaging is deterministic: entries are sorted, timestamps and file mode metadata are fixed, and no operating-system `zip` executable is required. With the same source tree and toolchain, repeated packaging produces byte-identical archives.

## GitHub release

The repository includes `.github/workflows/release.yml`. Pushing a tag that exactly matches `v<package.json version>` runs the complete verification pipeline, builds release archives, creates GitHub artifact attestations for the ZIP files, and publishes the release assets plus `SHA256SUMS`.

Example:

```bash
git tag v1.3.2
git push origin v1.3.2
```

Do not commit `dist/` or `packages/` to the main branch.

## Browser stores

Use the verified browser-specific ZIP from `packages/`. Store-specific metadata, screenshots, privacy URLs, and live-site compatibility claims must match the shipped release.
