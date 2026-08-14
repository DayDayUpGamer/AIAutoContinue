(function initAIACAdapters(root, factory) {
  const core = root.AIACCore || (typeof require === 'function' ? require('./core.js') : null);
  const api = factory(core);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.AIACAdapters = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function factory(core) {
  'use strict';
  const {
    normalizeText, hashText, elementText, stableAccessibleName, accessibleName,
    isVisible, safeQueryAll, NATIVE_CONTINUE_PHRASES, sameSnapshot
  } = core;

  const COMMON = Object.freeze({
    send: [
      'button[aria-label="Send"]','button[aria-label="Send message"]','button[aria-label="Submit"]',
      'button[aria-label="发送"]','button[aria-label="发送消息"]','button[title="Send"]','button[title="发送"]'
    ],
    stop: [
      'button[aria-label="Stop"]','button[aria-label="Stop generating"]','button[aria-label="Stop response"]',
      'button[aria-label="停止"]','button[aria-label="停止生成"]','button[aria-label="停止回答"]'
    ],
    native: [
      'button[data-testid*="continue" i]','button[aria-label="Continue generating"]','button[aria-label="Continue response"]',
      'button[aria-label="继续生成"]','button[aria-label="继续回答"]'
    ]
  });
  const COMMON_CHAT_ROOTS = Object.freeze(['main','[role="main"]']);
  const BLOCKED_PATH = /\/(?:auth|login|log-in|signin|sign-in|signup|sign-up|settings?|account|billing|pricing|plans?|subscription|privacy|terms|help|support)(?:\/|$)/i;

  // Built-in, project-maintained adapters. All stay beta until authenticated live-site certification is completed.
  // Broad document-wide generic selectors are intentionally not shipped. Fallback composer selectors are platform-specific
  // and require a verified chat root before they can be used.
  const PLATFORM_CONFIGS = [
    { id:'chatgpt', name:'ChatGPT', hosts:['chatgpt.com'], supportLevel:'beta',
      chatRoot:['main','[role="main"]'],
      composerStrict:['#prompt-textarea','[data-testid="prompt-textarea"]'],
      composerFallback:['textarea[placeholder*="message" i]','textarea[placeholder*="ask" i]','[contenteditable="true"][role="textbox"][data-testid*="prompt" i]'],
      send:['[data-testid="send-button"]'], stop:['[data-testid="stop-button"]'],
      assistant:['[data-message-author-role="assistant"]'], user:['[data-message-author-role="user"]'], native:['button[data-testid*="continue" i]'] },
    { id:'claude', name:'Claude', hosts:['claude.ai','claude.com'], supportLevel:'beta',
      chatRoot:['main','[role="main"]','[data-testid*="chat" i]'],
      composerStrict:['[contenteditable="true"][data-testid*="chat" i]','[contenteditable="true"][aria-label*="message" i]'],
      composerFallback:['div[contenteditable="true"][role="textbox"]','div[contenteditable="true"][data-lexical-editor="true"]'],
      send:['button[aria-label*="send" i]'], stop:['button[aria-label*="stop" i]'],
      assistant:['[data-testid*="assistant" i]','.font-claude-message'], user:['[data-testid*="user" i]'], native:[] },
    { id:'gemini', name:'Gemini', hosts:['gemini.google.com'], supportLevel:'beta',
      chatRoot:['main','[role="main"]','chat-app'],
      composerStrict:['rich-textarea [contenteditable="true"]','.ql-editor[contenteditable="true"]'],
      composerFallback:['[contenteditable="true"][role="textbox"]'],
      send:['button[aria-label="Send message"]','button[aria-label="发送消息"]'], stop:['button[aria-label="Stop response"]','button[aria-label="停止回答"]'],
      assistant:['model-response','.model-response-text','.response-container-content'], user:['user-query'], native:[] },
    { id:'doubao', name:'豆包', hosts:['doubao.com','www.doubao.com'], supportLevel:'beta',
      chatRoot:['main','[role="main"]','[data-testid*="chat" i]'],
      composerStrict:['textarea[data-testid*="chat" i]','[contenteditable="true"][data-testid*="input" i]'],
      composerFallback:['textarea[placeholder*="输入"]','textarea[placeholder*="message" i]','[contenteditable="true"][role="textbox"]'],
      send:['button[data-testid*="send" i]'], stop:['button[data-testid*="stop" i]'],
      assistant:['[data-testid*="assistant" i]','[data-role="assistant"]'], user:['[data-testid*="user" i]','[data-role="user"]'], native:[] },
    { id:'qwen', name:'千问 / Qwen', hosts:['qianwen.com','www.qianwen.com','chat.qwen.ai'], supportLevel:'beta',
      chatRoot:['main','[role="main"]','[class*="chat" i]'],
      composerStrict:['textarea[data-testid*="input" i]','[contenteditable="true"][data-testid*="input" i]'],
      composerFallback:['textarea[placeholder*="输入"]','textarea[placeholder*="message" i]','textarea[placeholder*="ask" i]','[contenteditable="true"][role="textbox"]'],
      send:['button[data-testid*="send" i]','button[aria-label*="send" i]','button[aria-label*="发送"]'], stop:['button[data-testid*="stop" i]','button[aria-label*="stop" i]'],
      assistant:['[data-role="assistant"]','[data-testid*="assistant" i]'], user:['[data-role="user"]','[data-testid*="user" i]'], native:[] },
    { id:'deepseek', name:'DeepSeek', hosts:['chat.deepseek.com'], supportLevel:'beta',
      chatRoot:['main','[role="main"]','[class*="chat" i]'],
      composerStrict:['textarea[data-testid*="input" i]','textarea[placeholder*="DeepSeek" i]'],
      composerFallback:['textarea[placeholder*="message" i]','textarea[placeholder*="ask" i]','[contenteditable="true"][role="textbox"]'],
      send:['button[aria-label*="send" i]','button[data-testid*="send" i]'], stop:['button[aria-label*="stop" i]','button[data-testid*="stop" i]'],
      assistant:['[data-role="assistant"]','[data-testid*="assistant" i]','[class*="assistant" i] .markdown'], user:['[data-role="user"]','[data-testid*="user" i]'], native:[] },
    { id:'kimi', name:'Kimi', hosts:['kimi.com','www.kimi.com'], supportLevel:'beta',
      chatRoot:['main','[role="main"]','[class*="chat" i]'],
      composerStrict:['[contenteditable="true"][data-lexical-editor="true"]','[contenteditable="true"][data-testid*="input" i]'],
      composerFallback:['textarea[placeholder*="输入"]','textarea[placeholder*="message" i]','[contenteditable="true"][role="textbox"]'],
      send:['button[data-testid*="send" i]','button[aria-label*="send" i]'], stop:['button[data-testid*="stop" i]','button[aria-label*="stop" i]'],
      assistant:['[data-role="assistant"]','[data-testid*="assistant" i]'], user:['[data-role="user"]','[data-testid*="user" i]'], native:[] },
    { id:'yuanbao', name:'腾讯元宝', hosts:['yuanbao.tencent.com'], supportLevel:'beta',
      chatRoot:['main','[role="main"]','[class*="chat" i]','[class*="conversation" i]'],
      composerStrict:['textarea[data-testid*="input" i]','[contenteditable="true"][data-testid*="input" i]'],
      composerFallback:['textarea[placeholder*="输入"]','textarea[placeholder*="提问"]','[contenteditable="true"][role="textbox"]'],
      send:['button[data-testid*="send" i]','button[aria-label*="发送"]'], stop:['button[data-testid*="stop" i]','button[aria-label*="停止"]'],
      assistant:['[data-role="assistant"]','[data-testid*="assistant" i]'], user:['[data-role="user"]','[data-testid*="user" i]'], native:[] },
    { id:'chatglm', name:'智谱清言', hosts:['chatglm.cn','www.chatglm.cn'], supportLevel:'beta',
      chatRoot:['main','[role="main"]','[class*="chat" i]'],
      composerStrict:['textarea[data-testid*="input" i]','[contenteditable="true"][data-testid*="input" i]'],
      composerFallback:['textarea[placeholder*="输入"]','textarea[placeholder*="提问"]','[contenteditable="true"][role="textbox"]'],
      send:['button[data-testid*="send" i]','button[aria-label*="发送"]'], stop:['button[data-testid*="stop" i]','button[aria-label*="停止"]'],
      assistant:['[data-role="assistant"]','[data-testid*="assistant" i]'], user:['[data-role="user"]','[data-testid*="user" i]'], native:[] },
    { id:'copilot', name:'Microsoft Copilot', hosts:['copilot.microsoft.com','copilot.com'], supportLevel:'beta',
      chatRoot:['main','[role="main"]','[data-testid*="chat" i]'],
      composerStrict:['textarea[data-testid*="input" i]','[contenteditable="true"][data-testid*="input" i]'],
      composerFallback:['textarea[placeholder*="message" i]','textarea[placeholder*="ask" i]','[contenteditable="true"][role="textbox"]'],
      send:['button[aria-label="Submit"]','button[aria-label="Send"]'], stop:['button[aria-label="Stop"]','button[aria-label="Stop responding"]'],
      assistant:['[data-content="ai-message"]','[data-testid*="assistant" i]'], user:['[data-content="user-message"]','[data-testid*="user" i]'], native:[] },
    { id:'perplexity', name:'Perplexity', hosts:['perplexity.ai','www.perplexity.ai'], supportLevel:'beta',
      chatRoot:['main','[role="main"]'],
      composerStrict:['textarea[data-testid*="input" i]','textarea[aria-label*="ask" i]'],
      composerFallback:['textarea[placeholder*="ask" i]','textarea[placeholder*="follow" i]','[contenteditable="true"][role="textbox"]'],
      send:['button[aria-label="Submit"]','button[aria-label="Send"]','button[data-testid*="send" i]'], stop:['button[aria-label="Stop"]','button[data-testid*="stop" i]'],
      assistant:['[data-testid*="answer" i]','[data-testid*="assistant" i]'], user:['[data-testid*="query" i]','[data-testid*="user" i]'], native:[] },
    { id:'grok', name:'Grok', hosts:['grok.com','www.grok.com'], supportLevel:'beta',
      chatRoot:['main','[role="main"]','[data-testid*="chat" i]'],
      composerStrict:['textarea[data-testid*="input" i]','[contenteditable="true"][data-testid*="input" i]'],
      composerFallback:['textarea[placeholder*="ask" i]','textarea[placeholder*="message" i]','[contenteditable="true"][role="textbox"]'],
      send:['button[aria-label="Send"]','button[data-testid*="send" i]'], stop:['button[aria-label="Stop"]','button[data-testid*="stop" i]'],
      assistant:['[data-testid*="assistant" i]','[data-role="assistant"]'], user:['[data-testid*="user" i]','[data-role="user"]'], native:[] }
  ];

  function exactNativeText(text) {
    const normalized = normalizeText(text).toLowerCase();
    return NATIVE_CONTINUE_PHRASES.some((phrase) => normalized === phrase.toLowerCase());
  }
  function unique(elements) { return [...new Set(elements.filter(Boolean))]; }
  function matchesAny(element, selectors) {
    if (!element || !element.matches) return false;
    return (selectors || []).some((selector) => { try { return element.matches(selector); } catch (_) { return false; } });
  }
  function scoreComposer(element, win) {
    if (!isVisible(element, win) || element.disabled || element.readOnly) return -1000;
    let score = 0;
    const tag = String(element.tagName || '').toLowerCase();
    const role = element.getAttribute && element.getAttribute('role');
    const placeholder = normalizeText(element.getAttribute && element.getAttribute('placeholder')).toLowerCase();
    if (tag === 'textarea') score += 25;
    if (role === 'textbox') score += 20;
    if (element.isContentEditable) score += 20;
    if (/message|ask|prompt|chat|发送|提问|输入/.test(placeholder)) score += 20;
    if (element.getBoundingClientRect) {
      const r = element.getBoundingClientRect();
      if (r.top > (win.innerHeight || 800) * .4) score += 15;
      if (r.width > 150) score += 10;
      if (r.height > 24) score += 5;
    }
    return score;
  }
  function rectDistance(a, b) {
    if (!a || !b) return Number.POSITIVE_INFINITY;
    const ax = (a.left + a.right) / 2; const ay = (a.top + a.bottom) / 2;
    const bx = (b.left + b.right) / 2; const by = (b.top + b.bottom) / 2;
    return Math.hypot(ax - bx, ay - by);
  }
  function elementContains(container, target) {
    return Boolean(container && target && (container === target || (container.contains && container.contains(target))));
  }

  class DomAdapter {
    constructor(config, env = {}) {
      this.config = config;
      this.id = config.id; this.name = config.name; this.supportLevel = config.supportLevel || 'generic';
      this.document = env.document || document; this.window = env.window || window;
    }
    allSelectors(key) { return unique([...(this.config[key] || []), ...(COMMON[key] || [])]); }
    strictComposerSelectors() { return unique(this.config.composerStrict || []); }
    fallbackComposerSelectors() { return unique(this.config.composerFallback || []); }
    specificSelectors(key) { return unique(this.config[key] || []); }
    getConversationKey() {
      const location = this.window.location;
      const selected = [];
      try {
        const params = new URLSearchParams(location.search || '');
        for (const key of ['conversation','conversationId','chat','chatId','thread','threadId','session','sessionId']) {
          if (params.has(key)) selected.push(`${key}=${params.get(key)}`);
        }
      } catch (_) {}
      return `${location.origin}${location.pathname}${selected.length ? `?${selected.join('&')}` : ''}`;
    }
    collectFrom(rootNode, selectors) {
      const elements = [];
      const scope = rootNode && rootNode.querySelectorAll ? rootNode : this.document;
      for (const selector of unique(selectors || [])) elements.push(...safeQueryAll(scope, selector));
      return unique(elements).filter((element) => isVisible(element, this.window));
    }
    collect(key, extra = [], rootNode = this.document) {
      return this.collectFrom(rootNode, unique([...this.allSelectors(key), ...extra]));
    }
    findChatRoot(composer = null) {
      const candidate = composer || this.findComposer();
      if (!candidate) return null;
      const selectors = unique([...(this.config.chatRoot || []), ...COMMON_CHAT_ROOTS]);
      if (candidate.closest) {
        for (const selector of selectors) {
          try { const root = candidate.closest(selector); if (root && isVisible(root, this.window)) return root; } catch (_) {}
        }
      }
      const roots = this.collectFrom(this.document, selectors).filter((root) => elementContains(root, candidate));
      if (roots.length === 1) return roots[0];
      return null;
    }
    findComposer() {
      const choose = (selectors, strict) => {
        const scored = this.collectFrom(this.document, selectors).map((element) => {
          const chatRoot = this.findChatRootForCandidate(element);
          if (!chatRoot) return [-1000, element];
          let score = scoreComposer(element, this.window) + (strict ? 60 : 0) + 25;
          return [score, element];
        }).sort((a, b) => b[0] - a[0]);
        const threshold = strict ? 95 : 80;
        if (!scored[0] || scored[0][0] < threshold) return null;
        if (scored[1] && scored[0][0] - scored[1][0] < (strict ? 10 : 15)) return null;
        return scored[0][1];
      };
      return choose(this.strictComposerSelectors(), true) || choose(this.fallbackComposerSelectors(), false);
    }
    findChatRootForCandidate(candidate) {
      if (!candidate) return null;
      const selectors = unique([...(this.config.chatRoot || []), ...COMMON_CHAT_ROOTS]);
      if (candidate.closest) {
        for (const selector of selectors) {
          try { const root = candidate.closest(selector); if (root && isVisible(root, this.window)) return root; } catch (_) {}
        }
      }
      const roots = this.collectFrom(this.document, selectors).filter((root) => elementContains(root, candidate));
      return roots.length === 1 ? roots[0] : null;
    }
    getControlScope(composer = null) {
      const target = composer || this.findComposer();
      if (!target) return null;
      return this.findChatRootForCandidate(target) || target.form || target.parentElement || null;
    }
    getPageReadiness() {
      const location = this.window.location || {};
      if (String(location.protocol || 'https:') !== 'https:') return { ok:false, reason:'unsupported_site' };
      if (!matchConfig(location.hostname)) return { ok:false, reason:'unsupported_site' };
      if (BLOCKED_PATH.test(String(location.pathname || '/'))) return { ok:false, reason:'unsupported_page_mode' };
      const composer = this.findComposer();
      if (!composer) return { ok:false, reason:'unsupported_page_mode' };
      if (!this.findChatRootForCandidate(composer)) return { ok:false, reason:'unsupported_page_mode' };
      return { ok:true, reason:null };
    }
    getComposerText() {
      const element = this.findComposer();
      if (!element) return '';
      return normalizeText('value' in element ? element.value : element.innerText || element.textContent);
    }
    async writeComposer(text) {
      const element = this.findComposer();
      if (!element || this.getComposerText()) return false;
      element.focus && element.focus();
      const doc = this.document;
      if ('value' in element) {
        let proto = element; let descriptor = null;
        while ((proto = Object.getPrototypeOf(proto)) && !descriptor) descriptor = Object.getOwnPropertyDescriptor(proto, 'value');
        if (descriptor && descriptor.set) descriptor.set.call(element, text); else element.value = text;
      } else {
        let inserted = false;
        try {
          if (doc.getSelection && doc.execCommand) {
            const selection = doc.getSelection(); const range = doc.createRange();
            range.selectNodeContents(element); selection.removeAllRanges(); selection.addRange(range);
            inserted = Boolean(doc.execCommand('insertText', false, text));
          }
        } catch (_) {}
        if (!inserted) element.textContent = text;
      }
      try { element.dispatchEvent(new this.window.InputEvent('beforeinput', { bubbles:true, composed:true, inputType:'insertText', data:text })); } catch (_) {}
      try { element.dispatchEvent(new this.window.InputEvent('input', { bubbles:true, composed:true, inputType:'insertText', data:text })); }
      catch (_) { element.dispatchEvent(new this.window.Event('input', { bubbles:true, composed:true })); }
      element.dispatchEvent(new this.window.Event('change', { bubbles:true, composed:true }));
      const nextFrame = () => new Promise((resolve) => this.window.requestAnimationFrame
        ? this.window.requestAnimationFrame(() => resolve())
        : (this.window.setTimeout || setTimeout)(resolve, 0));
      await nextFrame(); await nextFrame();
      return normalizeText(this.getComposerText()) === normalizeText(text);
    }
    looksDangerous(element) {
      const name = accessibleName(element).toLowerCase();
      return /stop|cancel|upload|attach|voice|microphone|delete|remove|buy|purchase|login|sign in|停止|取消|上传|附件|语音|删除|购买|登录/.test(name);
    }
    findSend() {
      const composer = this.findComposer();
      if (!composer) return null;
      const specific = this.specificSelectors('send');
      const scope = this.getControlScope(composer);
      if (!scope) return null;
      const candidates = this.collect('send', [], scope);
      const composerRect = composer.getBoundingClientRect ? composer.getBoundingClientRect() : null;
      const scored = candidates.map((button) => {
        if (this.looksDangerous(button) || button.disabled || button.getAttribute && button.getAttribute('aria-disabled') === 'true') return [-1000, button];
        const name = accessibleName(button).toLowerCase(); let score = 0;
        if (matchesAny(button, specific)) score += 60;
        if (/^(send|submit|发送|提交|发送消息)$/.test(name)) score += 55;
        else if (/send|submit|发送|提交/.test(name)) score += 20;
        if (String(button.type || '').toLowerCase() === 'submit') score += 10;
        const rect = button.getBoundingClientRect ? button.getBoundingClientRect() : null;
        const distance = rectDistance(rect, composerRect);
        if (distance < 180) score += 30; else if (distance < 320) score += 15;
        if (composer.form && button.form === composer.form) score += 20;
        return [score, button];
      }).sort((a, b) => b[0] - a[0]);
      if (!scored[0] || scored[0][0] < 60) return null;
      if (scored[1] && scored[0][0] - scored[1][0] < 10) return null;
      return scored[0][1];
    }
    findStop() {
      const specific = this.specificSelectors('stop');
      const composer = this.findComposer();
      const scope = this.getControlScope(composer);
      if (!composer || !scope) return null;
      const composerRect = composer.getBoundingClientRect ? composer.getBoundingClientRect() : null;
      const scored = this.collect('stop', [], scope).map((button) => {
        if (button.disabled || button.getAttribute && button.getAttribute('aria-disabled') === 'true') return [-1000, button];
        const name = accessibleName(button).toLowerCase(); let score = 0;
        if (matchesAny(button, specific)) score += 60;
        if (/^(stop|stop generating|stop response|cancel response|停止|停止生成|停止回答)$/.test(name)) score += 55;
        else if (/stop|cancel response|停止/.test(name)) score += 20;
        const rect = button.getBoundingClientRect ? button.getBoundingClientRect() : null;
        if (rectDistance(rect, composerRect) < 320) score += 20;
        return [score, button];
      }).sort((a, b) => b[0] - a[0]);
      if (!scored[0] || scored[0][0] < 60) return null;
      if (scored[1] && scored[0][0] - scored[1][0] < 10) return null;
      return scored[0][1];
    }
    isGenerating() { return Boolean(this.findStop()); }
    getAssistantNodes() {
      const composer = this.findComposer();
      const scope = this.getControlScope(composer);
      if (!composer || !scope) return [];
      const output = [];
      for (const selector of this.specificSelectors('assistant')) output.push(...safeQueryAll(scope, selector));
      return unique(output).filter((element) => isVisible(element, this.window) && !elementContains(composer, element) && !elementContains(element, composer));
    }
    getUserNodes() {
      const composer = this.findComposer();
      const scope = this.getControlScope(composer);
      if (!composer || !scope) return [];
      const output = [];
      for (const selector of this.specificSelectors('user')) output.push(...safeQueryAll(scope, selector));
      return unique(output).filter((element) => isVisible(element, this.window));
    }
    getResponseSnapshot() {
      const nodes = this.getAssistantNodes(); const element = nodes.at(-1); const text = element ? elementText(element) : '';
      const tail = text.length > 40000 ? text.slice(-40000) : text;
      return {
        anchor: element ? (element.id || (element.getAttribute && element.getAttribute('data-message-id')) || `idx-${nodes.length}`) : 'none',
        textHash: hashText(`${text.length}|${tail}`), blockCount: element ? element.childElementCount : 0,
        text: tail, textLength: text.length
      };
    }
    getLatestAssistantText(maxLength = 4000) {
      const snapshot = this.getResponseSnapshot();
      const text = String(snapshot && snapshot.text || '');
      const bounded = Math.max(200, Math.min(12000, Number(maxLength) || 4000));
      return text.length > bounded ? text.slice(-bounded) : text;
    }
    getSmartStartReadiness() {
      const composer = this.findComposer();
      if (!composer) return { ok:false, reason:'composer_not_found' };
      if (this.isGenerating()) return { ok:false, reason:'generation_running' };
      if (this.getComposerText()) return { ok:false, reason:'composer_not_empty' };
      if (!this.getAssistantNodes().length) return { ok:false, reason:'assistant_context_missing' };
      return { ok:true };
    }
    canSmartStart() { return this.getSmartStartReadiness().ok; }
    getPromptPreparationReadiness() {
      const composer = this.findComposer();
      if (!composer) return { ok:false, reason:'composer_not_found' };
      if (this.isGenerating()) return { ok:false, reason:'generation_running' };
      return { ok:true };
    }
    canSubmitPrompt() { return this.getPromptPreparationReadiness().ok; }
    canSubmitWrittenPrompt() {
      const composer = this.findComposer();
      if (!composer) return false;
      if (!this.getComposerText() || this.isGenerating()) return false;
      return Boolean(this.findSend());
    }
    async waitForSendReady(timeoutMs = 2500, expectedText = '') {
      const deadline = Date.now() + Math.max(250, Math.min(15000, Number(timeoutMs) || 2500));
      const expected = normalizeText(expectedText);
      while (Date.now() <= deadline) {
        const composer = this.findComposer();
        if (!composer) return { ok:false, reason:'composer_not_found_after_write' };
        if (this.isGenerating()) return { ok:false, reason:'generation_started_before_submit' };
        const current = normalizeText(this.getComposerText());
        if (!current) return { ok:false, reason:'composer_text_lost_after_write' };
        if (expected && current !== expected) return { ok:false, reason:'composer_changed_before_submit' };
        if (this.findSend()) return { ok:true };
        await new Promise((resolve) => {
          const timer = this.window.setTimeout || setTimeout;
          timer(resolve, 50);
        });
      }
      return { ok:false, reason:'send_button_not_ready_after_write' };
    }
    findNativeContinue() {
      const composer = this.findComposer();
      const scope = this.getControlScope(composer);
      if (!composer || !scope) return { status:'unavailable', element:null, fingerprint:null };
      const candidates = this.collect('native', [], scope);
      const exact = unique(candidates).filter((element) => !element.disabled && !(element.getAttribute && element.getAttribute('aria-disabled') === 'true') && exactNativeText(accessibleName(element)));
      if (!exact.length) return { status:'unavailable', element:null, fingerprint:null };
      const latest = this.getAssistantNodes().at(-1);
      const latestRect = latest && latest.getBoundingClientRect ? latest.getBoundingClientRect() : null;
      const specific = this.specificSelectors('native');
      const ranked = exact.map((element) => {
        let score = 40; // Exact native phrase is a strong signal; context must still raise it above threshold.
        if (matchesAny(element, specific)) score += 50;
        if (latest && (elementContains(latest, element) || elementContains(latest.parentElement, element))) score += 45;
        const rect = element.getBoundingClientRect ? element.getBoundingClientRect() : null;
        if (rect && latestRect && rect.top >= latestRect.top - 100 && Math.abs(rect.top - latestRect.bottom) < 600) score += 30;
        if (rect && rect.top > (this.window.innerHeight || 800) * .35) score += 10;
        return [score, element];
      }).sort((a, b) => b[0] - a[0]);
      if (!ranked[0] || ranked[0][0] < 70) return { status:'unavailable', element:null, fingerprint:null };
      if (ranked[1] && ranked[0][0] - ranked[1][0] < 12) return { status:'ambiguous', element:null, fingerprint:null };
      const element = ranked[0][1]; const snapshot = this.getResponseSnapshot();
      return {
        status:'available', element,
        fingerprint:hashText(`${accessibleName(element)}|${element.tagName}|${ranked[0][0]}|${snapshot.textHash}|${snapshot.blockCount}`)
      };
    }
    captureNativeBaseline(native) { return { snapshot:this.getResponseSnapshot(), fingerprint:native.fingerprint }; }
    async clickNativeContinue(native) {
      if (!native || !native.element || native.element.disabled) return false;
      native.element.click(); await Promise.resolve(); return true;
    }
    verifyNativeContinue(baseline) {
      const blocked = this.getBlockingState(); if (blocked) return { status:'blocked', reason:blocked };
      if (this.isGenerating()) return { status:'confirmed' };
      if (!sameSnapshot(baseline.snapshot, this.getResponseSnapshot())) return { status:'confirmed' };
      return { status:'pending' };
    }
    captureSubmissionBaseline(prompt) {
      const users = this.getUserNodes();
      return {
        userCount:users.length,
        lastUserHash:hashText(users.at(-1) ? elementText(users.at(-1)) : ''),
        composerText:this.getComposerText(), response:this.getResponseSnapshot(),
        promptHash:hashText(normalizeText(prompt))
      };
    }
    async submit() {
      const button = this.findSend();
      if (!button || button.disabled || button.getAttribute && button.getAttribute('aria-disabled') === 'true') return false;
      button.click(); await Promise.resolve(); return true;
    }
    verifySubmission(baseline, prompt) {
      const blocked = this.getBlockingState(); if (blocked) return { status:'blocked', reason:blocked };
      const users = this.getUserNodes(); const currentComposer = normalizeText(this.getComposerText());
      const latest = users.at(-1); const newUser = users.length > baseline.userCount;
      const exactUser = newUser && hashText(normalizeText(elementText(latest))) === hashText(normalizeText(prompt));
      if (exactUser) return { status:'confirmed' };
      if (newUser) return { status:'ambiguous' };
      const responseChanged = !sameSnapshot(baseline.response, this.getResponseSnapshot());
      if (!currentComposer && (this.isGenerating() || responseChanged)) return { status:'confirmed' };
      if (currentComposer === normalizeText(prompt) && !this.isGenerating() && !responseChanged) return { status:'definitely_not_sent' };
      if (!currentComposer) return { status:'pending' };
      return { status:'ambiguous' };
    }
    canSafelyRetry(baseline, prompt) {
      const users = this.getUserNodes();
      const sameUserState = users.length === baseline.userCount
        && hashText(users.at(-1) ? elementText(users.at(-1)) : '') === baseline.lastUserHash;
      return !this.isGenerating()
        && normalizeText(this.getComposerText()) === normalizeText(prompt)
        && sameUserState && sameSnapshot(baseline.response, this.getResponseSnapshot());
    }
    isTargetControl(eventTarget, control) { return elementContains(control, eventTarget); }
    isManualStopTarget(target) {
      const control = this.findStop();
      if (this.isTargetControl(target, control)) return true;
      const button = target && target.closest ? target.closest('button,[role="button"]') : null;
      return Boolean(button && /^(stop|stop generating|stop response|cancel response|停止|停止生成|停止回答)$/i.test(accessibleName(button)));
    }
    isManualSendTarget(target) { return this.isTargetControl(target, this.findSend()); }
    isManualNativeTarget(target) {
      const native = this.findNativeContinue();
      return native.status === 'available' && this.isTargetControl(target, native.element);
    }
    getBlockingState() {
      const terms = [
        'too many requests','rate limit','usage limit','message limit','daily limit','quota exceeded',
        'you have reached your limit','you’ve reached your limit','try again later','verify you are human',
        'captcha','sign in to continue','log in to continue','upgrade to continue','subscribe to continue',
        '服务繁忙','请求过多','请稍后再试','人机验证','登录后继续','已达到上限','达到使用上限',
        '消息次数已用完','额度不足','配额已用完','升级后继续','订阅后继续'
      ];
      const selectors = [
        '[role=alert]','[aria-live=assertive]','[role=dialog]','[class*=toast i]','[class*=error i]',
        '[data-testid*=limit i]','[data-testid*=quota i]','[data-testid*=captcha i]',
        '[data-testid*=verification i]','[class*=rate-limit i]','[class*=usage-limit i]',
        '[class*=quota i]','[class*=captcha i]','[class*=verification i]'
      ];
      const nodes = []; for (const selector of selectors) nodes.push(...safeQueryAll(this.document, selector));
      for (const node of unique(nodes)) {
        if (!isVisible(node, this.window)) continue;
        const text = elementText(node).toLowerCase(); const term = terms.find((item) => text.includes(item));
        if (term) return term;
      }
      return null;
    }
  }

  function matchConfig(hostname) {
    const value = String(hostname || '').trim().toLowerCase().replace(/\.$/, '');
    return PLATFORM_CONFIGS.find((config) => config.hosts.includes(value)) || null;
  }

  function createAdapter(env = {}) {
    const win = env.window || window;
    const config = matchConfig(win.location.hostname);
    return config ? new DomAdapter(config, env) : null;
  }
  return {
    COMMON, COMMON_CHAT_ROOTS, BLOCKED_PATH, PLATFORM_CONFIGS, DomAdapter, createAdapter, matchConfig,
    exactNativeText, scoreComposer
  };
});
