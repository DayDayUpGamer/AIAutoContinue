'use strict';
const ext = globalThis.browser || globalThis.chrome;
const PromptLanguage = globalThis.AIACPromptLanguage;
const PromptSettings = globalThis.AIACPromptSettings;
const PlatformRegistry = globalThis.AIACPlatforms;
const UiI18n = globalThis.AIACUiI18n;

const els = {
  site:document.querySelector('#site'), stateText:document.querySelector('#stateText'), statusDot:document.querySelector('#statusDot'),
  settings:document.querySelector('#settings'), editMessage:document.querySelector('#editMessage'),
  supportedView:document.querySelector('#supportedView'), unsupportedView:document.querySelector('#unsupportedView'),
  messageSummary:document.querySelector('#messageSummary'), idleControls:document.querySelector('#idleControls'),
  countChoices:document.querySelector('#countChoices'), progressView:document.querySelector('#progressView'),
  progressCount:document.querySelector('#progressCount'), progressLabel:document.querySelector('#progressLabel'),
  activityText:document.querySelector('#activityText'), nativeCount:document.querySelector('#nativeCount'),
  notice:document.querySelector('#notice'), mainAction:document.querySelector('#mainAction'),
  safetyLine:document.querySelector('#safetyLine'), openSupportedSites:document.querySelector('#openSupportedSites'),
  publisherLink:document.querySelector('#publisher-link')
};

const FALLBACK_MESSAGES = Object.freeze({
  readyState:'Ready', runningState:'Running', pausedState:'Paused', completedState:'Completed', errorState:'Needs attention', unsupportedState:'Unsupported',
  messageAutoSummary:'Auto · follows conversation', messageCustomSummary:'Custom · {prompt}', messageFixedSummary:'Auto · {language}',
  startFollowUps:'Start {count} follow-ups', stopAutomation:'Stop automation', startAgain:'Start again', runAgain:'Run again',
  followUpsCompleted:'follow-ups completed', activityWaiting:'Waiting for the AI to finish…', activityGenerating:'AI is responding…',
  activitySending:'Sending the next message…', activityConfirming:'Confirming the message…', activityPreparing:'Preparing automation…',
  nativeContinued:'Continued a cut-off reply {count} time(s)',
  safetyLine:'Current tab only · pauses automatically when you type',
  unsupportedSiteTitle:'This website is not supported', unsupportedSiteText:'For safety, AI Auto Continue only runs on AI websites supported by this project.',
  viewSupportedSites:'View supported websites', unablePublisher:'Unable to open publisher website',
  customPromptRequired:'Add a custom message in Settings before starting.',
  manual_input:'Paused because you edited the message box.', manual_send:'Paused because you sent a message manually.',
  manual_send_keyboard:'Paused because you sent a message manually.', user_stop:'Paused because you stopped the AI reply.',
  conversation_changed:'Paused because the conversation changed.', send_button_not_ready_after_write:'The page was not ready to send. Try again.',
  native_continue_ambiguous:'The page response was unclear, so automation paused safely.', usage_limit:'Automation stopped because the AI reported a usage limit.',
  unsupported_site:'This website is not supported.', unsupported_page_mode:'This page is not a supported AI chat. Open a normal conversation and try again.', popupError:'Unable to communicate with the current tab.'
});

const ACTIVE_STATES = new Set([
  'ARMED','READY_IDLE','WAITING_GENERATION_START','GENERATING','WAITING_STABLE','DELAYING',
  'CHECKING_NATIVE_CONTINUE','NATIVE_CONTINUING','CONFIRMING_NATIVE_CONTINUE','PRE_SEND_CHECK',
  'RESOLVING_PROMPT','WRITING','WAITING_SEND_READY','SUBMITTING','CONFIRMING'
]);
const SENDING_STATES = new Set(['DELAYING','PRE_SEND_CHECK','RESOLVING_PROMPT','WRITING','WAITING_SEND_READY','SUBMITTING']);
const CONFIRM_STATES = new Set(['CONFIRMING','CONFIRMING_NATIVE_CONTINUE']);

