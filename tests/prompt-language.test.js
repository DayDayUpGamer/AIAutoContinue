const test = require('node:test');
const assert = require('node:assert/strict');
const language = require('../src/content/prompt-language.js');

test('language normalization handles Chinese regions and common locales', () => {
  assert.equal(language.normalizeLanguage('zh-CN'), 'zh-CN');
  assert.equal(language.normalizeLanguage('zh_Hant'), 'zh-TW');
  assert.equal(language.normalizeLanguage('zh', 'zh-HK'), 'zh-TW');
  assert.equal(language.normalizeLanguage('en-US'), 'en');
  assert.equal(language.normalizeLanguage('fr-CA'), 'fr');
  assert.equal(language.normalizeLanguage('xx-ZZ'), 'en');
});

test('prompt map provides localized continuation prompts', () => {
  assert.equal(language.getPromptForLanguage('zh-CN'), '继续下一步');
  assert.equal(language.getPromptForLanguage('zh-TW'), '繼續下一步');
  assert.equal(language.getPromptForLanguage('en-US'), 'Continue with the next step.');
  assert.equal(language.getPromptForLanguage('ja-JP'), '次のステップに進んでください。');
});

test('custom prompt has highest priority', async () => {
  const resolved = await language.resolvePrompt({
    promptMode:'custom', customPrompt:'检查后继续', preferredPromptLanguage:'ja',
    latestAssistantText:'English answer', uiLanguage:'en-US',
    detectLanguage:async () => ({ isReliable:true, languages:[{ language:'en', percentage:100 }] })
  });
  assert.deepEqual(resolved, { prompt:'检查后继续', language:null, source:'custom' });
});

test('explicit preferred language bypasses conversation detection', async () => {
  let calls = 0;
  const resolved = await language.resolvePrompt({
    promptMode:'auto', preferredPromptLanguage:'fr', latestAssistantText:'中文回答', uiLanguage:'zh-CN',
    detectLanguage:async () => { calls += 1; return null; }
  });
  assert.equal(calls, 0);
  assert.equal(resolved.prompt, 'Continuez avec l’étape suivante.');
  assert.equal(resolved.source, 'preferred_language');
  assert.equal(resolved.language, 'fr');
});

test('reliable conversation detection overrides browser UI language', async () => {
  const resolved = await language.resolvePrompt({
    promptMode:'auto', preferredPromptLanguage:'auto',
    latestAssistantText:'The implementation is complete and the next step can now begin.', uiLanguage:'zh-CN',
    detectLanguage:async () => ({ isReliable:true, languages:[{ language:'en', percentage:96 }] })
  });
  assert.equal(resolved.prompt, 'Continue with the next step.');
  assert.equal(resolved.source, 'conversation');
  assert.equal(resolved.language, 'en');
});

test('script inference recognizes CJK and does not depend on CLD success', async () => {
  const japanese = await language.resolvePrompt({
    promptMode:'auto', preferredPromptLanguage:'auto', latestAssistantText:'実装が完了しました。次の段階に進めます。', uiLanguage:'en-US', detectLanguage:async () => null
  });
  assert.equal(japanese.language, 'ja');
  const simplified = await language.resolvePrompt({
    promptMode:'auto', preferredPromptLanguage:'auto', latestAssistantText:'当前阶段已经完成，可以继续执行后续事项。', uiLanguage:'zh-TW', detectLanguage:async () => null
  });
  assert.equal(simplified.language, 'zh-CN');
  assert.equal(simplified.prompt, '继续下一步');
  const traditional = await language.resolvePrompt({
    promptMode:'auto', preferredPromptLanguage:'auto', latestAssistantText:'目前階段已經完成，可以繼續執行後續事項。', uiLanguage:'en-US', detectLanguage:async () => null
  });
  assert.equal(traditional.language, 'zh-TW');
  assert.equal(traditional.prompt, '繼續下一步');
});

test('unreliable detection falls back to supported browser language then English', async () => {
  const browser = await language.resolvePrompt({
    promptMode:'auto', preferredPromptLanguage:'auto', latestAssistantText:'x', uiLanguage:'de-DE',
    detectLanguage:async () => ({ isReliable:false, languages:[{ language:'es', percentage:30 }] })
  });
  assert.equal(browser.language, 'de');
  assert.equal(browser.source, 'browser_ui');
  const fallback = await language.resolvePrompt({
    promptMode:'auto', preferredPromptLanguage:'auto', latestAssistantText:'', uiLanguage:'xx-ZZ'
  });
  assert.equal(fallback.language, 'en');
  assert.equal(fallback.source, 'fallback');
});

test('detection preparation removes code and URLs and bounds the sample', () => {
  const text = 'Intro ```javascript\nconst language = "en";\n``` 中文结论 https://example.com/path ' + '尾'.repeat(5000);
  const prepared = language.prepareDetectionText(text, 4000);
  assert.equal(prepared.includes('javascript'), false);
  assert.equal(prepared.includes('https://'), false);
  assert.ok(prepared.length <= 4000);
});

test('reliable Japanese detection overrides ambiguous Han-only Chinese fallback', async () => {
  const resolved = await language.resolvePrompt({
    promptMode:'auto', preferredPromptLanguage:'auto',
    latestAssistantText:'実装完了。次段階開始。', uiLanguage:'zh-CN',
    detectLanguage:async () => ({ isReliable:true, languages:[{ language:'ja', percentage:92 }] })
  });
  assert.equal(resolved.language, 'ja');
  assert.equal(resolved.prompt, '次のステップに進んでください。');
});
