(function initAIACPromptSettings(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.AIACPromptSettings = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function factory() {
  'use strict';

  const SETTINGS_VERSION = 5;
  const ALLOWED_PROMPT_LANGUAGES = new Set(['auto','zh-CN','zh-TW','en','ja','ko','es','fr','de','pt','it','ru','ar','hi','tr','id','vi','th','nl','pl']);
  const ALLOWED_UI_LANGUAGES = new Set(['auto','en','zh_CN','zh_TW','ja','ko']);
  const DEFAULT_SETTINGS = Object.freeze({
    settingsVersion: SETTINGS_VERSION,
    promptMode: 'auto',
    preferredPromptLanguage: 'auto',
    uiLanguage: 'auto',
    customPrompt: '',
    maxPromptSubmissions: 5,
    delayMs: 3000,
    nativeContinueEnabled: true,
    maxNativeContinuePerCycle: 5,
    startupMode: 'smart'
  });

  function boundedText(value, max = 5000) {
    return String(value || '').trim().slice(0, max);
  }

  function boundedInteger(value, fallback, min, max) {
    const number = Number(value);
    return Number.isFinite(number) ? Math.min(max, Math.max(min, Math.round(number))) : fallback;
  }

  function migrateSettings(raw = {}) {
    const input = raw && typeof raw === 'object' ? raw : {};
    const hasLegacyPrompt = typeof input.prompt === 'string' && input.prompt.trim().length > 0;
    const hasExplicitMode = input.promptMode === 'auto' || input.promptMode === 'custom';
    const promptMode = hasExplicitMode ? input.promptMode : (hasLegacyPrompt ? 'custom' : 'auto');
    const customPrompt = boundedText(
      typeof input.customPrompt === 'string' ? input.customPrompt : (hasLegacyPrompt ? input.prompt : '')
    );
    const requestedLanguage = String(input.preferredPromptLanguage || 'auto');
    const requestedUiLanguage = String(input.uiLanguage || 'auto');
    return {
      ...DEFAULT_SETTINGS,
      settingsVersion: SETTINGS_VERSION,
      promptMode,
      preferredPromptLanguage: ALLOWED_PROMPT_LANGUAGES.has(requestedLanguage) ? requestedLanguage : 'auto',
      uiLanguage: ALLOWED_UI_LANGUAGES.has(requestedUiLanguage) ? requestedUiLanguage : 'auto',
      customPrompt,
      maxPromptSubmissions: boundedInteger(input.maxPromptSubmissions, DEFAULT_SETTINGS.maxPromptSubmissions, 1, 100),
      delayMs: boundedInteger(input.delayMs, DEFAULT_SETTINGS.delayMs, 0, 60000),
      nativeContinueEnabled: input.nativeContinueEnabled !== false,
      maxNativeContinuePerCycle: boundedInteger(input.maxNativeContinuePerCycle, DEFAULT_SETTINGS.maxNativeContinuePerCycle, 0, 20),
      startupMode: input.startupMode === 'wait_current_response' ? 'wait_current_response' : 'smart',
      prompt: undefined
    };
  }

  function toStoredSettings(values = {}) {
    const settings = migrateSettings(values);
    const output = {
      settingsVersion: SETTINGS_VERSION,
      promptMode: settings.promptMode,
      preferredPromptLanguage: settings.preferredPromptLanguage,
      uiLanguage: settings.uiLanguage,
      customPrompt: boundedText(settings.customPrompt),
      maxPromptSubmissions: settings.maxPromptSubmissions,
      delayMs: settings.delayMs,
      nativeContinueEnabled: settings.nativeContinueEnabled !== false,
      maxNativeContinuePerCycle: settings.maxNativeContinuePerCycle,
      startupMode: settings.startupMode === 'wait_current_response' ? 'wait_current_response' : 'smart'
    };
    return output;
  }

  function toRunOptions(settings = {}) {
    const normalized = toStoredSettings(settings);
    return {
      ...normalized,
      customPrompt: boundedText(normalized.customPrompt),
      // Retain the old prompt field only for custom mode so older content runtimes remain safe during extension reloads.
      prompt: normalized.promptMode === 'custom' ? boundedText(normalized.customPrompt) : ''
    };
  }

  return { SETTINGS_VERSION, DEFAULT_SETTINGS, ALLOWED_PROMPT_LANGUAGES, ALLOWED_UI_LANGUAGES, migrateSettings, toStoredSettings, toRunOptions };
});
