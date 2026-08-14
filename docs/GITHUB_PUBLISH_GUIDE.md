# GitHub publication guide

## Recommended repository

Suggested repository name:

`ai-auto-continue`

Suggested description:

`Local-first browser extension that safely continues long AI chat tasks on AI websites explicitly supported by this project.`

Suggested topics:

`browser-extension`, `chrome-extension`, `firefox-extension`, `webextension`, `chatgpt`, `claude`, `gemini`, `ai`, `automation`, `open-source`

## First publication

Create an **empty** GitHub repository. When uploading this existing source tree, do not initialize the remote repository with another README, `.gitignore`, or license, because those files already exist here.

From the `ai-auto-continue` directory:

```bash
git init
git branch -M main
git add .
git commit -m "Open source AI Auto Continue v1.3.2"
git remote add origin https://github.com/YOUR_GITHUB_USER/ai-auto-continue.git
git push -u origin main
```

Replace `YOUR_GITHUB_USER` with the real account or organization.

## Repository settings to enable

After the first push:

- Enable **Issues** so the included Issue Forms become available.
- Keep GitHub Actions enabled; `.github/workflows/ci.yml` runs the complete verification pipeline on pushes and pull requests.
- Enable **Private vulnerability reporting** in the repository security settings so researchers can report security problems without opening public issues.
- Optionally enable Discussions if you want a separate community area for usage questions and ideas.
- Set the repository website to `https://www.oppanda.com/ai-auto-continue/` when that page is publicly reachable.

## Release binaries

Do not commit generated `dist/` or `packages/` directories to the main branch. They are deterministic, reproducible build outputs and are ignored by `.gitignore`.

For local verification:

```bash
npm run all
```

For a public GitHub release, update `package.json` / `CHANGELOG.md`, commit the release, then push a tag that exactly matches the package version:

```bash
git tag v1.3.2
git push origin v1.3.2
```

`.github/workflows/release.yml` will rerun the full verification pipeline, create the five browser archives plus `SHA256SUMS`, generate artifact attestations for the ZIP files, and publish them as the GitHub Release assets.

The Chrome Web Store submission package can be the same verified Chrome ZIP when no store-specific build changes are required.

## Before each public release

Run:

```bash
npm run all
```

Also complete real-site smoke testing for every platform you plan to describe as supported in release notes or store listings. Third-party AI sites can change without a source-code change in this repository.

Verify that:

- privacy and support URLs are publicly reachable over HTTPS;
- permissions still match the documented privacy model;
- no credentials, cookies, tokens, private conversations, or developer-machine paths are included;
- `CHANGELOG.md` and store disclosures match the shipped behavior;
- generated ZIP checksums are published with the release.

## Branch protection recommendation

For a single-maintainer project, a lightweight setup is sufficient at first. Once external contributions begin, consider protecting `main` so pull requests must pass the `CI` workflow before merge.

## Security reports

The repository includes `SECURITY.md`. After enabling GitHub private vulnerability reporting, use that private channel for new security reports. Avoid handling undisclosed vulnerabilities through public Issues.
