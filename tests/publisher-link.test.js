const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const publisher = require('../src/popup/publisher-link.js');

test('publisher link accepts only the canonical HTTPS muhook.com URL', () => {
  assert.equal(publisher.getPublisherUrl(), 'https://muhook.com/');
  assert.equal(publisher.getPublisherUrl('https://muhook.com/'), 'https://muhook.com/');

  for (const rejected of [
    'http://muhook.com/',
    'https://www.muhook.com/',
    'https://muhook.com/path',
    'https://muhook.com/?utm_source=extension',
    'https://muhook.com/#promo',
    'https://muhook.com.evil.example/'
  ]) {
    assert.throws(() => publisher.getPublisherUrl(rejected), rejected);
  }
});

test('publisher link is a compact footer link at the end of the popup', () => {
  const html = fs.readFileSync(path.join(root, 'src/popup/index.html'), 'utf8');
  const footerIndex = html.indexOf('class="popup-footer"');
  const mainActionIndex = html.indexOf('id="mainAction"');

  assert.ok(footerIndex > mainActionIndex);
  assert.match(html, /muhook\.com · Find your next favorite song hook\./);
  assert.match(html, /href="https:\/\/muhook\.com\/"/);
  assert.match(html, /rel="noopener noreferrer external"/);
  assert.equal(html.includes('publisher-promo'), false);
});

test('publisher promotion contains no tracking or remote ad logic', () => {
  const source = [
    'src/popup/publisher-link.js',
    'src/popup/popup.js',
    'src/popup/index.html'
  ].map(file => fs.readFileSync(path.join(root, file), 'utf8')).join('\n');

  assert.equal(/\bfetch\s*\(|XMLHttpRequest|sendBeacon/.test(source), false);
  assert.equal(/[?&](utm_[a-z]+|ref|affiliate|aff_id)=/i.test(source), false);
});
