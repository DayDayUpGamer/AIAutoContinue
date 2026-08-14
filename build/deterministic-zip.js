'use strict';

const fs = require('fs');
const path = require('path');

const FIXED_DOS_DATE = 0x0021; // 1980-01-01
const FIXED_DOS_TIME = 0x0000;
const UTF8_FLAG = 0x0800;
const STORE_METHOD = 0;

const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let c = i;
    for (let k = 0; k < 8; k += 1) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(buffer) {
  let crc = 0xFFFFFFFF;
  for (const byte of buffer) crc = crcTable[(crc ^ byte) & 0xFF] ^ (crc >>> 8);
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function listFiles(root) {
  const result = [];
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0)) {
      const absolute = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(absolute);
      else if (entry.isFile()) result.push(absolute);
      else throw new Error(`Unsupported filesystem entry: ${absolute}`);
    }
  }
  walk(root);
  return result.sort((a, b) => { const left=path.relative(root,a).split(path.sep).join('/'); const right=path.relative(root,b).split(path.sep).join('/'); return left < right ? -1 : left > right ? 1 : 0; });
}

function makeLocalHeader(nameBytes, data, crc) {
  const header = Buffer.alloc(30);
  header.writeUInt32LE(0x04034B50, 0);
  header.writeUInt16LE(20, 4);
  header.writeUInt16LE(UTF8_FLAG, 6);
  header.writeUInt16LE(STORE_METHOD, 8);
  header.writeUInt16LE(FIXED_DOS_TIME, 10);
  header.writeUInt16LE(FIXED_DOS_DATE, 12);
  header.writeUInt32LE(crc, 14);
  header.writeUInt32LE(data.length, 18);
  header.writeUInt32LE(data.length, 22);
  header.writeUInt16LE(nameBytes.length, 26);
  header.writeUInt16LE(0, 28);
  return header;
}

function makeCentralHeader(nameBytes, data, crc, localOffset) {
  const header = Buffer.alloc(46);
  header.writeUInt32LE(0x02014B50, 0);
  header.writeUInt16LE((3 << 8) | 20, 4); // Unix, ZIP 2.0
  header.writeUInt16LE(20, 6);
  header.writeUInt16LE(UTF8_FLAG, 8);
  header.writeUInt16LE(STORE_METHOD, 10);
  header.writeUInt16LE(FIXED_DOS_TIME, 12);
  header.writeUInt16LE(FIXED_DOS_DATE, 14);
  header.writeUInt32LE(crc, 16);
  header.writeUInt32LE(data.length, 20);
  header.writeUInt32LE(data.length, 24);
  header.writeUInt16LE(nameBytes.length, 28);
  header.writeUInt16LE(0, 30);
  header.writeUInt16LE(0, 32);
  header.writeUInt16LE(0, 34);
  header.writeUInt16LE(0, 36);
  header.writeUInt32LE((0o100644 << 16) >>> 0, 38);
  header.writeUInt32LE(localOffset, 42);
  return header;
}

function makeEocd(entryCount, centralSize, centralOffset) {
  if (entryCount > 0xFFFF) throw new Error('ZIP64 is not supported');
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054B50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(entryCount, 8);
  eocd.writeUInt16LE(entryCount, 10);
  eocd.writeUInt32LE(centralSize, 12);
  eocd.writeUInt32LE(centralOffset, 16);
  eocd.writeUInt16LE(0, 20);
  return eocd;
}

function writeDeterministicZip(sourceDir, outputFile) {
  const files = listFiles(sourceDir);
  const locals = [];
  const centrals = [];
  let localOffset = 0;

  for (const absolute of files) {
    const name = path.relative(sourceDir, absolute).split(path.sep).join('/');
    const nameBytes = Buffer.from(name, 'utf8');
    const data = fs.readFileSync(absolute);
    const crc = crc32(data);
    const localHeader = makeLocalHeader(nameBytes, data, crc);
    locals.push(localHeader, nameBytes, data);
    centrals.push(makeCentralHeader(nameBytes, data, crc, localOffset), nameBytes);
    localOffset += localHeader.length + nameBytes.length + data.length;
  }

  const central = Buffer.concat(centrals);
  const archive = Buffer.concat([...locals, central, makeEocd(files.length, central.length, localOffset)]);
  fs.mkdirSync(path.dirname(outputFile), { recursive: true });
  fs.writeFileSync(outputFile, archive);
  return { files: files.length, bytes: archive.length };
}

module.exports = { crc32, listFiles, writeDeterministicZip };
