'use strict';
const { spawnSync } = require('child_process');
const path = require('path');

const root = path.resolve(__dirname, '..');
const script = path.join(root, 'tests', 'browser_integration.py');
const candidates = [];
if (process.env.AIAC_PYTHON) candidates.push([process.env.AIAC_PYTHON, []]);
if (process.platform === 'win32') candidates.push(['py', ['-3']], ['python', []], ['python3', []]);
else candidates.push(['python3', []], ['python', []]);

let lastError = null;
for (const [command, prefix] of candidates) {
  const probe = spawnSync(command, [...prefix, '--version'], { encoding:'utf8' });
  if (probe.error || probe.status !== 0) { lastError = probe.error || new Error(probe.stderr || `${command} unavailable`); continue; }
  const result = spawnSync(command, [...prefix, script], { cwd:root, stdio:'inherit', env:process.env });
  if (result.error) throw result.error;
  process.exit(result.status == null ? 1 : result.status);
}
console.error(`Python 3 was not found. Set AIAC_PYTHON to a Python 3 executable. ${lastError ? lastError.message : ''}`);
process.exit(1);
