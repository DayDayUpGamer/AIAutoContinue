'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { writeDeterministicZip } = require('./deterministic-zip');

const root = path.resolve(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const packages = path.join(root, 'packages');
fs.rmSync(packages, { recursive: true, force: true });
fs.mkdirSync(packages, { recursive: true });

const sums = [];
for (const target of ['chrome', 'edge', 'firefox', 'safari', 'userscript']) {
  const src = path.join(root, 'dist', target);
  if (!fs.existsSync(src)) throw new Error(`Missing build target: ${target}. Run npm run build first.`);
  const name = `ai-auto-continue-${target}-${pkg.version}.zip`;
  const out = path.join(packages, name);
  writeDeterministicZip(src, out);
  const hash = crypto.createHash('sha256').update(fs.readFileSync(out)).digest('hex');
  sums.push(`${hash}  ${name}`);
  console.log(out);
}
fs.writeFileSync(path.join(packages, 'SHA256SUMS'), sums.join('\n') + '\n');
