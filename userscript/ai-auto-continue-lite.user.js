// ==UserScript==
// @name         AI Auto Continue Lite
// @namespace    ai-auto-continue
// @version      1.3.2
// @description  Conservatively clicks reliable native Continue generating controls on major web AI sites.
// @match        https://chatgpt.com/*
// @match        https://claude.ai/*
// @match        https://gemini.google.com/*
// @match        https://chat.deepseek.com/*
// @match        https://www.doubao.com/*
// @match        https://chat.qwen.ai/*
// @grant        none
// ==/UserScript==
(() => {
  'use strict';
  const phrases = new Set([
    'continue generating','continue response','continue answer','resume generating',
    '继续生成','继续回答','继续输出'
  ]);
  const assistantSelectors = [
    '[data-message-author-role="assistant"]','[data-role="assistant"]',
    '[data-testid*="assistant" i]','model-response','.assistant-message'
  ];
  const clickHistory = new WeakMap();
  let scanTimer = null;
  let intervalTimer = null;

  function normalize(value) { return String(value || '').replace(/\s+/g, ' ').trim().toLowerCase(); }
  function hash(value) {
    let result = 2166136261; const input = String(value || '');
    for (let i = 0; i < input.length; i += 1) { result ^= input.charCodeAt(i); result = Math.imul(result, 16777619); }
    return (result >>> 0).toString(16);
  }
  function visible(element) {
    if (!element || element.disabled || element.hidden || element.getAttribute('aria-hidden') === 'true' || element.getAttribute('aria-disabled') === 'true') return false;
    const rect = element.getBoundingClientRect(); const style = getComputedStyle(element);
    return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) !== 0;
  }
  function latestAssistant() {
    const nodes = [];
    for (const selector of assistantSelectors) {
      try { nodes.push(...document.querySelectorAll(selector)); } catch (_) {}
    }
    return [...new Set(nodes)].filter(visible).at(-1) || null;
  }
  function responseFingerprint(element) {
    const text = (element && (element.innerText || element.textContent) || '').trim();
    return hash(`${text.length}|${text.slice(-20000)}`);
  }
  function score(button, latest) {
    let value = 40;
    if (latest && (latest.contains(button) || latest.parentElement && latest.parentElement.contains(button))) value += 45;
    const buttonRect = button.getBoundingClientRect();
    if (latest) {
      const responseRect = latest.getBoundingClientRect();
      if (buttonRect.top >= responseRect.top - 100 && Math.abs(buttonRect.top - responseRect.bottom) < 600) value += 30;
    }
    if (buttonRect.top > innerHeight * .35) value += 10;
    return value;
  }
  function scan() {
    scanTimer = null;
    if (document.hidden) return;
    const latest = latestAssistant();
    const fingerprint = responseFingerprint(latest);
    const candidates = [...document.querySelectorAll('button')]
      .filter((button) => visible(button) && phrases.has(normalize(button.getAttribute('aria-label') || button.innerText)))
      .map((button) => [score(button, latest), button])
      .sort((a, b) => b[0] - a[0]);
    if (!candidates[0] || candidates[0][0] < 70) return;
    if (candidates[1] && candidates[0][0] - candidates[1][0] < 12) return;
    const button = candidates[0][1];
    if (clickHistory.get(button) === fingerprint) return;
    clickHistory.set(button, fingerprint);
    button.click();
  }
  function schedule(delay = 150) {
    if (scanTimer) return;
    scanTimer = setTimeout(scan, delay);
  }

  const observer = new MutationObserver(() => schedule());

  observer.observe(document.documentElement, { subtree:true, childList:true, attributes:true, attributeFilter:['hidden','disabled','aria-disabled','aria-label'] });
  intervalTimer = setInterval(() => schedule(0), 1500);
  setTimeout(() => schedule(0), 150);
})();
