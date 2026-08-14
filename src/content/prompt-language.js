(function initAIACPromptLanguage(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.AIACPromptLanguage = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function factory() {
  'use strict';

  const AUTO_CONTINUE_PROMPTS = Object.freeze({
    'zh-CN': '继续下一步',
    'zh-TW': '繼續下一步',
    en: 'Continue with the next step.',
    ja: '次のステップに進んでください。',
    ko: '다음 단계로 계속 진행해 주세요.',
    es: 'Continúa con el siguiente paso.',
    fr: 'Continuez avec l’étape suivante.',
    de: 'Fahre mit dem nächsten Schritt fort.',
    pt: 'Continue para a próxima etapa.',
    it: 'Continua con il passaggio successivo.',
    ru: 'Перейдите к следующему шагу.',
    ar: 'تابع إلى الخطوة التالية.',
    hi: 'अगले चरण पर आगे बढ़ें।',
    tr: 'Bir sonraki adıma devam et.',
    id: 'Lanjutkan ke langkah berikutnya.',
    vi: 'Hãy tiếp tục với bước tiếp theo.',
    th: 'ดำเนินการต่อไปยังขั้นตอนถัดไป',
    nl: 'Ga verder met de volgende stap.',
    pl: 'Przejdź do następnego kroku.'
  });

  const SUPPORTED_LANGUAGE_OPTIONS = Object.freeze([
    { value: 'auto', label: 'Auto — follow conversation' },
    { value: 'zh-CN', label: '简体中文' },
    { value: 'zh-TW', label: '繁體中文' },
    { value: 'en', label: 'English' },
    { value: 'ja', label: '日本語' },
    { value: 'ko', label: '한국어' },
    { value: 'es', label: 'Español' },
    { value: 'fr', label: 'Français' },
    { value: 'de', label: 'Deutsch' },
    { value: 'pt', label: 'Português' },
    { value: 'it', label: 'Italiano' },
    { value: 'ru', label: 'Русский' },
    { value: 'ar', label: 'العربية' },
    { value: 'hi', label: 'हिन्दी' },
    { value: 'tr', label: 'Türkçe' },
    { value: 'id', label: 'Bahasa Indonesia' },
    { value: 'vi', label: 'Tiếng Việt' },
    { value: 'th', label: 'ไทย' },
    { value: 'nl', label: 'Nederlands' },
    { value: 'pl', label: 'Polski' }
  ]);

  const SUPPORTED_KEYS = new Set(Object.keys(AUTO_CONTINUE_PROMPTS));
  const TRADITIONAL_LOCALES = new Set(['zh-tw', 'zh-hk', 'zh-mo', 'zh-hant']);
  const SIMPLIFIED_LOCALES = new Set(['zh-cn', 'zh-sg', 'zh-hans']);

  function cleanLocale(locale) {
    return String(locale || '').trim().replace(/_/g, '-').toLowerCase();
  }

  function isTraditionalChineseLocale(locale) {
    const clean = cleanLocale(locale);
    return TRADITIONAL_LOCALES.has(clean) || clean.startsWith('zh-hant-')
      || clean.startsWith('zh-tw-') || clean.startsWith('zh-hk-') || clean.startsWith('zh-mo-');
  }

  function matchSupportedLanguage(locale, contextLocale = '') {
    const clean = cleanLocale(locale);
    if (!clean || clean === 'auto' || clean === 'und') return null;
    if (clean === 'zh' || clean.startsWith('zh-')) {
      if (isTraditionalChineseLocale(clean) || (clean === 'zh' && isTraditionalChineseLocale(contextLocale))) return 'zh-TW';
      if (SIMPLIFIED_LOCALES.has(clean) || clean.startsWith('zh-hans-') || clean.startsWith('zh-cn-') || clean.startsWith('zh-sg-')) return 'zh-CN';
      return isTraditionalChineseLocale(contextLocale) ? 'zh-TW' : 'zh-CN';
    }
    const base = clean.split('-')[0];
    return SUPPORTED_KEYS.has(base) ? base : null;
  }

  function normalizeLanguage(locale, contextLocale = '') {
    return matchSupportedLanguage(locale, contextLocale) || 'en';
  }

  function getPromptForLanguage(locale, contextLocale = '') {
    const language = normalizeLanguage(locale, contextLocale);
    return AUTO_CONTINUE_PROMPTS[language] || AUTO_CONTINUE_PROMPTS.en;
  }

  function prepareDetectionText(text, maxLength = 4000) {
    const cleaned = String(text || '')
      .replace(/```[\s\S]*?```/g, ' ')
      .replace(/`[^`\n]{1,300}`/g, ' ')
      .replace(/https?:\/\/\S+/gi, ' ')
      .replace(/\b[a-f0-9]{24,}\b/gi, ' ')
      .replace(/[\u0000-\u001f]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return cleaned.length > maxLength ? cleaned.slice(-maxLength) : cleaned;
  }

  function countMatches(text, expression) {
    const matches = String(text || '').match(expression);
    return matches ? matches.length : 0;
  }

  function detectChineseVariant(text, uiLanguage = '') {
    const value = String(text || '');
    const traditional = countMatches(value, /[體臺灣與為這後續進階實現開發檢查問題應處理繼驟專業輸點擊設定頁瀏覽器語對話]/g);
    const simplified = countMatches(value, /[体台湾与为这后续进阶实现开发检查问题应处理继骤专业输点击设置页浏览器语对话]/g);
    if (traditional >= 2 && traditional >= simplified + 1) return 'zh-TW';
    if (simplified >= 2 && simplified >= traditional + 1) return 'zh-CN';
    return isTraditionalChineseLocale(uiLanguage) ? 'zh-TW' : 'zh-CN';
  }

  function inferScriptLanguage(text, uiLanguage = '') {
    const value = String(text || '');
    if (!value) return null;
    const visibleLetters = countMatches(value, /[\p{L}\p{N}]/gu);
    const threshold = Math.max(3, Math.ceil(visibleLetters * 0.16));
    const kana = countMatches(value, /[\u3040-\u30ff]/g);
    const hangul = countMatches(value, /[\uac00-\ud7af\u1100-\u11ff]/g);
    const arabic = countMatches(value, /[\u0600-\u06ff]/g);
    const devanagari = countMatches(value, /[\u0900-\u097f]/g);
    const thai = countMatches(value, /[\u0e00-\u0e7f]/g);
    const han = countMatches(value, /[\u3400-\u9fff]/g);
    if (kana >= 2 && kana + han >= threshold) return 'ja';
    if (hangul >= threshold) return 'ko';
    if (arabic >= threshold) return 'ar';
    if (devanagari >= threshold) return 'hi';
    if (thai >= threshold) return 'th';
    if (han >= Math.max(4, threshold)) return detectChineseVariant(value, uiLanguage);
    return null;
  }

  function chooseDetectedLanguage(result, text = '', uiLanguage = '') {
    const scriptLanguage = inferScriptLanguage(text, uiLanguage);
    // Kana, Hangul, Arabic, Devanagari and Thai are decisive script signals.
    if (scriptLanguage && !scriptLanguage.startsWith('zh-')) return scriptLanguage;
    const languages = result && Array.isArray(result.languages) ? result.languages : [];
    const ranked = languages
      .map((item) => ({
        language: matchSupportedLanguage(item && item.language, uiLanguage),
        percentage: Number(item && item.percentage) || 0
      }))
      .filter((item) => item.language)
      .sort((a, b) => b.percentage - a.percentage);
    const top = ranked[0];
    const reliable = Boolean(result && result.isReliable);
    const topAccepted = Boolean(top && ((reliable && top.percentage >= 45) || top.percentage >= 70));
    // Han-only Japanese/Korean text is ambiguous. A reliable browser detector may override
    // the Chinese script fallback, while English/Latin guesses must not override clear Han text.
    if (scriptLanguage && scriptLanguage.startsWith('zh-')) {
      if (topAccepted && (top.language === 'ja' || top.language === 'ko')) return top.language;
      return scriptLanguage;
    }
    return topAccepted ? top.language : null;
  }

  function normalizeMode(mode) {
    return mode === 'custom' ? 'custom' : 'auto';
  }

  async function resolvePrompt(input = {}) {
    const mode = normalizeMode(input.promptMode);
    const customPrompt = String(input.customPrompt || '').trim().slice(0, 5000);
    const uiLanguage = String(input.uiLanguage || 'en');

    if (mode === 'custom' && customPrompt) {
      return { prompt: customPrompt, language: null, source: 'custom' };
    }

    const preferred = String(input.preferredPromptLanguage || 'auto');
    if (preferred !== 'auto') {
      const language = normalizeLanguage(preferred, uiLanguage);
      return { prompt: getPromptForLanguage(language, uiLanguage), language, source: 'preferred_language' };
    }

    const detectionText = prepareDetectionText(input.latestAssistantText);
    if (detectionText) {
      let detectionResult = null;
      if (typeof input.detectLanguage === 'function') {
        try { detectionResult = await input.detectLanguage(detectionText); } catch (_) { detectionResult = null; }
      }
      const conversationLanguage = chooseDetectedLanguage(detectionResult, detectionText, uiLanguage);
      if (conversationLanguage) {
        return {
          prompt: getPromptForLanguage(conversationLanguage, uiLanguage),
          language: conversationLanguage,
          source: 'conversation'
        };
      }
    }

    const browserLanguage = matchSupportedLanguage(uiLanguage, uiLanguage);
    if (browserLanguage) {
      return {
        prompt: getPromptForLanguage(browserLanguage, uiLanguage),
        language: browserLanguage,
        source: 'browser_ui'
      };
    }

    return { prompt: AUTO_CONTINUE_PROMPTS.en, language: 'en', source: 'fallback' };
  }

  return {
    AUTO_CONTINUE_PROMPTS,
    SUPPORTED_LANGUAGE_OPTIONS,
    cleanLocale,
    isTraditionalChineseLocale,
    matchSupportedLanguage,
    normalizeLanguage,
    getPromptForLanguage,
    prepareDetectionText,
    detectChineseVariant,
    inferScriptLanguage,
    chooseDetectedLanguage,
    resolvePrompt
  };
});