let currentPlatform = null;
let currentSiteHost = '';
let settings = PromptSettings.migrateSettings({});
let lastStatus = { state:'IDLE' };
let refreshTimer = null;

function message(key, fallback = '') {
  try {
    const value = UiI18n && UiI18n.getMessage ? UiI18n.getMessage(key, '') : '';
    return value || FALLBACK_MESSAGES[key] || fallback;
  } catch (_) { return FALLBACK_MESSAGES[key] || fallback; }
}
function format(template, values = {}) {
  return String(template || '').replace(/\{(\w+)\}/g, (_, key) => String(values[key] == null ? '' : values[key]));
}
function localizeDocument() {
  if (UiI18n) UiI18n.applyDocument(document);
  const appName = message('appName', 'AI Auto Continue');
  document.title = appName;
  const settingsLabel = message('openSettings', 'Open settings');
  els.settings.setAttribute('aria-label', settingsLabel);
  els.settings.title = settingsLabel;
}
function clamp(value, fallback, min, max) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, Math.round(number))) : fallback;
}
function send(payload) {
  if (globalThis.browser && browser.runtime && browser.runtime.sendMessage) return browser.runtime.sendMessage(payload);
  return new Promise((resolve, reject) => {
    try {
      ext.runtime.sendMessage(payload, (response) => {
        const error = ext.runtime.lastError;
        if (error) reject(error); else resolve(response);
      });
    } catch (error) { reject(error); }
  });
}
function createExternalTab(url) {
  if (globalThis.browser && browser.tabs && browser.tabs.create) return browser.tabs.create({ url });
  return new Promise((resolve, reject) => {
    try {
      ext.tabs.create({ url }, (tab) => {
        const error = ext.runtime.lastError;
        if (error) reject(error); else resolve(tab);
      });
    } catch (error) { reject(error); }
  });
}
async function openOptions(section = '') {
  const base = ext.runtime && ext.runtime.getURL ? ext.runtime.getURL('options/index.html') : '../options/index.html';
  if (section) {
    await createExternalTab(`${base}#${section}`);
    return;
  }
  try {
    if (ext.runtime && ext.runtime.openOptionsPage) {
      await ext.runtime.openOptionsPage();
      return;
    }
  } catch (_) {}
  await createExternalTab(base);
}
function languageLabel(value) {
  const option = PromptLanguage.SUPPORTED_LANGUAGE_OPTIONS.find((item) => item.value === value);
  return option ? (value === 'auto' ? message('languageAutoOption', option.label) : option.label) : 'Auto';
}
function truncate(value, max = 52) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}
function updateMessageSummary(status = lastStatus) {
  if (status && status.promptLanguage && status.promptSource && status.promptSource !== 'custom') {
    els.messageSummary.textContent = format(message('messageFixedSummary'), { language:languageLabel(status.promptLanguage) });
    return;
  }
  if (settings.promptMode === 'custom') {
    els.messageSummary.textContent = format(message('messageCustomSummary'), { prompt:truncate(settings.customPrompt) || '—' });
  } else if (settings.preferredPromptLanguage && settings.preferredPromptLanguage !== 'auto') {
    els.messageSummary.textContent = format(message('messageFixedSummary'), { language:languageLabel(settings.preferredPromptLanguage) });
  } else {
    els.messageSummary.textContent = message('messageAutoSummary');
  }
}
function selectedCount() { return clamp(settings.maxPromptSubmissions, 5, 1, 100); }
function setSelectedCount(value, save = true) {
  settings = PromptSettings.migrateSettings({ ...settings, maxPromptSubmissions:clamp(value, 5, 1, 100) });
  els.countChoices.querySelectorAll('[data-count]').forEach((button) => {
    const selected = Number(button.dataset.count) === settings.maxPromptSubmissions;
    button.classList.toggle('selected', selected);
    button.setAttribute('aria-pressed', selected ? 'true' : 'false');
  });
  updateMainAction(lastStatus);
  if (save) ext.storage.local.set({ aiac_settings:PromptSettings.toStoredSettings(settings) }).catch(() => {});
}
function statePresentation(state) {
  if (ACTIVE_STATES.has(state)) return { label:message('runningState'), dot:'running' };
  if (state === 'PAUSED') return { label:message('pausedState'), dot:'paused' };
  if (state === 'FINISHED') return { label:message('completedState'), dot:'' };
  if (state === 'ERROR') return { label:message('errorState'), dot:'error' };
  if (state === 'UNSUPPORTED') return { label:message('unsupportedState'), dot:'unsupported' };
  return { label:message('readyState'), dot:'' };
}
function activityForState(state) {
  if (state === 'GENERATING' || state === 'WAITING_STABLE' || state === 'WAITING_GENERATION_START') return message('activityGenerating');
  if (SENDING_STATES.has(state)) return message('activitySending');
  if (CONFIRM_STATES.has(state)) return message('activityConfirming');
  if (state === 'ARMED' || state === 'READY_IDLE' || state === 'CHECKING_NATIVE_CONTINUE' || state === 'NATIVE_CONTINUING') return message('activityPreparing');
  return message('activityWaiting');
}
function displayError(error) {
  const code = typeof error === 'string' ? error : error && error.message;
  if (!code) return '';
  if (FALLBACK_MESSAGES[code] || message(code)) return message(code, code);
  if (/usage|quota|limit|captcha|verify|sign.?in/i.test(code)) return message('usage_limit');
  return code.replace(/_/g, ' ');
}
function updateMainAction(status = lastStatus) {
  const state = status && status.state || 'IDLE';
  const active = ACTIVE_STATES.has(state);
  els.mainAction.classList.toggle('stop', active);
  els.mainAction.disabled = !currentPlatform || state === 'UNSUPPORTED';
  els.mainAction.dataset.action = active ? 'stop' : 'start';
  if (active) els.mainAction.textContent = message('stopAutomation');
  else if (state === 'PAUSED' || state === 'ERROR') els.mainAction.textContent = message('startAgain');
  else if (state === 'FINISHED') els.mainAction.textContent = message('runAgain');
  else els.mainAction.textContent = format(message('startFollowUps'), { count:selectedCount() });
}
function render(result) {
  const status = result && result.status || { state:'IDLE' };
  lastStatus = status;
  const state = status.state || 'IDLE';
  const presentation = statePresentation(state);
  els.stateText.textContent = presentation.label;
  els.statusDot.className = `status-dot${presentation.dot ? ` ${presentation.dot}` : ''}`;

  const active = ACTIVE_STATES.has(state);
  els.idleControls.hidden = active;
  els.progressView.hidden = !active;
  if (active) {
    const sent = status.sentCount || 0;
    const max = status.maxPromptSubmissions || selectedCount();
    els.progressCount.textContent = `${sent} of ${max}`;
    els.activityText.textContent = activityForState(state);
    const native = status.nativeContinueCount || 0;
    els.nativeCount.hidden = native < 1;
    els.nativeCount.textContent = format(message('nativeContinued'), { count:native });
  }

  const error = state === 'UNSUPPORTED' ? '' : displayError(status.lastError || (result && result.error));
  els.notice.hidden = !error;
  els.notice.classList.toggle('error', Boolean(error));
  els.notice.textContent = error;
  updateMessageSummary(status);
  updateMainAction(status);
}
function showSite(platform, host) {
  currentPlatform = platform || null;
  currentSiteHost = host || '';
  const supported = Boolean(currentPlatform);
  els.supportedView.hidden = !supported;
  els.unsupportedView.hidden = supported;
  els.site.textContent = supported ? currentPlatform.name : (currentSiteHost || message('unsupportedState'));
  if (!supported) render({ status:{ state:'UNSUPPORTED', lastError:'unsupported_site' } });
}
async function resolveActiveSite() {
  try {
    const tabs = await ext.tabs.query({ active:true, currentWindow:true });
    const tab = tabs && tabs[0];
    const value = tab && (tab.pendingUrl || tab.url) || '';
    if (!value || value === 'about:blank') { showSite(null, ''); return null; }
    const url = new URL(value);
    const platform = PlatformRegistry && PlatformRegistry.platformForUrl(value);
    showSite(platform, url.hostname);
    return platform;
  } catch (_) { showSite(null, ''); return null; }
}

