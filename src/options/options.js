'use strict';
const ext = globalThis.browser || globalThis.chrome;
const PromptLanguage = globalThis.AIACPromptLanguage;
const PromptSettings = globalThis.AIACPromptSettings;
const Platforms = globalThis.AIACPlatforms;
const UiI18n = globalThis.AIACUiI18n;

const els = {
  saveStatus:document.querySelector('#saveStatus'), uiLanguage:document.querySelector('#uiLanguage'),
  promptLanguage:document.querySelector('#promptLanguage'), autoSettings:document.querySelector('#autoSettings'),
  customSettings:document.querySelector('#customSettings'), customPrompt:document.querySelector('#customPrompt'),
  promptLength:document.querySelector('#promptLength'), promptPreview:document.querySelector('#promptPreview'),
  maxPromptSubmissions:document.querySelector('#maxPromptSubmissions'), delayMs:document.querySelector('#delayMs'),
  nativeContinueEnabled:document.querySelector('#nativeContinueEnabled'), nativeMaxRow:document.querySelector('#nativeMaxRow'),
  maxNativeContinuePerCycle:document.querySelector('#maxNativeContinuePerCycle'), platformList:document.querySelector('#platformList'),
  version:document.querySelector('#version')
};
let settings = PromptSettings.migrateSettings({});
let saveTimer = null;

const FALLBACK = Object.freeze({
  languageAutoOption:'Auto — follow conversation', savedAutomatically:'Saved automatically', saving:'Saving…', saveFailed:'Could not save settings',
  promptPreviewLabel:'Message preview', betaLabel:'Beta', appName:'AI Auto Continue', settingsTitle:'Settings'
});
function message(key, fallback='') {
  try { return (UiI18n && UiI18n.getMessage(key, '')) || FALLBACK[key] || fallback; }
  catch (_) { return FALLBACK[key] || fallback; }
}
function localizeDocument() {
  if (UiI18n) UiI18n.applyDocument(document);
  document.title=`${message('appName','AI Auto Continue')} · ${message('settingsTitle','Settings')}`;
}
function browserUILanguage(){try{return ext.i18n&&ext.i18n.getUILanguage?ext.i18n.getUILanguage():navigator.language}catch(_){return navigator.language||'en'}}
function populateUiLanguages(){
  els.uiLanguage.textContent='';
  for(const option of UiI18n.getLanguageOptions()){
    const node=document.createElement('option');node.value=option.value;
    node.textContent=message(option.messageKey,option.fallback);
    els.uiLanguage.append(node);
  }
}
function populateLanguages(){
  els.promptLanguage.textContent='';
  for(const option of PromptLanguage.SUPPORTED_LANGUAGE_OPTIONS){
    const node=document.createElement('option');node.value=option.value;
    node.textContent=option.value==='auto'?message('languageAutoOption',option.label):option.label;
    els.promptLanguage.append(node);
  }
}
function populatePlatforms(){
  els.platformList.textContent='';
  for(const platform of Platforms.PLATFORMS){
    const item=document.createElement('div');item.className='platform-item';
    const title=document.createElement('strong');title.textContent=platform.name;
    const level=document.createElement('span');level.textContent=message('betaLabel','Beta');
    item.append(title,level);els.platformList.append(item);
  }
}
function selectedMode(){return document.querySelector('input[name="promptMode"]:checked')?.value||'auto'}
function readSettings(){return PromptSettings.toStoredSettings({
  ...settings,uiLanguage:els.uiLanguage.value,promptMode:selectedMode(),preferredPromptLanguage:els.promptLanguage.value,
  customPrompt:els.customPrompt.value,maxPromptSubmissions:els.maxPromptSubmissions.value,
  delayMs:els.delayMs.value,nativeContinueEnabled:els.nativeContinueEnabled.checked,
  maxNativeContinuePerCycle:els.maxNativeContinuePerCycle.value,startupMode:'smart'
})}
function updateConditional(){
  const custom=selectedMode()==='custom';els.autoSettings.hidden=custom;els.customSettings.hidden=!custom;
  els.nativeMaxRow.hidden=!els.nativeContinueEnabled.checked;
  els.promptLength.textContent=`${els.customPrompt.value.length} / 5000`;
  const selected=els.promptLanguage.value||'auto';
  const language=selected==='auto'?browserUILanguage():selected;
  const preview=PromptLanguage.getPromptForLanguage(language,browserUILanguage());
  els.promptPreview.textContent=`${message('promptPreviewLabel','Message preview')}: ${preview}`;
}
async function saveNow(){
  clearTimeout(saveTimer);settings=PromptSettings.migrateSettings(readSettings());
  els.saveStatus.textContent=message('saving');els.saveStatus.className='save-status saving';
  try{await ext.storage.local.set({aiac_settings:PromptSettings.toStoredSettings(settings)});els.saveStatus.textContent=message('savedAutomatically');els.saveStatus.className='save-status'}
  catch(_){els.saveStatus.textContent=message('saveFailed');els.saveStatus.className='save-status error'}
}
function queueSave(){updateConditional();clearTimeout(saveTimer);saveTimer=setTimeout(saveNow,220)}
async function applyStoredSettings(raw){
  settings=PromptSettings.migrateSettings(raw||{});
  const mode=document.querySelector(`input[name="promptMode"][value="${settings.promptMode}"]`);if(mode)mode.checked=true;
  els.uiLanguage.value=settings.uiLanguage;
  els.promptLanguage.value=PromptLanguage.SUPPORTED_LANGUAGE_OPTIONS.some(x=>x.value===settings.preferredPromptLanguage)?settings.preferredPromptLanguage:'auto';
  els.customPrompt.value=settings.customPrompt;els.maxPromptSubmissions.value=String(settings.maxPromptSubmissions);
  els.delayMs.value=String(settings.delayMs);els.nativeContinueEnabled.checked=settings.nativeContinueEnabled!==false;
  els.maxNativeContinuePerCycle.value=String(settings.maxNativeContinuePerCycle);updateConditional();
  if(raw.settingsVersion!==PromptSettings.SETTINGS_VERSION||Object.prototype.hasOwnProperty.call(raw,'prompt'))await ext.storage.local.set({aiac_settings:PromptSettings.toStoredSettings(settings)});
}

