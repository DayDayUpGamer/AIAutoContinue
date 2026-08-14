const test = require('node:test');
const assert = require('node:assert/strict');
const {
  AutoContinueEngine, STATES, Mutex, normalizeText, hashText, sanitizeOptions, OPTION_LIMITS
} = require('../src/content/core.js');

class Clock {
  constructor() { this.t = 1000; }
  now = () => this.t;
  advance(ms) { this.t += ms; }
}
class FakeAdapter {
  constructor() {
    this.id='fake'; this.supportLevel='beta'; this.generating=false; this.composer='';
    this.response='answer'; this.responseBlocks=1; this.users=[]; this.native=null;
    this.blocked=null; this.conversation='c1'; this.submitMode='success'; this.nativeMode='success';
    this.submitCalls=0; this.nativeCalls=0; this.smartReady=true; this.submitReady=true; this.sendReady=true;
  }
  getConversationKey(){return this.conversation;}
  getBlockingState(){return this.blocked;}
  isGenerating(){return this.generating;}
  getResponseSnapshot(){return{anchor:'a',textHash:hashText(this.response),blockCount:this.responseBlocks,text:this.response};}
  getSmartStartReadiness(){return this.smartReady?{ok:true}:{ok:false,reason:'assistant_context_missing'};}
  canSmartStart(){return this.smartReady;}
  getPromptPreparationReadiness(){return this.submitReady?{ok:true}:{ok:false,reason:'composer_not_found'};}
  canSubmitPrompt(){return this.submitReady;}
  canSubmitWrittenPrompt(){return this.sendReady;}
  async waitForSendReady(){return this.sendReady?{ok:true}:{ok:false,reason:'send_button_not_ready_after_write'};}
  findNativeContinue(){return this.native||{status:'unavailable'};}
  captureNativeBaseline(n){return{snapshot:this.getResponseSnapshot(),fingerprint:n.fingerprint};}
  async clickNativeContinue(){this.nativeCalls++;if(this.nativeMode==='success'){this.generating=true;this.response+='+';}return this.nativeMode!=='false';}
  verifyNativeContinue(b){return this.generating||b.snapshot.textHash!==this.getResponseSnapshot().textHash?{status:'confirmed'}:{status:'pending'};}
  getComposerText(){return this.composer;}
  async writeComposer(t){this.composer=t;return true;}
  captureSubmissionBaseline(prompt){return{userCount:this.users.length,lastUserHash:hashText(this.users.at(-1)||''),response:this.getResponseSnapshot(),promptHash:hashText(prompt)};}
  async submit(){this.submitCalls++;if(this.submitMode==='success'){this.users.push(this.composer);this.composer='';this.generating=true;}return this.submitMode!=='false';}
  verifySubmission(b,p){
    if(this.users.length>b.userCount&&this.users.at(-1)===p)return{status:'confirmed'};
    if(this.generating)return{status:'confirmed'};
    if(this.composer===p)return{status:'definitely_not_sent'};
    return{status:'pending'};
  }
  canSafelyRetry(b,p){return this.composer===p&&this.users.length===b.userCount&&!this.generating&&b.response.textHash===this.getResponseSnapshot().textHash;}
}

async function settleStable(engine, clock, stabilityMs=250) {
  await engine.tick();
  clock.advance(stabilityMs + 1);
  await engine.tick();
}

test('mutex is exclusive',()=>{const m=new Mutex();assert.equal(m.tryAcquire('a'),true);assert.equal(m.tryAcquire('b'),false);m.release('a');assert.equal(m.tryAcquire('b'),true);});
test('text utilities normalize and hash deterministically',()=>{assert.equal(normalizeText(' a\n b '),'a b');assert.equal(hashText('x'),hashText('x'));assert.notEqual(hashText('x'),hashText('y'));});
test('options are bounded and sanitized',()=>{const o=sanitizeOptions({prompt:' x '.repeat(4000),maxPromptSubmissions:9999,delayMs:-3,maxNativeContinuePerCycle:-1,maxRunDurationMs:Infinity});assert.ok(o.prompt.length<=OPTION_LIMITS.promptMaxLength);assert.equal(o.maxPromptSubmissions,100);assert.equal(o.delayMs,0);assert.equal(o.maxNativeContinuePerCycle,0);assert.equal(o.maxRunDurationMs,2*60*60*1000);});

test('smart start observes briefly then submits exactly once',async()=>{const a=new FakeAdapter(),c=new Clock();const e=new AutoContinueEngine(a,{prompt:'继续',startupObservationMs:100}, {},c);await e.start();assert.equal(e.state,STATES.READY_IDLE);assert.equal(a.submitCalls,0);c.advance(101);await e.tick();assert.equal(a.submitCalls,1);assert.equal(e.state,STATES.CONFIRMING);await e.tick();assert.equal(e.sentCount,1);assert.equal(e.state,STATES.GENERATING);await e.tick();assert.equal(a.submitCalls,1);});