async function loadSettings() {
  const data = await ext.storage.local.get('aiac_settings');
  const raw = data.aiac_settings || {};
  settings = PromptSettings.migrateSettings(raw);
  const browserLocale = (() => {
    try { return ext.i18n && ext.i18n.getUILanguage ? ext.i18n.getUILanguage() : navigator.language; }
    catch (_) { return navigator.language || 'en'; }
  })();
  if (UiI18n) await UiI18n.init({ preference:settings.uiLanguage, extensionApi:ext, browserLocale });
  localizeDocument();
  if (raw.settingsVersion !== PromptSettings.SETTINGS_VERSION || Object.prototype.hasOwnProperty.call(raw, 'prompt')) {
    await ext.storage.local.set({ aiac_settings:PromptSettings.toStoredSettings(settings) });
  }
  setSelectedCount(settings.maxPromptSubmissions, false);
  updateMessageSummary();
}
async function saveSettings() { await ext.storage.local.set({ aiac_settings:PromptSettings.toStoredSettings(settings) }); }
async function refresh() {
  if (!currentPlatform) { await resolveActiveSite(); if (!currentPlatform) return; }
  try { render(await send({ type:'GET_ACTIVE_STATUS' })); }
  catch (_) {
    els.notice.hidden = false;
    els.notice.classList.add('error');
    els.notice.textContent = message('popupError');
  }
}
function startPolling() {
  clearInterval(refreshTimer);
  refreshTimer = setInterval(() => { if (!document.hidden) refresh(); }, 850);
}

