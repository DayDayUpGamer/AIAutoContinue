(function bootstrapAIAC(root) {
  'use strict';
  const ext = root.browser || root.chrome;
  if (!ext || !ext.runtime || !root.AIACCore || !root.AIACAdapters || !root.AIACPromptLanguage) return;
  if (root.__AI_AUTO_CONTINUE_RUNTIME__) return;

  const { AutoContinueEngine, STATES } = root.AIACCore;
  const { createAdapter, matchConfig } = root.AIACAdapters;
  const PromptLanguage = root.AIACPromptLanguage;


  class Overlay {
    constructor(onStop) { this.onStop = onStop; this.host = null; this.statusEl = null; this.countsEl = null; }
    ensure() {
      if (this.host) return;
      this.host = document.createElement('div'); this.host.id = 'aiac-overlay-host';
      const shadow = this.host.attachShadow({ mode:'closed' });
      shadow.innerHTML = `<style>:host{all:initial}.box{position:fixed;right:18px;bottom:18px;z-index:2147483647;background:#16181d;color:#fff;border:1px solid #3c414c;border-radius:12px;padding:10px 12px;box-shadow:0 8px 30px #0006;font:13px/1.4 system-ui;min-width:210px}.row{display:flex;gap:8px;align-items:center;justify-content:space-between}.dot{width:8px;height:8px;border-radius:99px;background:#4ade80;display:inline-block}.status{opacity:.86;margin-top:5px;overflow-wrap:anywhere}.counts{font-variant-numeric:tabular-nums;margin-top:5px}button{background:#b42318;color:white;border:0;border-radius:7px;padding:5px 9px;cursor:pointer}</style><div class="box"><div class="row"><span><span class="dot"></span> AI Auto Continue</span><button id="stop" type="button">Stop</button></div><div class="status" id="status">Starting</div><div class="counts" id="counts"></div></div>`;
      this.statusEl = shadow.getElementById('status'); this.countsEl = shadow.getElementById('counts');
      shadow.getElementById('stop').addEventListener('click', () => this.onStop());
      document.documentElement.appendChild(this.host);
    }
    update(status) {
      this.ensure();
      this.statusEl.textContent = status.lastError ? `${status.state}: ${status.lastError}` : status.state;
      this.countsEl.textContent = `Prompt ${status.sentCount}/${status.maxPromptSubmissions} · Native this response ${status.nativeCountInCycle}/${status.maxNativeContinuePerCycle}`;
    }
    remove() { if (this.host) { this.host.remove(); this.host = null; this.statusEl = null; this.countsEl = null; } }
  }

  class Runtime {
    constructor() {
      this.adapter = null; this.engine = null; this.timer = null; this.observer = null;
      this.overlay = new Overlay(() => this.stop('overlay_stop'));
      this.lastStatus = { state:STATES.IDLE };
      this.runtimeEpoch = 0; this.tickScheduled = null; this.tickRunning = false; this.tickPending = false;
      this.internalWriteToken = null; this.internalActionToken = null; this.promptResolutionInput = null;
      this.boundInput = (event) => this.onUserInput(event);
      this.boundClick = (event) => this.onClick(event);
      this.boundKeyDown = (event) => this.onKeyDown(event);
      this.boundSubmit = (event) => this.onSubmit(event);
      this.boundPageHide = () => this.stop('navigation');
    }

    async ensureAdapter() {
      this.adapter = createAdapter({ document, window });
      if (!this.adapter) throw new Error('unsupported_site');
      const page = this.adapter.getPageReadiness ? this.adapter.getPageReadiness() : { ok:true };
      if (!page.ok) throw new Error(page.reason || 'unsupported_page_mode');
      return this.adapter;
    }
    hooks(epoch) {
      return {
        onState: (status) => {
          if (epoch !== this.runtimeEpoch) return;
          this.publish(status);
          if (![STATES.WRITING, STATES.WAITING_SEND_READY, STATES.SUBMITTING, STATES.CONFIRMING].includes(status.state)) {
            this.expireInternalWriteToken();
          }
        },
        onInternalWriteStart: (context) => {
          if (epoch === this.runtimeEpoch) this.beginInternalWrite(context);
        },
        onInternalWriteEnd: (context) => {
          if (epoch === this.runtimeEpoch) this.finishInternalWrite(context);
        },
        onInternalActionStart: (context) => {
          if (epoch === this.runtimeEpoch) this.beginInternalAction(context);
        },
        onInternalActionEnd: (context) => {
          if (epoch === this.runtimeEpoch) this.finishInternalAction(context);
        },
        resolvePrompt: () => this.resolveDeferredPrompt(epoch),
        onStop: (status) => {
          if (epoch !== this.runtimeEpoch) return;
          this.publish(status);
          this.clearInternalWriteToken(); this.clearInternalActionToken(); this.promptResolutionInput = null;
          this.cleanup(status.state === STATES.FINISHED);
        }
      };
    }
    beginInternalWrite(context) {
      const composer = this.adapter && this.adapter.findComposer();
      this.internalWriteToken = {
        runtimeEpoch: this.runtimeEpoch,
        cycleId: context && context.cycleId,
        composer,
        expectedText: String(context && context.expectedText || '').replace(/\s+/g, ' ').trim(),
        active: true,
        expiresAt: Date.now() + 4000
      };
    }
    finishInternalWrite(context) {
      const token = this.internalWriteToken;
      if (!token || token.runtimeEpoch !== this.runtimeEpoch) return;
      if (context && token.cycleId && context.cycleId && token.cycleId !== context.cycleId) return;
      token.active = false;
      token.expiresAt = Date.now() + 2500;
    }
    expireInternalWriteToken() {
      const token = this.internalWriteToken;
      if (token && !token.active) token.expiresAt = Math.min(token.expiresAt, Date.now() + 250);
    }
    clearInternalWriteToken() { this.internalWriteToken = null; }
    beginInternalAction(context) {
      this.internalActionToken = {
        runtimeEpoch: this.runtimeEpoch,
        cycleId: context && context.cycleId,
        kind: context && context.kind,
        active: true,
        expiresAt: Date.now() + 1500
      };
    }
    finishInternalAction(context) {
      const token = this.internalActionToken;
      if (!token || token.runtimeEpoch !== this.runtimeEpoch) return;
      if (context && token.cycleId && context.cycleId && token.cycleId !== context.cycleId) return;
      token.active = false;
      token.expiresAt = Date.now() + 750;
    }
    clearInternalActionToken() { this.internalActionToken = null; }
    isInternalSubmitEvent(form, composer) {
      const token = this.internalActionToken;
      if (!token || token.runtimeEpoch !== this.runtimeEpoch || Date.now() > token.expiresAt) {
        this.clearInternalActionToken();
        return false;
      }
      if (!form || !composer || !form.contains || !form.contains(composer)) return false;
      const protectedStates = [STATES.NATIVE_CONTINUING, STATES.CONFIRMING_NATIVE_CONTINUE, STATES.SUBMITTING, STATES.CONFIRMING];
      return Boolean(this.engine && protectedStates.includes(this.engine.state)
        && (token.kind === 'prompt_submit' || token.kind === 'native_continue'));
    }
    isInternalWriteEvent(event, composer) {
      const token = this.internalWriteToken;
      if (!token || token.runtimeEpoch !== this.runtimeEpoch || Date.now() > token.expiresAt) {
        this.clearInternalWriteToken();
        return false;
      }
      const target = event.target;
      const tokenComposer = token.composer || composer;
      const inside = Boolean(tokenComposer && (target === tokenComposer
        || (tokenComposer.contains && tokenComposer.contains(target))));
      if (!inside) return false;
      if (token.active || (this.engine && this.engine.state === STATES.WRITING)) return true;
      const current = String(this.adapter && this.adapter.getComposerText() || '').replace(/\s+/g, ' ').trim();
      const protectedStates = [STATES.WAITING_SEND_READY, STATES.SUBMITTING, STATES.CONFIRMING];
      return current === token.expectedText && this.engine && protectedStates.includes(this.engine.state);
    }
    getBrowserUILanguage() {
      try {
        if (ext.i18n && typeof ext.i18n.getUILanguage === 'function') {
          return ext.i18n.getUILanguage() || root.navigator?.language || 'en';
        }
      } catch (_) {}
      return root.navigator?.language || 'en';
    }
    async detectLanguage(text, timeoutMs = 1500) {
      if (!ext.i18n || typeof ext.i18n.detectLanguage !== 'function' || !String(text || '').trim()) return null;
      const task = root.browser && root.browser.i18n
        ? Promise.resolve().then(() => root.browser.i18n.detectLanguage(text)).catch(() => null)
        : new Promise((resolve) => {
          let settled = false;
          const finish = (result) => { if (!settled) { settled = true; resolve(result || null); } };
          try {
            const maybePromise = ext.i18n.detectLanguage(text, finish);
            if (maybePromise && typeof maybePromise.then === 'function') maybePromise.then(finish).catch(() => finish(null));
          } catch (_) { finish(null); }
        });
      const duration = Math.max(250, Math.min(5000, Number(timeoutMs) || 1500));
      return new Promise((resolve) => {
        const setTimer = root.setTimeout || setTimeout;
        const clearTimer = root.clearTimeout || clearTimeout;
        let settled = false;
        const timer = setTimer(() => {
          if (!settled) { settled = true; resolve(null); }
        }, duration);
        task.then((result) => {
          if (settled) return;
          settled = true; clearTimer(timer); resolve(result || null);
        }).catch(() => {
          if (settled) return;
          settled = true; clearTimer(timer); resolve(null);
        });
      });
    }
    async resolveDeferredPrompt(epoch) {
      if (epoch !== this.runtimeEpoch || !this.engine || !this.promptResolutionInput) throw new Error('prompt_resolution_cancelled');
      const conversationKey = this.adapter && this.adapter.getConversationKey();
      const uiLanguage = this.getBrowserUILanguage();
      const latestAssistantText = this.adapter && typeof this.adapter.getLatestAssistantText === 'function'
        ? this.adapter.getLatestAssistantText(4000)
        : String(this.adapter && this.adapter.getResponseSnapshot && this.adapter.getResponseSnapshot().text || '');
      const resolved = await PromptLanguage.resolvePrompt({
        ...this.promptResolutionInput,
        latestAssistantText,
        uiLanguage,
        detectLanguage: (value) => this.detectLanguage(value)
      });
      if (epoch !== this.runtimeEpoch || !this.engine) throw new Error('prompt_resolution_cancelled');
      const currentConversation = this.adapter && this.adapter.getConversationKey();
      if (conversationKey && currentConversation && conversationKey !== currentConversation) throw new Error('conversation_changed');
      this.promptResolutionInput = null;
      return resolved;
    }
    async resolveStartOptions(options = {}) {
      const input = options && typeof options === 'object' ? { ...options } : {};
      const legacyPrompt = !input.promptMode && typeof input.prompt === 'string' && input.prompt.trim();
      const promptMode = legacyPrompt ? 'custom' : (input.promptMode === 'custom' ? 'custom' : 'auto');
      const customPrompt = legacyPrompt ? input.prompt : input.customPrompt;
      const preferredPromptLanguage = String(input.preferredPromptLanguage || 'auto');
      if (promptMode === 'custom' && !String(customPrompt || '').trim()) throw new Error('custom_prompt_required');
      const base = {
        ...input,
        promptMode,
        preferredPromptLanguage,
        customPrompt: String(customPrompt || '').trim().slice(0, 5000)
      };
      // Custom and explicitly selected languages are deterministic and can be resolved immediately.
      if (promptMode === 'custom' || preferredPromptLanguage !== 'auto') {
        const resolved = await PromptLanguage.resolvePrompt({
          promptMode,
          customPrompt,
          preferredPromptLanguage,
          uiLanguage: this.getBrowserUILanguage()
        });
        return {
          ...base,
          prompt: resolved.prompt,
          promptResolutionPending: false,
          resolvedPromptLanguage: resolved.language,
          resolvedPromptSource: legacyPrompt ? 'legacy_prompt' : resolved.source,
          deferredPromptInput: null
        };
      }
      // Conversation language must be sampled after the current response and all native continuations finish.
      return {
        ...base,
        prompt: 'Continue with the next step.',
        promptResolutionPending: true,
        resolvedPromptLanguage: null,
        resolvedPromptSource: null,
        deferredPromptInput: { promptMode:'auto', customPrompt:'', preferredPromptLanguage:'auto' }
      };
    }
    async start(options) {
      const epoch = ++this.runtimeEpoch;
      this.promptResolutionInput = null;
      const previous = this.engine;
      if (previous) previous.stop('restart');
      this.cleanup(true); this.engine = null;
      await this.ensureAdapter();
      if (epoch !== this.runtimeEpoch) return this.status();
      const resolvedOptions = await this.resolveStartOptions(options || {});
      if (epoch !== this.runtimeEpoch) return this.status();
      this.promptResolutionInput = resolvedOptions.deferredPromptInput || null;
      delete resolvedOptions.deferredPromptInput;
      this.engine = new AutoContinueEngine(this.adapter, resolvedOptions, this.hooks(epoch));
      this.installObservers();
      await this.engine.start(resolvedOptions);
      this.scheduleTick(0);
      return this.engine.status();
    }
    installObservers() {
      this.observer = new MutationObserver(() => this.scheduleTick(100));
      this.observer.observe(document.documentElement, {
        subtree:true, childList:true, characterData:true, attributes:true,
        attributeFilter:['disabled','aria-disabled','hidden','aria-label']
      });
      this.timer = setInterval(() => this.scheduleTick(0), 1000);
      document.addEventListener('beforeinput', this.boundInput, true);
      document.addEventListener('input', this.boundInput, true);
      document.addEventListener('paste', this.boundInput, true);
      document.addEventListener('drop', this.boundInput, true);
      document.addEventListener('click', this.boundClick, true);
      document.addEventListener('keydown', this.boundKeyDown, true);
      document.addEventListener('submit', this.boundSubmit, true);
      addEventListener('pagehide', this.boundPageHide, { once:true });
    }
    scheduleTick(delay = 100) {
      if (!this.engine) return;
      this.tickPending = true;
      if (this.tickScheduled || this.tickRunning) return;
      this.tickScheduled = setTimeout(() => this.flushTick(), Math.max(0, delay));
    }
    async flushTick() {
      if (this.tickScheduled) { clearTimeout(this.tickScheduled); this.tickScheduled = null; }
      if (!this.engine || this.tickRunning) return;
      this.tickRunning = true;
      try {
        do {
          this.tickPending = false;
          const current = this.engine;
          await current.tick();
          if (current !== this.engine) break;
        } while (this.tickPending && this.engine);
      } catch (_) {
        // The engine converts runtime failures to ERROR; do not create an unhandled rejection.
      } finally {
        this.tickRunning = false;
        if (this.tickPending && this.engine) this.scheduleTick(0);
      }
    }
    onUserInput(event) {
      if (!event.isTrusted || !this.engine || !this.adapter) return;
      const composer = this.adapter.findComposer();
      if (!composer || !(event.target === composer || (composer.contains && composer.contains(event.target)))) return;
      if (this.isInternalWriteEvent(event, composer)) return;
      this.clearInternalWriteToken(); this.clearInternalActionToken();
      this.engine.pause('manual_input');
    }
    onClick(event) {
      if (!event.isTrusted || !this.engine || !this.adapter) return;
      if (this.adapter.isManualStopTarget(event.target)) { this.clearInternalActionToken(); this.engine.pause('user_stopped_generation'); }
      else if (this.adapter.isManualNativeTarget(event.target)) { this.clearInternalActionToken(); this.engine.pause('manual_native_continue'); }
      else if (this.adapter.isManualSendTarget(event.target)) { this.clearInternalActionToken(); this.engine.pause('manual_send'); }
    }
    onKeyDown(event) {
      if (!event.isTrusted || !this.engine || !this.adapter || event.isComposing) return;
      if (event.key !== 'Enter' || event.shiftKey) return;
      const composer = this.adapter.findComposer();
      if (!composer || !(event.target === composer || (composer.contains && composer.contains(event.target)))) return;
      this.clearInternalWriteToken(); this.clearInternalActionToken();
      this.engine.pause('manual_send_keyboard');
    }
    onSubmit(event) {
      if (!event.isTrusted || !this.engine || !this.adapter) return;
      const composer = this.adapter.findComposer();
      const form = event.target;
      if (composer && form && form.contains && form.contains(composer)) {
        if (this.isInternalSubmitEvent(form, composer)) return;
        this.clearInternalWriteToken();
        this.clearInternalActionToken();
        this.engine.pause('manual_send');
      }
    }
    async stop(reason = 'stopped') {
      this.runtimeEpoch += 1;
      const engine = this.engine; this.engine = null;
      if (engine) engine.stop(reason);
      this.cleanup(true);
      return this.status();
    }
    cleanup(removeOverlay = true) {
      if (this.timer) { clearInterval(this.timer); this.timer = null; }
      if (this.tickScheduled) { clearTimeout(this.tickScheduled); this.tickScheduled = null; }
      this.tickPending = false;
      this.clearInternalWriteToken(); this.clearInternalActionToken(); this.promptResolutionInput = null;
      if (this.observer) { this.observer.disconnect(); this.observer = null; }
      document.removeEventListener('beforeinput', this.boundInput, true);
      document.removeEventListener('input', this.boundInput, true);
      document.removeEventListener('paste', this.boundInput, true);
      document.removeEventListener('drop', this.boundInput, true);
      document.removeEventListener('click', this.boundClick, true);
      document.removeEventListener('keydown', this.boundKeyDown, true);
      document.removeEventListener('submit', this.boundSubmit, true);
      removeEventListener('pagehide', this.boundPageHide);
      if (removeOverlay) this.overlay.remove();
    }
    status() {
      return this.engine ? this.engine.status()
        : { state:matchConfig(location.hostname) ? STATES.IDLE : 'UNSUPPORTED', adapterId:this.adapter?.id || matchConfig(location.hostname)?.id || null, supportLevel:matchConfig(location.hostname)?.supportLevel || 'unsupported', lastError:matchConfig(location.hostname) ? null : 'unsupported_site' };
    }
    publish(status) {
      this.lastStatus = status; this.overlay.update(status);
      try { const pending = ext.runtime.sendMessage({ type:'RUNTIME_STATUS', status }); if (pending && pending.catch) pending.catch(() => {}); } catch (_) {}
    }
  }

  const runtime = new Runtime();
  root.__AI_AUTO_CONTINUE_RUNTIME__ = runtime;
  root.AIACRuntimeClasses = { Runtime };
  ext.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    const run = async () => {
      switch (message.type) {
        case 'PING_RUNTIME': return { ok:true, status:runtime.status() };
        case 'START_RUN': return { ok:true, status:await runtime.start(message.options || {}) };
        case 'STOP_RUN': return { ok:true, status:await runtime.stop(message.reason) };
        case 'GET_STATUS': return { ok:true, status:runtime.status() };
        default: return { ok:false, error:'unknown_message' };
      }
    };
    run().then(sendResponse).catch((error) => sendResponse({ ok:false, error:error.message }));
    return true;
  });
})(globalThis);
