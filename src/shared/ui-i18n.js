(function initAIACUiI18n(root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.AIACUiI18n = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function factory(root) {
  'use strict';

  const SUPPORTED_UI_LANGUAGES = Object.freeze([
    { value:'auto', messageKey:'uiLanguageAuto', fallback:'Browser default' },
    { value:'en', messageKey:'uiLanguageEnglish', fallback:'English' },
    { value:'zh_CN', messageKey:'uiLanguageSimplifiedChinese', fallback:'简体中文' },
    { value:'zh_TW', messageKey:'uiLanguageTraditionalChinese', fallback:'繁體中文' },
    { value:'ja', messageKey:'uiLanguageJapanese', fallback:'日本語' },
    { value:'ko', messageKey:'uiLanguageKorean', fallback:'한국어' }
  ]);
  const ALLOWED = new Set(SUPPORTED_UI_LANGUAGES.map((item) => item.value));
  let activeLocale = 'en';
  let messages = Object.create(null);
  let extensionApi = null;

  function normalizePreference(value) {
    const requested = String(value || 'auto');
    return ALLOWED.has(requested) ? requested : 'auto';
  }

  function normalizeBrowserLocale(value) {
    const locale = String(value || 'en').replace('-', '_').toLowerCase();
    if (locale.startsWith('zh_tw') || locale.startsWith('zh_hk') || locale.startsWith('zh_mo') || locale.startsWith('zh_hant')) return 'zh_TW';
    if (locale.startsWith('zh')) return 'zh_CN';
    if (locale.startsWith('ja')) return 'ja';
    if (locale.startsWith('ko')) return 'ko';
    return 'en';
  }

  function browserLocale(api = extensionApi) {
    try {
      if (api && api.i18n && typeof api.i18n.getUILanguage === 'function') return api.i18n.getUILanguage() || root.navigator?.language || 'en';
    } catch (_) {}
    return root.navigator?.language || 'en';
  }

  function resolveLocale(preference, browserLanguage = browserLocale()) {
    const normalized = normalizePreference(preference);
    return normalized === 'auto' ? normalizeBrowserLocale(browserLanguage) : normalized;
  }

  async function loadMessages(locale, fetchImpl = root.fetch) {
    if (!extensionApi || !extensionApi.runtime || typeof extensionApi.runtime.getURL !== 'function' || typeof fetchImpl !== 'function') return Object.create(null);
    try {
      const response = await fetchImpl(extensionApi.runtime.getURL(`_locales/${locale}/messages.json`), { cache:'no-store' });
      if (!response || !response.ok) return Object.create(null);
      const raw = await response.json();
      const output = Object.create(null);
      for (const [key, value] of Object.entries(raw || {})) {
        if (value && typeof value.message === 'string') output[key] = value.message;
      }
      return output;
    } catch (_) {
      return Object.create(null);
    }
  }

  async function init(options = {}) {
    extensionApi = options.extensionApi || root.browser || root.chrome || extensionApi;
    activeLocale = resolveLocale(options.preference, options.browserLocale || browserLocale(extensionApi));
    messages = await loadMessages(activeLocale, options.fetchImpl);
    if (root.document && root.document.documentElement) root.document.documentElement.lang = activeLocale.replace('_', '-');
    return activeLocale;
  }

  function getMessage(key, fallback = '') {
    if (Object.prototype.hasOwnProperty.call(messages, key) && messages[key]) return messages[key];
    try {
      const localized = extensionApi && extensionApi.i18n && typeof extensionApi.i18n.getMessage === 'function'
        ? extensionApi.i18n.getMessage(key)
        : '';
      return localized || fallback;
    } catch (_) {
      return fallback;
    }
  }

  function applyDocument(scope = root.document) {
    if (!scope || typeof scope.querySelectorAll !== 'function') return;
    scope.querySelectorAll('[data-i18n]').forEach((node) => {
      const value = getMessage(node.getAttribute('data-i18n'), node.textContent || '');
      if (value) node.textContent = value;
    });
    scope.querySelectorAll('[data-i18n-placeholder]').forEach((node) => {
      const value = getMessage(node.getAttribute('data-i18n-placeholder'), node.getAttribute('placeholder') || '');
      if (value) node.setAttribute('placeholder', value);
    });
    scope.querySelectorAll('[data-i18n-aria-label]').forEach((node) => {
      const value = getMessage(node.getAttribute('data-i18n-aria-label'), node.getAttribute('aria-label') || '');
      if (value) node.setAttribute('aria-label', value);
    });
  }

  function getLocale() { return activeLocale; }
  function getLanguageOptions() { return SUPPORTED_UI_LANGUAGES.slice(); }

  return {
    SUPPORTED_UI_LANGUAGES,
    normalizePreference,
    normalizeBrowserLocale,
    resolveLocale,
    init,
    getMessage,
    applyDocument,
    getLocale,
    getLanguageOptions
  };
});
