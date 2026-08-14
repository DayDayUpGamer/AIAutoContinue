'use strict';
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const root = path.resolve(__dirname, '..');

function run(command, args, label) {
  console.log(`\n== ${label} ==`);
  const result = spawnSync(command, args, { cwd:root, stdio:'inherit', env:process.env });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status == null ? 1 : result.status);
}

const testFiles = fs.readdirSync(path.join(root, 'tests'))
  .filter((name) => name.endsWith('.test.js'))
  .sort()
  .map((name) => path.join('tests', name));

run(process.execPath, ['--test', ...testFiles], 'Node tests');
run(process.execPath, ['build/run-browser-test.js'], 'Chromium DOM integration');
run(process.execPath, ['build/build.js'], 'Browser builds');
run(process.execPath, ['build/verify.js'], 'Static verification');
run(process.execPath, ['build/audit.js'], 'Security/release audit');
run(process.execPath, ['build/package.js'], 'Deterministic packaging');
