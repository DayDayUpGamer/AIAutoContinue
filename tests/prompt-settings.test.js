const test = require('node:test');
const assert = require('node:assert/strict');
const settings = require('../src/popup/prompt-settings.js');

test('new installations default to automatic conversation-language prompts', () => {
  const value = settings.migrateSettings({});
  assert.equal(value.promptMode, 'auto');
  assert.equal(value.preferredPromptLanguage, 'auto');
  assert.equal(value.uiLanguage, 'auto');
  assert.equal(value.customPrompt, '');
  assert.equal(value.settingsVersion, settings.SETTINGS_VERSION);
});

test('legacy prompt settings migrate to custom mode without changing user behavior', () => {
  const value = settings.migrateSettings({ prompt:'继续下一步', maxPromptSubmissions:10 });
  assert.equal(value.promptMode, 'custom');
  assert.equal(value.customPrompt, '继续下一步');
  assert.equal(value.maxPromptSubmissions, 10);
});

test('explicit automatic mode remains automatic even when a custom prompt is retained', () => {
  const value = settings.migrateSettings({ promptMode:'auto', preferredPromptLanguage:'ja', customPrompt:'Later' });
  assert.equal(value.promptMode, 'auto');
  assert.equal(value.preferredPromptLanguage, 'ja');
  assert.equal(value.customPrompt, 'Later');
});

test('run options expose the legacy prompt field only for custom mode', () => {
  const custom = settings.toRunOptions({ promptMode:'custom', customPrompt:'Do the next item.' });
  assert.equal(custom.prompt, 'Do the next item.');
  const auto = settings.toRunOptions({ promptMode:'auto', preferredPromptLanguage:'auto', customPrompt:'Stored but inactive' });
  assert.equal(auto.prompt, '');
  assert.equal(auto.customPrompt, 'Stored but inactive');
});

test('stored settings do not retain the obsolete prompt property', () => {
  const stored = settings.toStoredSettings({ prompt:'legacy', promptMode:'custom', customPrompt:'modern' });
  assert.equal(Object.prototype.hasOwnProperty.call(stored, 'prompt'), false);
  assert.equal(stored.customPrompt, 'modern');
});

test('corrupted persisted settings are normalized and bounded', () => {
  const value = settings.migrateSettings({
    promptMode:'unexpected', preferredPromptLanguage:'xx-INVALID', uiLanguage:'xx-INVALID',
    maxPromptSubmissions:9999, delayMs:-500,
    nativeContinueEnabled:0, maxNativeContinuePerCycle:999,
    startupMode:'unexpected'
  });
  assert.equal(value.promptMode, 'auto');
  assert.equal(value.preferredPromptLanguage, 'auto');
  assert.equal(value.uiLanguage, 'auto');
  assert.equal(value.maxPromptSubmissions, 100);
  assert.equal(value.delayMs, 0);
  assert.equal(value.nativeContinueEnabled, true);
  assert.equal(value.maxNativeContinuePerCycle, 20);
  assert.equal(value.startupMode, 'smart');
});


test('a valid interface language is stored independently from prompt language', () => {
  const value = settings.toStoredSettings({ uiLanguage:'en', preferredPromptLanguage:'zh-CN' });
  assert.equal(value.uiLanguage, 'en');
  assert.equal(value.preferredPromptLanguage, 'zh-CN');
});
