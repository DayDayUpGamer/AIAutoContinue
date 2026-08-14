(function initAIACCore(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.AIACCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function factory() {
  'use strict';

  const STATES = Object.freeze({
    IDLE: 'IDLE', ARMED: 'ARMED', READY_IDLE: 'READY_IDLE',
    WAITING_GENERATION_START: 'WAITING_GENERATION_START', GENERATING: 'GENERATING',
    WAITING_STABLE: 'WAITING_STABLE', DELAYING: 'DELAYING',
    CHECKING_NATIVE_CONTINUE: 'CHECKING_NATIVE_CONTINUE',
    NATIVE_CONTINUING: 'NATIVE_CONTINUING', CONFIRMING_NATIVE_CONTINUE: 'CONFIRMING_NATIVE_CONTINUE',
    PRE_SEND_CHECK: 'PRE_SEND_CHECK', RESOLVING_PROMPT: 'RESOLVING_PROMPT',
    WRITING: 'WRITING', WAITING_SEND_READY: 'WAITING_SEND_READY',
    SUBMITTING: 'SUBMITTING',
    CONFIRMING: 'CONFIRMING', PAUSED: 'PAUSED', FINISHED: 'FINISHED', ERROR: 'ERROR'
  });

  const OPTION_LIMITS = Object.freeze({
    promptMaxLength: 5000,
    maxPromptSubmissions: 100,
    maxNativeContinuePerCycle: 20,
    maxDelayMs: 60_000,
    maxStabilityMs: 60_000,
    maxStartupObservationMs: 10_000,
    maxSendReadyTimeoutMs: 15_000,
    maxConfirmTimeoutMs: 60_000,
    maxRunDurationMs: 24 * 60 * 60 * 1000
  });

  const DEFAULT_OPTIONS = Object.freeze({
    prompt: 'Continue with the next step.', maxPromptSubmissions: 5, delayMs: 3000, stabilityMs: 2500,
    startupObservationMs: 1200,
    nativeContinueEnabled: true, maxNativeContinuePerCycle: 5,
    sendReadyTimeoutMs: 2500, nativeConfirmTimeoutMs: 6000, submitConfirmTimeoutMs: 7000,
    maxRunDurationMs: 2 * 60 * 60 * 1000, startupMode: 'smart'
  });

  const NATIVE_CONTINUE_PHRASES = Object.freeze([
    'continue generating', 'continue response', 'continue answer', 'resume generating',
    'resume response', '继续生成', '继续回答', '继续输出', '继续创作'
  ]);

  function nowMs() { return Date.now(); }
  function uid(prefix = 'id') {
    const rand = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID() : Math.random().toString(36).slice(2);
    return `${prefix}-${rand}`;
  }
  function normalizeText(value) { return String(value || '').replace(/\s+/g, ' ').trim(); }
  function hashText(value) {
    const input = String(value || ''); let hash = 2166136261;
    for (let i = 0; i < input.length; i += 1) {
      hash ^= input.charCodeAt(i); hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(16).padStart(8, '0');
  }
  function sameSnapshot(a, b) {
    return Boolean(a && b && a.textHash === b.textHash && a.blockCount === b.blockCount && a.anchor === b.anchor);
  }
  function isTerminal(state) { return state === STATES.PAUSED || state === STATES.FINISHED || state === STATES.ERROR; }
  function clampNumber(value, fallback, min, max) {
    const number = Number(value);
    if (!Number.isFinite(number)) return fallback;
    return Math.min(max, Math.max(min, Math.round(number)));
  }
  function sanitizeOptions(input = {}, base = DEFAULT_OPTIONS) {
    const merged = { ...base, ...input };
    const prompt = String(merged.prompt == null ? DEFAULT_OPTIONS.prompt : merged.prompt)
      .trim().slice(0, OPTION_LIMITS.promptMaxLength) || DEFAULT_OPTIONS.prompt;
    return {
      prompt,
      maxPromptSubmissions: clampNumber(merged.maxPromptSubmissions, DEFAULT_OPTIONS.maxPromptSubmissions, 1, OPTION_LIMITS.maxPromptSubmissions),
      delayMs: clampNumber(merged.delayMs, DEFAULT_OPTIONS.delayMs, 0, OPTION_LIMITS.maxDelayMs),
      stabilityMs: clampNumber(merged.stabilityMs, DEFAULT_OPTIONS.stabilityMs, 250, OPTION_LIMITS.maxStabilityMs),
      startupObservationMs: clampNumber(merged.startupObservationMs, DEFAULT_OPTIONS.startupObservationMs, 0, OPTION_LIMITS.maxStartupObservationMs),
      nativeContinueEnabled: merged.nativeContinueEnabled !== false,
      sendReadyTimeoutMs: clampNumber(merged.sendReadyTimeoutMs, DEFAULT_OPTIONS.sendReadyTimeoutMs, 250, OPTION_LIMITS.maxSendReadyTimeoutMs),
      maxNativeContinuePerCycle: clampNumber(merged.maxNativeContinuePerCycle, DEFAULT_OPTIONS.maxNativeContinuePerCycle, 0, OPTION_LIMITS.maxNativeContinuePerCycle),
      nativeConfirmTimeoutMs: clampNumber(merged.nativeConfirmTimeoutMs, DEFAULT_OPTIONS.nativeConfirmTimeoutMs, 1000, OPTION_LIMITS.maxConfirmTimeoutMs),
      submitConfirmTimeoutMs: clampNumber(merged.submitConfirmTimeoutMs, DEFAULT_OPTIONS.submitConfirmTimeoutMs, 1000, OPTION_LIMITS.maxConfirmTimeoutMs),
      maxRunDurationMs: clampNumber(merged.maxRunDurationMs, DEFAULT_OPTIONS.maxRunDurationMs, 60_000, OPTION_LIMITS.maxRunDurationMs),
      startupMode: merged.startupMode === 'wait_current_response' ? 'wait_current_response' : 'smart',
      promptResolutionPending: merged.promptResolutionPending === true,
      resolvedPromptLanguage: merged.resolvedPromptLanguage ? String(merged.resolvedPromptLanguage).slice(0, 32) : null,
      resolvedPromptSource: merged.promptResolutionPending === true ? null
        : (['custom','preferred_language','conversation','browser_ui','fallback','legacy_prompt'].includes(merged.resolvedPromptSource)
          ? merged.resolvedPromptSource : (input && typeof input.prompt === 'string' && input.prompt.trim() ? 'legacy_prompt' : 'fallback'))
    };
  }

  class Mutex {
    constructor() { this.owner = null; }
    tryAcquire(owner) { if (this.owner && this.owner !== owner) return false; this.owner = owner; return true; }
    release(owner) { if (!owner || this.owner === owner) this.owner = null; }
    forceRelease() { this.owner = null; }
    isLocked() { return Boolean(this.owner); }
  }

  class AutoContinueEngine {
    constructor(adapter, options = {}, hooks = {}, clock = {}) {
      if (!adapter) throw new Error('adapter_required');
      this.adapter = adapter;
      this.options = sanitizeOptions(options);
      this.hooks = hooks;
      this.clock = { now: clock.now || nowMs };
      this.state = STATES.IDLE;
      this.runEpoch = 0;
      this.startedAt = 0;
      this.sentCount = 0;
      this.nativeContinueCount = 0;
      this.nativeCountInCycle = 0;
      this.activeCycle = null;
      this.stableSince = 0;
      this.delayUntil = 0;
      this.startupDeadline = 0;
      this.startupSnapshot = null;
      this.waitingSnapshot = null;
      this.confirmDeadline = 0;
      this.baseline = null;
      this.submitAttempt = 0;
      this.strategyLock = new Mutex();
      this.lastError = null;
      this.initialConversationKey = null;
      this.tickRequested = false;
      this.tickPromise = null;
    }

    status() {
      return {
        state: this.state, runEpoch: this.runEpoch, sentCount: this.sentCount,
        nativeContinueCount: this.nativeContinueCount,
        nativeCountInCycle: this.nativeCountInCycle,
        maxPromptSubmissions: this.options.maxPromptSubmissions,
        maxNativeContinuePerCycle: this.options.maxNativeContinuePerCycle,
        adapterId: this.adapter.id || 'generic', supportLevel: this.adapter.supportLevel || 'generic',
        promptLanguage: this.options.resolvedPromptLanguage,
        promptSource: this.options.resolvedPromptSource,
        promptResolutionPending: this.options.promptResolutionPending,
        lastError: this.lastError
      };
    }

    transition(state, detail) {
      this.state = state;
      if (this.hooks.onState) this.hooks.onState(this.status(), detail);
    }

    isEpochActive(epoch) { return epoch === this.runEpoch && !isTerminal(this.state); }
    isCycleActive(cycle) {
      return Boolean(cycle && this.activeCycle && cycle.id === this.activeCycle.id
        && cycle.epoch === this.runEpoch && !isTerminal(this.state));
    }

    async start(options = {}) {
      this.runEpoch += 1;
      const epoch = this.runEpoch;
      this.options = sanitizeOptions(options, this.options);
      this.sentCount = 0; this.nativeContinueCount = 0; this.nativeCountInCycle = 0;
      this.activeCycle = null; this.lastError = null; this.startedAt = this.clock.now();
      this.baseline = null; this.waitingSnapshot = null; this.startupSnapshot = null;
      this.strategyLock.forceRelease();
      this.initialConversationKey = this.adapter.getConversationKey();
      this.transition(STATES.ARMED);
      const blocked = this.adapter.getBlockingState && this.adapter.getBlockingState();
      if (blocked) return this.pause(blocked);
      if (!this.isEpochActive(epoch)) return this.status();

      if (this.adapter.isGenerating()) {
        this.beginCycle('observed');
        this.transition(STATES.GENERATING);
      } else if (this.options.startupMode === 'smart') {
        this.startupSnapshot = this.adapter.getResponseSnapshot();
        this.startupDeadline = this.clock.now() + this.options.startupObservationMs;
        this.transition(STATES.READY_IDLE);
        if (this.options.startupObservationMs === 0) await this.handleReadyIdle();
      } else {
        this.waitingSnapshot = this.adapter.getResponseSnapshot();
        this.transition(STATES.WAITING_GENERATION_START);
      }
      return this.status();
    }

    beginCycle(kind = 'response', snapshot = null) {
      this.activeCycle = {
        id: uid(kind), epoch: this.runEpoch, kind, sendCommitted: false,
        nativeFingerprints: new Set(), responseSnapshot: snapshot || this.adapter.getResponseSnapshot(),
        startedAt: this.clock.now(), lastActivityAt: this.clock.now()
      };
      this.nativeCountInCycle = 0;
      return this.activeCycle;
    }

    async tick() {
      this.tickRequested = true;
      if (this.tickPromise) return this.tickPromise;
      this.tickPromise = (async () => {
        do {
          this.tickRequested = false;
          await this._tick();
        } while (this.tickRequested && !isTerminal(this.state));
        return this.status();
      })().catch((error) => isTerminal(this.state) ? this.status() : this.fail(error)).finally(() => {
        this.tickPromise = null;
        if (this.tickRequested && !isTerminal(this.state)) Promise.resolve().then(() => this.tick());
      });
      return this.tickPromise;
    }

    async _tick() {
      if (isTerminal(this.state) || this.state === STATES.IDLE) return this.status();
      const now = this.clock.now();
      if (now - this.startedAt > this.options.maxRunDurationMs) return this.stop('max_run_duration');
      const currentConversation = this.adapter.getConversationKey();
      if (this.initialConversationKey && currentConversation && currentConversation !== this.initialConversationKey) {
        return this.pause('conversation_changed');
      }
      const blocked = this.adapter.getBlockingState && this.adapter.getBlockingState();
      if (blocked) return this.pause(blocked);

      if (this.state === STATES.READY_IDLE) return this.handleReadyIdle();

      if (this.state === STATES.WAITING_GENERATION_START) {
        const snapshot = this.adapter.getResponseSnapshot();
        if (this.adapter.isGenerating() || (this.waitingSnapshot && !sameSnapshot(snapshot, this.waitingSnapshot))) {
          this.beginCycle('response', snapshot);
          this.transition(STATES.GENERATING);
        }
        return this.status();
      }

      if (this.state === STATES.GENERATING) {
        const snapshot = this.adapter.getResponseSnapshot();
        if (this.activeCycle && !sameSnapshot(snapshot, this.activeCycle.responseSnapshot)) {
          this.activeCycle.responseSnapshot = snapshot;
          this.activeCycle.lastActivityAt = now;
        }
        if (!this.adapter.isGenerating()) {
          this.stableSince = this.activeCycle ? this.activeCycle.lastActivityAt : now;
          if (!this.stableSince || this.stableSince > now) this.stableSince = now;
          this.transition(STATES.WAITING_STABLE);
        }
        return this.status();
      }

      if (this.state === STATES.WAITING_STABLE) {
        if (this.adapter.isGenerating()) { this.transition(STATES.GENERATING); return this.status(); }
        const snapshot = this.adapter.getResponseSnapshot();
        if (this.activeCycle && !sameSnapshot(snapshot, this.activeCycle.responseSnapshot)) {
          this.activeCycle.responseSnapshot = snapshot;
          this.activeCycle.lastActivityAt = now;
          this.stableSince = now;
          return this.status();
        }
        if (now - this.stableSince >= this.options.stabilityMs) await this.chooseStrategy(this.activeCycle);
        return this.status();
      }

      if (this.state === STATES.DELAYING) {
        const snapshot = this.adapter.getResponseSnapshot();
        if (this.adapter.isGenerating() || (this.activeCycle && !sameSnapshot(snapshot, this.activeCycle.responseSnapshot))) {
          if (this.activeCycle) { this.activeCycle.responseSnapshot = snapshot; this.activeCycle.lastActivityAt = now; }
          this.transition(STATES.GENERATING);
          return this.status();
        }
        if (now >= this.delayUntil) await this.executePrompt(this.activeCycle);
        return this.status();
      }

      if (this.state === STATES.CONFIRMING_NATIVE_CONTINUE) {
        const result = this.adapter.verifyNativeContinue(this.baseline);
        if (result.status === 'confirmed') {
          this.nativeContinueCount += 1; this.nativeCountInCycle += 1;
          if (this.activeCycle) {
            this.activeCycle.responseSnapshot = this.adapter.getResponseSnapshot();
            this.activeCycle.lastActivityAt = now;
          }
          this.baseline = null; this.strategyLock.forceRelease(); this.transition(STATES.GENERATING);
        } else if (result.status === 'blocked') {
          this.strategyLock.forceRelease(); this.pause(result.reason || 'native_continue_blocked');
        } else if (now >= this.confirmDeadline) {
          this.strategyLock.forceRelease(); this.pause('native_continue_ambiguous');
        }
        return this.status();
      }

      if (this.state === STATES.CONFIRMING) {
        const result = this.adapter.verifySubmission(this.baseline, this.options.prompt);
        if (result.status === 'confirmed') {
          this.sentCount += 1; this.baseline = null; this.submitAttempt = 0; this.strategyLock.forceRelease();
          if (this.sentCount >= this.options.maxPromptSubmissions) return this.stop('count_limit');
          const snapshot = this.adapter.getResponseSnapshot();
          if (this.adapter.isGenerating() || (this.waitingSnapshot && !sameSnapshot(snapshot, this.waitingSnapshot))) {
            this.beginCycle('response', snapshot); this.transition(STATES.GENERATING);
          } else {
            this.activeCycle = null; this.waitingSnapshot = snapshot;
            this.transition(STATES.WAITING_GENERATION_START);
          }
        } else if (result.status === 'blocked') {
          this.strategyLock.forceRelease(); this.pause(result.reason || 'submission_blocked');
        } else if (now >= this.confirmDeadline) {
          if (result.status === 'definitely_not_sent' && this.submitAttempt === 1
            && this.adapter.canSafelyRetry(this.baseline, this.options.prompt)) {
            this.strategyLock.forceRelease(); if (this.activeCycle) this.activeCycle.sendCommitted = false;
            await this.executePrompt(this.activeCycle, 2);
          } else {
            this.strategyLock.forceRelease(); this.pause('submission_ambiguous');
          }
        }
        return this.status();
      }
      return this.status();
    }

    async handleReadyIdle() {
      if (this.adapter.isGenerating()) {
        this.beginCycle('observed'); this.transition(STATES.GENERATING); return this.status();
      }
      const snapshot = this.adapter.getResponseSnapshot();
      if (this.startupSnapshot && !sameSnapshot(snapshot, this.startupSnapshot)) {
        this.beginCycle('observed', snapshot); this.transition(STATES.GENERATING); return this.status();
      }
      if (this.clock.now() < this.startupDeadline) return this.status();
      const readiness = this.adapter.getSmartStartReadiness
        ? this.adapter.getSmartStartReadiness()
        : { ok: !this.adapter.canSmartStart || this.adapter.canSmartStart(), reason: 'smart_start_not_ready' };
      if (!readiness || !readiness.ok) return this.pause(readiness && readiness.reason || 'smart_start_not_ready');
      this.beginCycle('initial', snapshot);
      await this.executePrompt(this.activeCycle);
      return this.status();
    }

    async chooseStrategy(cycle) {
      if (!this.isCycleActive(cycle)) return;
      this.transition(STATES.CHECKING_NATIVE_CONTINUE);
      if (this.options.nativeContinueEnabled) {
        const native = this.adapter.findNativeContinue();
        if (native.status === 'ambiguous') return this.pause('native_continue_control_ambiguous');
        if (native.status === 'available') {
          if (this.nativeCountInCycle >= this.options.maxNativeContinuePerCycle) return this.pause('native_continue_limit');
          return this.executeNative(cycle, native);
        }
      }
      this.delayUntil = this.clock.now() + this.options.delayMs;
      this.transition(STATES.DELAYING);
    }

    async executeNative(cycle, native) {
      if (!this.isCycleActive(cycle)) return;
      const owner = `native:${cycle.id}`;
      if (!this.strategyLock.tryAcquire(owner)) return;
      if (cycle.nativeFingerprints.has(native.fingerprint)) {
        this.strategyLock.release(owner); return this.pause('native_continue_duplicate');
      }
      cycle.nativeFingerprints.add(native.fingerprint);
      this.transition(STATES.NATIVE_CONTINUING);
      const epoch = this.runEpoch;
      const baseline = this.adapter.captureNativeBaseline(native);
      const actionContext = { kind:'native_continue', runEpoch:epoch, cycleId:cycle.id };
      if (this.hooks.onInternalActionStart) this.hooks.onInternalActionStart(actionContext);
      let clicked = false;
      try {
        clicked = await this.adapter.clickNativeContinue(native);
      } finally {
        if (this.hooks.onInternalActionEnd) this.hooks.onInternalActionEnd(actionContext);
      }
      if (!this.isEpochActive(epoch) || !this.isCycleActive(cycle)) { this.strategyLock.release(owner); return; }
      if (!clicked) { this.strategyLock.release(owner); return this.pause('native_continue_click_failed'); }
      this.baseline = baseline; this.confirmDeadline = this.clock.now() + this.options.nativeConfirmTimeoutMs;
      this.transition(STATES.CONFIRMING_NATIVE_CONTINUE);
    }

    async ensurePromptResolved(cycle) {
      if (!this.options.promptResolutionPending) return true;
      if (!this.isCycleActive(cycle)) return false;
      if (!this.hooks.resolvePrompt) {
        this.pause('prompt_resolution_unavailable');
        return false;
      }
      const epoch = this.runEpoch;
      const conversationKey = this.adapter.getConversationKey();
      this.transition(STATES.RESOLVING_PROMPT);
      let resolved;
      try {
        resolved = await this.hooks.resolvePrompt({
          runEpoch: epoch,
          cycleId: cycle.id,
          conversationKey
        });
      } catch (error) {
        if (this.isEpochActive(epoch) && this.isCycleActive(cycle)) {
          const reason = error && error.message === 'conversation_changed' ? 'conversation_changed' : 'prompt_resolution_failed';
          this.pause(reason);
        }
        return false;
      }
      if (!this.isEpochActive(epoch) || !this.isCycleActive(cycle)) return false;
      const currentConversation = this.adapter.getConversationKey();
      if (conversationKey && currentConversation && conversationKey !== currentConversation) {
        this.pause('conversation_changed');
        return false;
      }
      const prompt = String(resolved && resolved.prompt || '').trim().slice(0, OPTION_LIMITS.promptMaxLength);
      if (!prompt) {
        this.pause('prompt_resolution_failed');
        return false;
      }
      this.options = sanitizeOptions({
        ...this.options,
        prompt,
        promptResolutionPending: false,
        resolvedPromptLanguage: resolved && resolved.language,
        resolvedPromptSource: resolved && resolved.source
      }, this.options);
      this.transition(STATES.PRE_SEND_CHECK);
      return true;
    }

    async executePrompt(cycle, attempt = 1) {
      if (!this.isCycleActive(cycle)) return;
      const owner = `prompt:${cycle.id}`;
      if (!this.strategyLock.tryAcquire(owner)) return;
      if (cycle.sendCommitted && attempt === 1) { this.strategyLock.release(owner); return; }
      this.transition(STATES.PRE_SEND_CHECK);
      if (this.sentCount >= this.options.maxPromptSubmissions) { this.strategyLock.release(owner); return this.stop('count_limit'); }
      if (this.adapter.isGenerating()) { this.strategyLock.release(owner); this.transition(STATES.GENERATING); return; }
      const preparation = this.adapter.getPromptPreparationReadiness
        ? this.adapter.getPromptPreparationReadiness()
        : { ok: !this.adapter.canSubmitPrompt || this.adapter.canSubmitPrompt(), reason: 'prompt_submission_not_ready' };
      if (!preparation || !preparation.ok) {
        this.strategyLock.release(owner); return this.pause(preparation && preparation.reason || 'prompt_submission_not_ready');
      }
      const resolutionEpoch = this.runEpoch;
      if (!await this.ensurePromptResolved(cycle)) {
        this.strategyLock.release(owner);
        return;
      }
      if (!this.isEpochActive(resolutionEpoch) || !this.isCycleActive(cycle)) {
        this.strategyLock.release(owner);
        return;
      }
      const composerText = normalizeText(this.adapter.getComposerText());
      const normalizedPrompt = normalizeText(this.options.prompt);
      const retryWithExistingPrompt = attempt > 1 && composerText === normalizedPrompt;
      if (composerText && !retryWithExistingPrompt) { this.strategyLock.release(owner); return this.pause('composer_not_empty'); }
      const epoch = this.runEpoch;
      if (!retryWithExistingPrompt) {
        this.transition(STATES.WRITING);
        const writeContext = {
          runEpoch: epoch,
          cycleId: cycle.id,
          expectedText: this.options.prompt,
          expectedTextHash: hashText(normalizedPrompt)
        };
        if (this.hooks.onInternalWriteStart) this.hooks.onInternalWriteStart(writeContext);
        let wrote = false;
        try {
          wrote = await this.adapter.writeComposer(this.options.prompt);
        } finally {
          if (this.hooks.onInternalWriteEnd) {
            this.hooks.onInternalWriteEnd({ ...writeContext, wrote });
          }
        }
        if (!this.isEpochActive(epoch) || !this.isCycleActive(cycle)) { this.strategyLock.release(owner); return; }
        if (!wrote || normalizeText(this.adapter.getComposerText()) !== normalizedPrompt) {
          this.strategyLock.release(owner); return this.pause('write_failed');
        }
      }
      this.transition(STATES.WAITING_SEND_READY);
      const sendReady = this.adapter.waitForSendReady
        ? await this.adapter.waitForSendReady(this.options.sendReadyTimeoutMs, this.options.prompt)
        : { ok: !this.adapter.canSubmitWrittenPrompt || this.adapter.canSubmitWrittenPrompt(), reason: 'send_button_not_ready_after_write' };
      if (!this.isEpochActive(epoch) || !this.isCycleActive(cycle)) { this.strategyLock.release(owner); return; }
      if (!sendReady || !sendReady.ok) {
        this.strategyLock.release(owner); return this.pause(sendReady && sendReady.reason || 'send_button_not_ready_after_write');
      }
      if (this.adapter.isGenerating()) {
        this.strategyLock.release(owner); return this.pause('generation_started_before_submit');
      }
      if (normalizeText(this.adapter.getComposerText()) !== normalizedPrompt) {
        this.strategyLock.release(owner); return this.pause('composer_changed_before_submit');
      }
      this.transition(STATES.SUBMITTING);
      const baseline = this.adapter.captureSubmissionBaseline(this.options.prompt);
      this.waitingSnapshot = baseline.response || this.adapter.getResponseSnapshot();
      cycle.sendCommitted = true; this.submitAttempt = attempt;
      const actionContext = { kind:'prompt_submit', runEpoch:epoch, cycleId:cycle.id };
      if (this.hooks.onInternalActionStart) this.hooks.onInternalActionStart(actionContext);
      let submitted = false;
      try {
        submitted = await this.adapter.submit();
      } finally {
        if (this.hooks.onInternalActionEnd) this.hooks.onInternalActionEnd(actionContext);
      }
      if (!this.isEpochActive(epoch) || !this.isCycleActive(cycle)) { this.strategyLock.release(owner); return; }
      if (!submitted) {
        cycle.sendCommitted = false; this.strategyLock.release(owner);
        return this.pause('submit_failed');
      }
      this.baseline = baseline; this.confirmDeadline = this.clock.now() + this.options.submitConfirmTimeoutMs;
      this.transition(STATES.CONFIRMING);
    }

    pause(reason) {
      if (this.state === STATES.PAUSED) return this.status();
      this.runEpoch += 1; this.lastError = String(reason || 'paused'); this.strategyLock.forceRelease();
      this.baseline = null; this.activeCycle = null;
      this.transition(STATES.PAUSED, this.lastError);
      if (this.hooks.onStop) this.hooks.onStop(this.status(), this.lastError);
      return this.status();
    }

    stop(reason = 'stopped') {
      if (this.state === STATES.FINISHED) return this.status();
      this.runEpoch += 1; this.lastError = null; this.strategyLock.forceRelease();
      this.activeCycle = null; this.baseline = null;
      this.transition(STATES.FINISHED, reason);
      if (this.hooks.onStop) this.hooks.onStop(this.status(), reason);
      return this.status();
    }

    fail(error) {
      this.runEpoch += 1; this.strategyLock.forceRelease();
      this.activeCycle = null; this.baseline = null;
      this.lastError = error instanceof Error ? error.message : String(error);
      this.transition(STATES.ERROR, this.lastError);
      if (this.hooks.onStop) this.hooks.onStop(this.status(), this.lastError);
      return this.status();
    }
  }

  function elementText(element) {
    return normalizeText(element && (element.innerText || element.textContent || element.value || ''));
  }
  function stableAccessibleName(element) {
    if (!element || !element.getAttribute) return '';
    return normalizeText(element.getAttribute('aria-label') || element.getAttribute('title')
      || element.getAttribute('name') || element.getAttribute('data-testid') || '');
  }
  function accessibleName(element) { return stableAccessibleName(element) || elementText(element); }
  function isVisible(element, win) {
    if (!element || element.disabled) return false;
    if (element.hidden || (element.getAttribute && element.getAttribute('aria-hidden') === 'true')) return false;
    if (!win || !win.getComputedStyle) return true;
    const style = win.getComputedStyle(element);
    if (!style || style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
    const rect = element.getBoundingClientRect ? element.getBoundingClientRect() : { width: 1, height: 1 };
    return rect.width > 0 && rect.height > 0;
  }
  function safeQueryAll(rootNode, selector) {
    try { return Array.from(rootNode.querySelectorAll(selector)); } catch (_) { return []; }
  }

  return {
    STATES, DEFAULT_OPTIONS, OPTION_LIMITS, NATIVE_CONTINUE_PHRASES, Mutex, AutoContinueEngine,
    sanitizeOptions, normalizeText, hashText, sameSnapshot, elementText, stableAccessibleName,
    accessibleName, isVisible, safeQueryAll
  };
});