els.countChoices.addEventListener('click', (event) => {
  const button = event.target.closest('[data-count]');
  if (button) setSelectedCount(button.dataset.count);
});
els.settings.addEventListener('click', () => openOptions());
els.editMessage.addEventListener('click', () => openOptions('message'));
els.openSupportedSites.addEventListener('click', () => openOptions('supported-sites'));
els.mainAction.addEventListener('click', async () => {
  els.notice.hidden = true;
  els.mainAction.disabled = true;
  try {
    if (els.mainAction.dataset.action === 'stop') {
      render(await send({ type:'STOP_ACTIVE' }));
    } else {
      if (settings.promptMode === 'custom' && !String(settings.customPrompt || '').trim()) {
        els.notice.hidden = false;
        els.notice.classList.add('error');
        els.notice.textContent = message('customPromptRequired');
        return;
      }
      await saveSettings();
      render(await send({ type:'START_ACTIVE', options:PromptSettings.toRunOptions(settings) }));
    }
  } catch (error) {
    els.notice.hidden = false;
    els.notice.classList.add('error');
    els.notice.textContent = displayError(error) || message('popupError');
  } finally { updateMainAction(lastStatus); }
});
els.publisherLink.addEventListener('click', async (event) => {
  event.preventDefault();
  try {
    const url = globalThis.AIACPublisherLink.getPublisherUrl(els.publisherLink.href);
    await createExternalTab(url);
  } catch (error) {
    els.notice.hidden = false;
    els.notice.classList.add('error');
    els.notice.textContent = `${message('unablePublisher')}: ${error.message}`;
  }
});
window.addEventListener('unload', () => clearInterval(refreshTimer));

(async () => {
  await loadSettings();
  await resolveActiveSite();
  await refresh();
  startPolling();
})();
