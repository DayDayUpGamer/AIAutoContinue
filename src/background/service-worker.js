'use strict';
try {
  const runtimeApi = globalThis.browser || globalThis.chrome;
  importScripts(runtimeApi && runtimeApi.runtime && runtimeApi.runtime.getURL
    ? runtimeApi.runtime.getURL('shared/platforms.js')
    : '../shared/platforms.js');
} catch (_) { try { importScripts('../shared/platforms.js'); } catch (_) {} }
const ext = globalThis.browser || globalThis.chrome;
const platforms = globalThis.AIACPlatforms;
const memoryIndex = new Map();
const CONTENT_FILES = ['shared/platforms.js','content/prompt-language.js','content/core.js','content/adapters.js','content/entry.js'];
const LEGACY_BINDING_KEYS = new Set(['siteBindings','bindingSchemaVersion','customLocators']);
let cleanupPromise = null;

function call(api, context, ...args) {
  try {
    const result = api.apply(context, args);
    if (result && typeof result.then === 'function') return result;
    return Promise.resolve(result);
  } catch (error) { return Promise.reject(error); }
}
async function activeTab() {
  const tabs = await call(ext.tabs.query, ext.tabs, { active:true, currentWindow:true });
  return tabs && tabs[0];
}
function tabUrl(tab) { return tab && (tab.pendingUrl || tab.url) || ''; }
function platformForTab(tab) { return platforms && tab && platforms.platformForUrl(tabUrl(tab)); }
function pageModeForTab(tab) { return platforms && tab && platforms.pageModeForUrl ? platforms.pageModeForUrl(tabUrl(tab)) : { ok:Boolean(platformForTab(tab)), reason:platformForTab(tab)?null:'unsupported_site', platform:platformForTab(tab) }; }
function unsupportedStatus(reason = 'unsupported_site', platform = null) { return { state:'UNSUPPORTED', adapterId:platform && platform.id || null, supportLevel:platform ? 'beta' : 'unsupported', lastError:reason }; }
async function purgeLegacyBindings() {
  if (!ext.storage || !ext.storage.local) return;
  const stored = await call(ext.storage.local.get, ext.storage.local, null).catch(() => ({})) || {};
  const keys = Object.keys(stored).filter((key) => key.startsWith('aiac_binding:') || LEGACY_BINDING_KEYS.has(key));
  if (keys.length) await call(ext.storage.local.remove, ext.storage.local, keys).catch(() => {});
}
function ensureLegacyCleanup() {
  if (!cleanupPromise) cleanupPromise = purgeLegacyBindings().catch(() => {});
  return cleanupPromise;
}
async function send(tabId, message) { return call(ext.tabs.sendMessage, ext.tabs, tabId, message); }
async function ping(tabId) { try { return await send(tabId, { type:'PING_RUNTIME' }); } catch (_) { return null; } }
async function inject(tabId) { await call(ext.scripting.executeScript, ext.scripting, { target:{ tabId }, files:CONTENT_FILES }); }
async function ensureRuntime(tabId) {
  let response = await ping(tabId);
  if (response) return response;
  await inject(tabId);
  response = await ping(tabId);
  if (!response) throw new Error('content_runtime_unavailable');
  return response;
}
async function setBadge(tabId, text) {
  if (!ext.action || !Number.isInteger(tabId)) return;
  try {
    await call(ext.action.setBadgeText, ext.action, { tabId, text:text || '' });
    if (text) await call(ext.action.setBadgeBackgroundColor, ext.action, { tabId, color:text === '!' ? '#b42318' : '#2563eb' });
  } catch (_) {}
}
async function saveIndex(tabId, status) {
  memoryIndex.set(tabId, status);
  try { if (ext.storage.session) await call(ext.storage.session.set, ext.storage.session, { [`tab:${tabId}`]:status }); } catch (_) {}
}
async function clearIndex(tabId, options = {}) {
  memoryIndex.delete(tabId);
  try { if (ext.storage.session) await call(ext.storage.session.remove, ext.storage.session, `tab:${tabId}`); } catch (_) {}
  if (!options.skipBadge) await setBadge(tabId, '');
}
async function handle(message, sender) {
  await ensureLegacyCleanup();
  if (!message || typeof message.type !== 'string') return { ok:false, error:'invalid_message' };
  if (message.type === 'START_ACTIVE') {
    const tab = await activeTab(); if (!tab || !tab.id) throw new Error('no_active_tab');
    const mode = pageModeForTab(tab);
    if (!mode.ok) return { ok:false, error:mode.reason, status:unsupportedStatus(mode.reason, mode.platform) };
    await ensureRuntime(tab.id); return send(tab.id, { type:'START_RUN', options:message.options || {} });
  }
  if (message.type === 'STOP_ACTIVE') {
    const tab = await activeTab(); if (!tab || !tab.id) return { ok:false, error:'no_active_tab' };
    const mode = pageModeForTab(tab);
    if (!mode.ok) { await clearIndex(tab.id); return { ok:true, status:unsupportedStatus(mode.reason, mode.platform) }; }
    const result = await send(tab.id, { type:'STOP_RUN', reason:message.reason || 'popup_stop' }).catch(() => null);
    await clearIndex(tab.id); return result || { ok:true };
  }
  if (message.type === 'GET_ACTIVE_STATUS') {
    const tab = await activeTab(); if (!tab || !tab.id) return { ok:false, error:'no_active_tab' };
    const mode = pageModeForTab(tab);
    const platform = mode.platform;
    if (!mode.ok) return { ok:true, status:unsupportedStatus(mode.reason, platform) };
    const result = await ping(tab.id);
    return result || { ok:true, status:memoryIndex.get(tab.id) || { state:'IDLE', adapterId:platform.id, supportLevel:'beta' } };
  }
  if (message.type === 'RUNTIME_STATUS' && sender.tab && Number.isInteger(sender.tab.id)) {
    await saveIndex(sender.tab.id, message.status);
    const state = message.status && message.status.state;
    await setBadge(sender.tab.id, state === 'PAUSED' || state === 'ERROR' ? '!' : state === 'FINISHED' ? '' : 'ON');
    return { ok:true };
  }
  return { ok:false, error:'unknown_message' };
}

ext.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handle(message, sender).then(sendResponse).catch((error) => sendResponse({ ok:false, error:error.message }));
  return true;
});
ext.tabs.onUpdated.addListener((tabId, change) => {
  if (change.status === 'loading') clearIndex(tabId).catch(() => {});
});
ext.tabs.onRemoved.addListener((tabId) => { clearIndex(tabId, { skipBadge:true }).catch(() => {}); });
if (ext.runtime.onInstalled) ext.runtime.onInstalled.addListener(() => { cleanupPromise = null; ensureLegacyCleanup(); });
if (ext.runtime.onStartup) ext.runtime.onStartup.addListener(() => { cleanupPromise = null; ensureLegacyCleanup(); });
ensureLegacyCleanup();
if (ext.commands) ext.commands.onCommand.addListener(async (command) => {
  if (command !== 'stop-auto-continue') return;
  const tab = await activeTab().catch(() => null);
  if (tab && tab.id) {
    await send(tab.id, { type:'STOP_RUN', reason:'keyboard_shortcut' }).catch(() => {});
    await clearIndex(tab.id);
  }
});