els.uiLanguage.addEventListener('change',async()=>{
  clearTimeout(saveTimer);
  settings=PromptSettings.migrateSettings(readSettings());
  els.saveStatus.textContent=message('saving');els.saveStatus.className='save-status saving';
  try{
    await ext.storage.local.set({aiac_settings:PromptSettings.toStoredSettings(settings)});
    location.reload();
  }catch(_){els.saveStatus.textContent=message('saveFailed');els.saveStatus.className='save-status error'}
});
document.querySelectorAll('input[name="promptMode"]').forEach(node=>node.addEventListener('change',queueSave));
for(const node of [els.promptLanguage,els.customPrompt,els.maxPromptSubmissions,els.delayMs,els.nativeContinueEnabled,els.maxNativeContinuePerCycle]){
  node.addEventListener(node===els.customPrompt?'input':'change',queueSave);
}
window.addEventListener('beforeunload',()=>{if(saveTimer){clearTimeout(saveTimer);saveNow()}});

(async()=>{
  const data=await ext.storage.local.get('aiac_settings');
  const raw=data.aiac_settings||{};
  settings=PromptSettings.migrateSettings(raw);
  await UiI18n.init({preference:settings.uiLanguage,extensionApi:ext,browserLocale:browserUILanguage()});
  localizeDocument();populateUiLanguages();populateLanguages();populatePlatforms();
  els.version.textContent=`v${ext.runtime.getManifest().version}`;
  await applyStoredSettings(raw);
  if(location.hash){document.querySelector(location.hash)?.scrollIntoView({block:'start'})}
})();
