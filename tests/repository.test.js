'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');

function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }

test('GitHub workflows pin external actions to immutable full commit SHAs', () => {
  for (const rel of ['.github/workflows/ci.yml', '.github/workflows/release.yml']) {
    const text = read(rel);
    const uses = [...text.matchAll(/^\s*uses:\s*([^\s#]+)(?:\s+#.*)?$/gm)].map((match) => match[1]);
    assert.ok(uses.length > 0, `${rel} should use at least one action`);
    for (const use of uses) {
      if (use.startsWith('./')) continue;
      const ref = use.split('@')[1] || '';
      assert.match(ref, /^[0-9a-f]{40}$/, `${rel}: ${use} must use a full SHA`);
    }
  }
});

test('repository includes dependency updates, private security reporting guidance, and automated release attestation', () => {
  assert.ok(fs.existsSync(path.join(root, '.github/dependabot.yml')));
  assert.match(read('SECURITY.md'), /Private Vulnerability Reporting/i);
  const release = read('.github/workflows/release.yml');
  assert.match(release, /actions\/attest@[0-9a-f]{40}/);
  assert.match(release, /gh release create/);
});

test('release packaging is cross-platform and does not shell out to zip', () => {
  const packageSource = read('build/package.js');
  assert.equal(/execFileSync\s*\(\s*['"]zip['"]/.test(packageSource), false);
  assert.match(packageSource, /writeDeterministicZip/);
});

test('Firefox uses the stable project extension id', () => {
  const override = JSON.parse(read('manifest/firefox.override.json'));
  assert.equal(override.browser_specific_settings.gecko.id, 'ai-auto-continue@oppanda.com');
});
