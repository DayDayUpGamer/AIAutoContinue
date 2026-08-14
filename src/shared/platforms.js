(function initAIACPlatforms(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.AIACPlatforms = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function factory() {
  'use strict';
  const PLATFORMS = Object.freeze([
    { id:'chatgpt', name:'ChatGPT', hosts:['chatgpt.com'] },
    { id:'claude', name:'Claude', hosts:['claude.ai','claude.com'] },
    { id:'gemini', name:'Gemini', hosts:['gemini.google.com'] },
    { id:'doubao', name:'豆包', hosts:['doubao.com','www.doubao.com'] },
    { id:'qwen', name:'千问 / Qwen', hosts:['qianwen.com','www.qianwen.com','chat.qwen.ai'] },
    { id:'deepseek', name:'DeepSeek', hosts:['chat.deepseek.com'] },
    { id:'kimi', name:'Kimi', hosts:['kimi.com','www.kimi.com'] },
    { id:'yuanbao', name:'腾讯元宝', hosts:['yuanbao.tencent.com'] },
    { id:'chatglm', name:'智谱清言', hosts:['chatglm.cn','www.chatglm.cn'] },
    { id:'copilot', name:'Microsoft Copilot', hosts:['copilot.microsoft.com','copilot.com'] },
    { id:'perplexity', name:'Perplexity', hosts:['perplexity.ai','www.perplexity.ai'] },
    { id:'grok', name:'Grok', hosts:['grok.com','www.grok.com'] }
  ]);
  const BLOCKED_PATH = /\/(?:auth|login|log-in|signin|sign-in|signup|sign-up|settings?|account|billing|pricing|plans?|subscription|privacy|terms|help|support)(?:\/|$)/i;
  function normalizeHostname(value) { return String(value || '').trim().toLowerCase().replace(/\.$/, ''); }
  function matchPlatform(hostname) {
    const value = normalizeHostname(hostname);
    if (!value) return null;
    return PLATFORMS.find((platform) => platform.hosts.includes(value)) || null;
  }
  function parseHttpsUrl(urlValue) {
    try {
      const url = new URL(String(urlValue || ''));
      return url.protocol === 'https:' ? url : null;
    } catch (_) { return null; }
  }
  function platformForUrl(urlValue) {
    const url = parseHttpsUrl(urlValue);
    return url ? matchPlatform(url.hostname) : null;
  }
  function pageModeForUrl(urlValue) {
    const url = parseHttpsUrl(urlValue);
    if (!url) return { ok:false, reason:'unsupported_site', platform:null };
    const platform = matchPlatform(url.hostname);
    if (!platform) return { ok:false, reason:'unsupported_site', platform:null };
    if (BLOCKED_PATH.test(url.pathname || '/')) return { ok:false, reason:'unsupported_page_mode', platform };
    return { ok:true, reason:null, platform };
  }
  function isSupportedHostname(hostname) { return Boolean(matchPlatform(hostname)); }
  function isSupportedUrl(urlValue) { return Boolean(platformForUrl(urlValue)); }
  function isPotentialChatUrl(urlValue) { return pageModeForUrl(urlValue).ok; }
  return { PLATFORMS, BLOCKED_PATH, matchPlatform, platformForUrl, pageModeForUrl, isSupportedHostname, isSupportedUrl, isPotentialChatUrl };
});