test('startup response activity prevents immediate prompt submission',async()=>{const a=new FakeAdapter(),c=new Clock();const e=new AutoContinueEngine(a,{startupObservationMs:100}, {},c);await e.start();a.response='answer streaming';c.advance(50);await e.tick();assert.equal(e.state,STATES.GENERATING);assert.equal(a.submitCalls,0);});

test('smart start reports a specific readiness reason',async()=>{const a=new FakeAdapter(),c=new Clock();a.smartReady=false;const e=new AutoContinueEngine(a,{startupObservationMs:0},{},c);await e.start();assert.equal(e.state,STATES.PAUSED);assert.equal(e.lastError,'assistant_context_missing');assert.equal(a.submitCalls,0);});

test('prompt preparation does not require a send control before writing',async()=>{const a=new FakeAdapter(),c=new Clock();const e=new AutoContinueEngine(a,{prompt:'continue',startupObservationMs:0,sendReadyTimeoutMs:500},{},c);await e.start();assert.equal(a.submitCalls,1);assert.equal(e.state,STATES.CONFIRMING);});

test('prompt pauses with a specific error when send never becomes ready after write',async()=>{const a=new FakeAdapter(),c=new Clock();a.sendReady=false;const e=new AutoContinueEngine(a,{prompt:'continue',startupObservationMs:0,sendReadyTimeoutMs:500},{},c);await e.start();assert.equal(e.state,STATES.PAUSED);assert.equal(e.lastError,'send_button_not_ready_after_write');assert.equal(a.submitCalls,0);assert.equal(a.composer,'continue');});

test('generating start waits for stable completion then prompt',async()=>{const a=new FakeAdapter(),c=new Clock();a.generating=true;a.response='x';const e=new AutoContinueEngine(a,{prompt:'go',stabilityMs:250,delayMs:50,nativeContinueEnabled:false},{},c);await e.start();a.generating=false;await e.tick();assert.equal(e.state,STATES.WAITING_STABLE);c.advance(251);await e.tick();assert.equal(e.state,STATES.DELAYING);c.advance(51);await e.tick();assert.equal(a.submitCalls,1);});

test('response activity starts a cycle even without a stop button',async()=>{const a=new FakeAdapter(),c=new Clock();const e=new AutoContinueEngine(a,{startupMode:'wait_current_response',stabilityMs:250,delayMs:0,nativeContinueEnabled:false},{},c);await e.start();assert.equal(e.state,STATES.WAITING_GENERATION_START);a.response='new streamed response';await e.tick();assert.equal(e.state,STATES.GENERATING);await e.tick();assert.equal(e.state,STATES.WAITING_STABLE);c.advance(251);await e.tick();assert.equal(e.state,STATES.DELAYING);await e.tick();assert.equal(a.submitCalls,1);});

test('native continue has priority and does not submit prompt',async()=>{const a=new FakeAdapter(),c=new Clock();a.generating=true;a.response='part';a.native={status:'available',element:{},fingerprint:'n1'};const e=new AutoContinueEngine(a,{stabilityMs:250,delayMs:0},{},c);await e.start();a.generating=false;await settleStable(e,c);assert.equal(a.nativeCalls,1);assert.equal(a.submitCalls,0);assert.equal(e.state,STATES.CONFIRMING_NATIVE_CONTINUE);await e.tick();assert.equal(e.nativeContinueCount,1);assert.equal(e.state,STATES.GENERATING);});

test('duplicate native fingerprint pauses instead of clicking twice',async()=>{const a=new FakeAdapter(),c=new Clock();a.generating=true;a.native={status:'available',element:{},fingerprint:'same'};const e=new AutoContinueEngine(a,{stabilityMs:250},{},c);await e.start();a.generating=false;await settleStable(e,c);await e.tick();a.generating=false;await settleStable(e,c);assert.equal(e.state,STATES.PAUSED);assert.equal(e.lastError,'native_continue_duplicate');});

test('manual pause invalidates pending work',async()=>{const a=new FakeAdapter(),c=new Clock();const e=new AutoContinueEngine(a,{prompt:'x',startupObservationMs:0},{},c);a.submitMode='false';const p=e.start();e.pause('manual_input');await p;assert.equal(e.state,STATES.PAUSED);});
test('conversation change pauses',async()=>{const a=new FakeAdapter(),c=new Clock();a.generating=true;const e=new AutoContinueEngine(a,{}, {},c);await e.start();a.conversation='c2';await e.tick();assert.equal(e.state,STATES.PAUSED);assert.equal(e.lastError,'conversation_changed');});

