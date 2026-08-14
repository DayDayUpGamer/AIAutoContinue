'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { writeDeterministicZip } = require('../build/deterministic-zip');

function sha(file) { return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'); }

test('deterministic ZIP is byte-identical across timestamps and file creation order', () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'aiac-zip-'));
  const src = path.join(temp, 'src');
  fs.mkdirSync(path.join(src, 'nested'), { recursive: true });
  fs.writeFileSync(path.join(src, 'z.txt'), 'last\n');
  fs.writeFileSync(path.join(src, 'nested', 'a.txt'), 'first\n');
  const first = path.join(temp, 'first.zip');
  const second = path.join(temp, 'second.zip');
  writeDeterministicZip(src, first);
  const future = new Date('2035-05-06T07:08:09Z');
  fs.utimesSync(path.join(src, 'z.txt'), future, future);
  fs.utimesSync(path.join(src, 'nested', 'a.txt'), future, future);
  writeDeterministicZip(src, second);
  assert.equal(sha(first), sha(second));
  assert.deepEqual(fs.readFileSync(first), fs.readFileSync(second));
  fs.rmSync(temp, { recursive: true, force: true });
});
