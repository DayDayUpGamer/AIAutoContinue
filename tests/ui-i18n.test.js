const test = require('node:test');
const assert = require('node:assert/strict');
const i18n = require('../src/shared/ui-i18n.js');

test('browser locales resolve to bundled UI locales', () => {
  assert.equal(i18n.resolveLocale('auto', 'zh-CN'), 'zh_CN');
  assert.equal(i18n.resolveLocale('auto', 'zh-HK'), 'zh_TW');
  assert.equal(i18n.resolveLocale('auto', 'en-US'), 'en');
  assert.equal(i18n.resolveLocale('en', 'zh-CN'), 'en');
});

test('forced English loads the English dictionary even under a Chinese browser UI', async () => {
  const dictionaries = {
    'chrome-extension://test/_locales/en/messages.json': {
      appName:{message:'AI Auto Continue'}, readyState:{message:'Ready'}
    }
  };
  const extensionApi = {
    i18n:{getUILanguage(){return 'zh-CN'},getMessage(){return ''}},
    runtime:{getURL(path){return `chrome-extension://test/${path}`}}
  };
  await i18n.init({
    preference:'en', browserLocale:'zh-CN', extensionApi,
    fetchImpl:async (url) => ({ok:Boolean(dictionaries[url]),async json(){return dictionaries[url]||{}}})
  });
  assert.equal(i18n.getLocale(), 'en');
  assert.equal(i18n.getMessage('readyState'), 'Ready');
});

test('invalid UI language preferences safely return to browser default', () => {
  assert.equal(i18n.normalizePreference('invalid'), 'auto');
});