test('ambiguous submission pauses after deadline without retry',async()=>{const a=new FakeAdapter(),c=new Clock();a.submitMode='ambiguous';a.submit=async function(){this.submitCalls++;this.composer='';return true;};a.verifySubmission=()=>({status:'pending'});const e=new AutoContinueEngine(a,{startupObservationMs:0,submitConfirmTimeoutMs:1000},{},c);await e.start();c.advance(1001);await e.tick();assert.equal(e.state,STATES.PAUSED);assert.equal(a.submitCalls,1);});

test('definitely-not-sent prompt retries once without rewriting over itself',async()=>{const a=new FakeAdapter(),c=new Clock();let first=true;a.submit=async function(){this.submitCalls++;if(first){first=false;return true;}this.users.push(this.composer);this.composer='';this.generating=true;return true;};const e=new AutoContinueEngine(a,{prompt:'retry',startupObservationMs:0,submitConfirmTimeoutMs:1000},{},c);await e.start();assert.equal(a.submitCalls,1);c.advance(1001);await e.tick();assert.equal(a.submitCalls,2);await e.tick();assert.equal(e.sentCount,1);assert.equal(e.state,STATES.GENERATING);});

test('native continue limit pauses instead of falling back to prompt submission',async()=>{const a=new FakeAdapter(),c=new Clock();a.generating=true;a.native={status:'available',element:{},fingerprint:'n1'};const e=new AutoContinueEngine(a,{stabilityMs:250,maxNativeContinuePerCycle:0},{},c);await e.start();a.generating=false;await settleStable(e,c);assert.equal(e.state,STATES.PAUSED);assert.equal(e.lastError,'native_continue_limit');assert.equal(a.submitCalls,0);});

test('a later native continue with a new response fingerprint is allowed',async()=>{const a=new FakeAdapter(),c=new Clock();a.generating=true;a.response='one';a.native={status:'available',element:{},fingerprint:'n1'};const e=new AutoContinueEngine(a,{stabilityMs:250,maxNativeContinuePerCycle:3},{},c);await e.start();a.generating=false;await settleStable(e,c);await e.tick();assert.equal(e.nativeContinueCount,1);a.generating=false;a.native={status:'available',element:{},fingerprint:'n2'};await settleStable(e,c);await e.tick();assert.equal(a.nativeCalls,2);});

test('concurrent tick requests are coalesced',async()=>{const a=new FakeAdapter(),c=new Clock();const e=new AutoContinueEngine(a,{startupObservationMs:0},{},c);await Promise.all([e.start(),e.tick(),e.tick(),e.tick()]);assert.equal(a.submitCalls,1);});

test('engine status exposes the prompt language and resolution source',async()=>{
  const a=new FakeAdapter(),c=new Clock();
  const e=new AutoContinueEngine(a,{prompt:'Continue with the next step.',resolvedPromptLanguage:'en',resolvedPromptSource:'conversation',startupObservationMs:5000},{},c);
  await e.start();
  const status=e.status();
  assert.equal(status.promptLanguage,'en');
  assert.equal(status.promptSource,'conversation');
});

test('automatic prompt resolution is deferred until the completed response is stable', async()=>{
  const a=new FakeAdapter(),c=new Clock();
  a.generating=true;a.response='English partial response';
  let calls=0;
  const e=new AutoContinueEngine(a,{
    prompt:'placeholder',promptResolutionPending:true,
    startupObservationMs:0,stabilityMs:250,delayMs:0,nativeContinueEnabled:false
  },{
    resolvePrompt:async()=>{
      calls+=1;
      const chinese=/[\u3400-\u9fff]/.test(a.response);
      return chinese
        ? {prompt:'继续下一步',language:'zh-CN',source:'conversation'}
        : {prompt:'Continue with the next step.',language:'en',source:'conversation'};
    }
  },c);
  await e.start();
  assert.equal(calls,0);
  assert.equal(e.status().promptResolutionPending,true);
  a.response='当前回答已经完整结束，可以开始下一阶段。';
  a.generating=false;
  await e.tick();
  c.advance(251);await e.tick();await e.tick();
  assert.equal(calls,1);
  assert.equal(a.users.at(-1),'继续下一步');
  assert.equal(e.status().promptLanguage,'zh-CN');
  assert.equal(e.status().promptResolutionPending,false);
});


test('internal action hooks bracket prompt submission', async () => {
  const clock = new Clock();
  const adapter = new FakeAdapter();
  const actions = [];
  const engine = new AutoContinueEngine(adapter, {
    prompt:'continue', startupObservationMs:0, delayMs:0, stabilityMs:250
  }, {
    onInternalActionStart:(context)=>actions.push(`start:${context.kind}`),
    onInternalActionEnd:(context)=>actions.push(`end:${context.kind}`)
  }, clock);
  await engine.start();
  assert.deepEqual(actions.slice(-2), ['start:prompt_submit','end:prompt_submit']);
});
