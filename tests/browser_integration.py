from playwright.sync_api import sync_playwright
from pathlib import Path
import os

ROOT = Path(__file__).resolve().parents[1]
PLATFORMS = str(ROOT / 'src/shared/platforms.js')
UI_I18N = str(ROOT / 'src/shared/ui-i18n.js')
PROMPT_LANGUAGE = str(ROOT / 'src/content/prompt-language.js')
CORE = str(ROOT / 'src/content/core.js')
ADAPTERS = str(ROOT / 'src/content/adapters.js')
FIXTURE = str(ROOT / 'tests/fixtures/dom-fixture-adapter.js')
ENTRY = str(ROOT / 'src/content/entry.js')
PROMPT_SETTINGS = str(ROOT / 'src/popup/prompt-settings.js')
PUBLISHER_LINK = str(ROOT / 'src/popup/publisher-link.js')
POPUP_JS = str(ROOT / 'src/popup/popup.js')
POPUP_HTML = (ROOT / 'src/popup/index.html').read_text(encoding='utf-8')
POPUP_CSS = (ROOT / 'src/popup/popup.css').read_text(encoding='utf-8')
for tag in ['<script src="../shared/platforms.js"></script>', '<script src="../shared/ui-i18n.js"></script>', '<script src="../content/prompt-language.js"></script>', '<script src="prompt-settings.js"></script>', '<script src="publisher-link.js"></script>', '<script src="popup.js"></script>']:
    POPUP_HTML = POPUP_HTML.replace(tag, '')
POPUP_HTML = POPUP_HTML.replace('<link rel="stylesheet" href="popup.css">', f'<style>{POPUP_CSS}</style>')
OPTIONS_JS = str(ROOT / 'src/options/options.js')
OPTIONS_HTML = (ROOT / 'src/options/index.html').read_text(encoding='utf-8')
OPTIONS_CSS = (ROOT / 'src/options/options.css').read_text(encoding='utf-8')
for tag in ['<script src="../shared/platforms.js"></script>', '<script src="../shared/ui-i18n.js"></script>', '<script src="../content/prompt-language.js"></script>', '<script src="../popup/prompt-settings.js"></script>', '<script src="options.js"></script>']:
    OPTIONS_HTML = OPTIONS_HTML.replace(tag, '')
OPTIONS_HTML = OPTIONS_HTML.replace('<link rel="stylesheet" href="options.css">', f'<style>{OPTIONS_CSS}</style>')

HTML = '''<!doctype html><html><head><style>
body{min-height:900px;margin:0}.toolbar{height:80px}.chat{position:relative;margin-top:300px;width:700px}.composer{display:flex;margin-top:20px}textarea{width:560px;height:60px}button{width:100px;height:44px}.message{min-height:50px}
</style></head><body>
<div class="toolbar"><form><button id="unrelated" type="submit">Submit settings</button></form></div>
<div class="chat"><div id="messages"><div class="message" data-role="assistant">Previous answer</div></div>
<div class="composer"><textarea role="textbox" placeholder="Message"></textarea><button id="send" type="submit" aria-label="Send" disabled>Send</button></div>
<button id="stop" aria-label="Stop" hidden>Stop</button><div id="native"></div></div>
<script>
window.manualSendCount=0;
const box=document.querySelector('textarea'),send=document.querySelector('#send'),stop=document.querySelector('#stop'),messages=document.querySelector('#messages');
document.querySelector('#unrelated').addEventListener('click',e=>e.preventDefault());
box.addEventListener('input',()=>{const hasText=Boolean(box.value.trim());setTimeout(()=>{send.disabled=!hasText;},120);});
send.addEventListener('click',e=>{e.preventDefault();window.manualSendCount++;if(!box.value)return;const u=document.createElement('div');u.dataset.role='user';u.textContent=box.value;messages.append(u);box.value='';send.disabled=true;box.dispatchEvent(new Event('input',{bubbles:true}));stop.hidden=false;});
</script></body></html>'''

with sync_playwright() as p:
    chromium_path = os.environ.get('AIAC_CHROMIUM_PATH')
    if not chromium_path and Path('/usr/bin/chromium').exists():
        chromium_path = '/usr/bin/chromium'
    launch_kwargs = {'headless': True, 'args': ['--no-sandbox']}
    if chromium_path:
        launch_kwargs['executable_path'] = chromium_path
    browser = p.chromium.launch(**launch_kwargs)
    page = browser.new_page(viewport={"width": 1000, "height": 900})
    page.set_content(HTML)
    page.add_script_tag(path=PROMPT_LANGUAGE)
    page.add_script_tag(path=CORE)
    page.add_script_tag(path=ADAPTERS)
    page.add_script_tag(path=FIXTURE)

    result = page.evaluate('''async () => {
      const adapter = AIACFixture.create({document, window});
      const selectedSend = adapter.findSend();
      const smartReadiness = adapter.getSmartStartReadiness();
      const engine = new AIACCore.AutoContinueEngine(adapter, {prompt:'继续', maxPromptSubmissions:2, stabilityMs:250, delayMs:0, startupObservationMs:0, sendReadyTimeoutMs:1500});
      await engine.start(); await engine.tick();
      return {selectedSend:selectedSend && selectedSend.id,smartReadiness,status:engine.status(),users:[...document.querySelectorAll('[data-role=user]')].map(x=>x.textContent),composer:document.querySelector('textarea').value,stopHidden:document.querySelector('#stop').hidden};
    }''')
    assert result['selectedSend'] is None, result
    assert result['smartReadiness']['ok'] is True, result
    assert result['users'] == ['继续'], result
    assert result['composer'] == '', result
    assert result['stopHidden'] is False, result
    assert result['status']['sentCount'] == 1, result

    native = page.evaluate('''async () => {
      document.querySelector('#messages').innerHTML='<div class="message" data-role="assistant">Part</div>';
      document.querySelector('#stop').hidden=false;
      const adapter=AIACFixture.create({document,window});
      const engine=new AIACCore.AutoContinueEngine(adapter,{prompt:'fallback',stabilityMs:250,delayMs:0,startupObservationMs:0});
      await engine.start(); document.querySelector('#stop').hidden=true;
      const b=document.createElement('button');b.setAttribute('aria-label','Continue generating');b.textContent='Continue generating';
      b.addEventListener('click',()=>{document.querySelector('#stop').hidden=false;document.querySelector('[data-role=assistant]').textContent+=' resumed';b.remove();});
      document.querySelector('#native').append(b);
      await engine.tick(); window.__clockHack=1;
      // The real clock is used, so wait beyond the minimum stability period.
      await new Promise(r=>setTimeout(r,280)); await engine.tick(); await engine.tick();
      return {status:engine.status(),users:[...document.querySelectorAll('[data-role=user]')].map(x=>x.textContent),assistant:document.querySelector('[data-role=assistant]').textContent};
    }''')
    assert native['status']['nativeContinueCount'] == 1, native
    assert 'resumed' in native['assistant'], native
    assert 'fallback' not in native['users'], native

    no_stop = page.evaluate('''async () => {
      document.querySelector('#stop').hidden=true;
      document.querySelector('#messages').innerHTML='<div class="message" data-role="assistant">Old</div>';
      const adapter=AIACFixture.create({document,window});
      const engine=new AIACCore.AutoContinueEngine(adapter,{prompt:'next',startupMode:'wait_current_response',stabilityMs:250,delayMs:0});
      await engine.start(); document.querySelector('[data-role=assistant]').textContent='Old plus streamed text';
      await engine.tick(); const afterActivity=engine.state; await engine.tick();
      await new Promise(r=>setTimeout(r,280)); await engine.tick(); await engine.tick();
      return {afterActivity,state:engine.state,submitCalls:window.manualSendCount,users:[...document.querySelectorAll('[data-role=user]')].map(x=>x.textContent)};
    }''')
    assert no_stop['afterActivity'] == 'GENERATING', no_stop
    assert 'next' in no_stop['users'], no_stop

    # Programmatic button.click() produces a trusted submit event in Chromium. It must not be
    # mistaken for a user submission while the extension is performing its own send.
    form_page = browser.new_page(viewport={"width": 1000, "height": 900})
    form_page.set_content("""<!doctype html><html><head><style>body{min-height:900px}.chat{margin-top:260px;width:700px}textarea{width:560px;height:60px}.message{min-height:50px}button{width:100px;height:44px}</style></head><body><div class="chat"><div id="form-messages"><div class="message" data-role="assistant">Completed answer</div></div><form id="composer-form"><textarea role="textbox" placeholder="Message"></textarea><button id="form-send" type="submit" aria-label="Send" disabled>Send</button></form><button id="form-stop" aria-label="Stop" hidden>Stop</button></div><script>const form=document.querySelector('#composer-form'),box=form.querySelector('textarea'),send=document.querySelector('#form-send'),messages=document.querySelector('#form-messages'),stop=document.querySelector('#form-stop');window.formSubmitTrusted=[];box.addEventListener('input',()=>send.disabled=!box.value.trim());form.addEventListener('submit',e=>{window.formSubmitTrusted.push(e.isTrusted);e.preventDefault();if(!box.value.trim())return;const u=document.createElement('div');u.dataset.role='user';u.textContent=box.value;messages.append(u);box.value='';send.disabled=true;stop.hidden=false;});</script></body></html>""")
    form_page.add_script_tag(path=PROMPT_LANGUAGE)
    form_page.add_script_tag(path=CORE)
    form_page.add_script_tag(path=ADAPTERS)
    form_page.add_script_tag(path=FIXTURE)
    form_page.evaluate("""() => { const listeners=[];const store={};window.chrome={runtime:{onMessage:{addListener(fn){listeners.push(fn)}},sendMessage(){return Promise.resolve({ok:true})}},storage:{local:{async get(key){return typeof key==='string'?{[key]:store[key]}:store},async set(obj){Object.assign(store,obj)}}}}; }""")
    form_page.evaluate("() => { AIACAdapters.createAdapter = (env={}) => AIACFixture.create({document:env.document||document,window:env.window||window}); }")
    form_page.add_script_tag(path=ENTRY)
    form_result = form_page.evaluate("""async () => { const runtime=window.__AI_AUTO_CONTINUE_RUNTIME__;await runtime.start({prompt:'continue form',startupObservationMs:0,sendReadyTimeoutMs:1000});await new Promise(r=>setTimeout(r,80));return{status:runtime.status(),users:[...document.querySelectorAll('[data-role=user]')].map(x=>x.textContent),trusted:window.formSubmitTrusted}; }""")
    assert form_result['users'] == ['continue form'], form_result
    assert form_result['trusted'] == [True], form_result
    assert form_result['status']['lastError'] != 'manual_send', form_result
    form_page.close()

    # Load the real content runtime with a local mock extension API.
    page.evaluate('''() => {
      const listeners=[]; const store={};
      window.chrome={runtime:{onMessage:{addListener(fn){listeners.push(fn)}},sendMessage(){return Promise.resolve({ok:true})}},storage:{local:{async get(key){if(typeof key==='string')return {[key]:store[key]};return store},async set(obj){Object.assign(store,obj)}}}};
      window.__mockStore=store;
    }''')
    page.evaluate("() => { window.__prodCreateAdapter=AIACAdapters.createAdapter; AIACAdapters.createAdapter=(env={})=>AIACFixture.create({document:env.document||document,window:env.window||window}); }")
    page.add_script_tag(path=ENTRY)

    restart = page.evaluate('''async () => {
      document.querySelector('#stop').hidden=true;
      document.querySelectorAll('[data-role=user]').forEach(x=>x.remove());
      window.manualSendCount=0;
      const runtime=window.__AI_AUTO_CONTINUE_RUNTIME__;
      const first=runtime.start({prompt:'first',startupObservationMs:5000});
      const second=runtime.start({prompt:'second',startupObservationMs:0});
      await Promise.all([first,second]); await new Promise(r=>setTimeout(r,40));
      return {status:runtime.status(),users:[...document.querySelectorAll('[data-role=user]')].map(x=>x.textContent)};
    }''')
    assert restart['users'] == ['second'], restart

    manual = page.evaluate('''async () => {
      document.querySelector('#stop').hidden=true;
      const runtime=window.__AI_AUTO_CONTINUE_RUNTIME__;
      await runtime.start({prompt:'auto',startupObservationMs:5000});
      document.querySelector('#send').click(); // untrusted, should not pause
      return runtime.status();
    }''')
    assert manual['state'] == 'READY_IDLE', manual
    page.evaluate("""() => { document.querySelector('textarea').value='manual message'; }""")
    page.wait_for_timeout(250)
    page.evaluate("document.querySelector('#send').disabled=false")
    send_box = page.locator('#send').bounding_box()
    page.mouse.click(send_box['x'] + send_box['width'] / 2, send_box['y'] + send_box['height'] / 2)  # trusted click
    paused = page.evaluate('window.__AI_AUTO_CONTINUE_RUNTIME__.status()')
    assert paused['state'] == 'PAUSED' and paused['lastError'] == 'manual_send', paused

    # Pressing Enter can submit without a click event on modern chat editors; it must pause first.
    page.evaluate('''async () => {
      const runtime=window.__AI_AUTO_CONTINUE_RUNTIME__;
      await runtime.stop('keyboard_test_reset');
      document.querySelector('#stop').hidden=true;
      document.querySelector('textarea').value='';
      await runtime.start({prompt:'auto',startupObservationMs:5000});
      document.querySelector('textarea').value='manual keyboard send';
      document.querySelector('textarea').focus();
    }''')
    page.keyboard.press('Enter')
    page.wait_for_timeout(30)
    keyboard_paused = page.evaluate('window.__AI_AUTO_CONTINUE_RUNTIME__.status()')
    assert keyboard_paused['state'] == 'PAUSED' and keyboard_paused['lastError'] == 'manual_send_keyboard', keyboard_paused
    page.evaluate("document.querySelector('textarea').value=''")

    # Unknown sites are rejected in production; broad DOM behavior lives only in the test fixture.
    assert page.evaluate("window.__prodCreateAdapter({document,window}) === null") is True

    # Some AI sites create or replace the Send control only after an input event.
    dynamic_page = browser.new_page(viewport={"width": 1000, "height": 900})
    dynamic_page.set_content('''<!doctype html><html><head><style>body{min-height:900px}.chat{margin-top:300px;width:700px}textarea{width:560px;height:60px}.message{min-height:50px}button{width:100px;height:44px}</style></head><body><div class="chat"><div id="messages"><div class="message" data-role="assistant">Answer</div></div><textarea role="textbox" placeholder="Message"></textarea><div id="actions"></div><button id="stop2" aria-label="Stop" hidden>Stop</button></div><script>const box=document.querySelector('textarea'),actions=document.querySelector('#actions'),messages=document.querySelector('#messages'),stop=document.querySelector('#stop2');box.addEventListener('input',()=>{if(!box.value.trim()||document.querySelector('#dynamic-send'))return;setTimeout(()=>{if(document.querySelector('#dynamic-send'))return;const send=document.createElement('button');send.id='dynamic-send';send.type='submit';send.setAttribute('aria-label','Send');send.textContent='Send';send.addEventListener('click',e=>{e.preventDefault();const u=document.createElement('div');u.dataset.role='user';u.textContent=box.value;messages.append(u);box.value='';stop.hidden=false;});actions.append(send);},120);});</script></body></html>''')
    dynamic_page.add_script_tag(path=PROMPT_LANGUAGE)
    dynamic_page.add_script_tag(path=CORE)
    dynamic_page.add_script_tag(path=ADAPTERS)
    dynamic_page.add_script_tag(path=FIXTURE)
    dynamic = dynamic_page.evaluate('''async () => { const adapter=AIACFixture.create({document,window});const before=adapter.findSend();const readiness=adapter.getSmartStartReadiness();const engine=new AIACCore.AutoContinueEngine(adapter,{prompt:'dynamic',startupObservationMs:0,sendReadyTimeoutMs:1500});await engine.start();await engine.tick();return{before:before&&before.id,readiness,status:engine.status(),users:[...document.querySelectorAll('[data-role=user]')].map(x=>x.textContent),send:document.querySelector('#dynamic-send')&&document.querySelector('#dynamic-send').id}; }''')
    assert dynamic['before'] is None, dynamic
    assert dynamic['readiness']['ok'] is True, dynamic
    assert dynamic['users'] == ['dynamic'], dynamic
    assert dynamic['send'] == 'dynamic-send', dynamic
    dynamic_page.close()

    # If the site never exposes a Send control after writing, pause with a precise error.
    timeout_page = browser.new_page(viewport={"width": 1000, "height": 900})
    timeout_page.set_content('''<!doctype html><html><head><style>body{min-height:900px}.chat{margin-top:300px;width:700px}textarea{width:560px;height:60px}.message{min-height:50px}</style></head><body><div class="chat"><div class="message" data-role="assistant">Answer</div><textarea role="textbox" placeholder="Message"></textarea></div></body></html>''')
    timeout_page.add_script_tag(path=PROMPT_LANGUAGE)
    timeout_page.add_script_tag(path=CORE)
    timeout_page.add_script_tag(path=ADAPTERS)
    timeout_page.add_script_tag(path=FIXTURE)
    timeout_result = timeout_page.evaluate('''async () => { const adapter=AIACFixture.create({document,window});const engine=new AIACCore.AutoContinueEngine(adapter,{prompt:'never',startupObservationMs:0,sendReadyTimeoutMs:300});await engine.start();return{status:engine.status(),composer:document.querySelector('textarea').value}; }''')
    assert timeout_result['status']['state'] == 'PAUSED', timeout_result
    assert timeout_result['status']['lastError'] == 'send_button_not_ready_after_write', timeout_result
    assert timeout_result['composer'] == 'never', timeout_result
    timeout_page.close()

    # Rich-text editors may emit trusted input events when the extension uses execCommand.
    # Those events belong to the extension write and must not be classified as manual input.
    rich_page = browser.new_page(viewport={"width": 1000, "height": 900})
    rich_page.set_content("""<!doctype html><html><head><style>body{min-height:900px}.chat{margin-top:300px;width:700px}.editor{width:560px;min-height:60px;border:1px solid #aaa}.message{min-height:50px}button{width:100px;height:44px}</style></head><body><div class="chat"><div id="rich-messages"><div class="message" data-role="assistant">Previous answer</div></div><div id="rich-editor" class="editor" role="textbox" contenteditable="true" data-testid="prompt-textarea"></div><button id="rich-send" type="submit" aria-label="Send" disabled>Send</button><button id="rich-stop" aria-label="Stop" hidden>Stop</button></div><script>window.richInputEvents=[];const editor=document.querySelector('#rich-editor'),send=document.querySelector('#rich-send'),messages=document.querySelector('#rich-messages'),stop=document.querySelector('#rich-stop');editor.addEventListener('beforeinput',e=>window.richInputEvents.push({type:e.type,trusted:e.isTrusted,text:editor.innerText}));editor.addEventListener('input',e=>{window.richInputEvents.push({type:e.type,trusted:e.isTrusted,text:editor.innerText});send.disabled=!editor.innerText.trim();});send.addEventListener('click',e=>{e.preventDefault();if(!editor.innerText.trim())return;const user=document.createElement('div');user.dataset.role='user';user.textContent=editor.innerText;messages.append(user);editor.textContent='';send.disabled=true;stop.hidden=false;});</script></body></html>""")
    rich_page.add_script_tag(path=PROMPT_LANGUAGE)
    rich_page.add_script_tag(path=CORE)
    rich_page.add_script_tag(path=ADAPTERS)
    rich_page.add_script_tag(path=FIXTURE)
    rich_page.evaluate("""() => { const listeners=[];const store={};window.chrome={runtime:{onMessage:{addListener(fn){listeners.push(fn)}},sendMessage(){return Promise.resolve({ok:true})}},storage:{local:{async get(key){if(typeof key==='string')return {[key]:store[key]};return store},async set(obj){Object.assign(store,obj)}}}}; }""")
    rich_page.evaluate("() => { AIACAdapters.createAdapter = (env={}) => AIACFixture.create({document:env.document||document,window:env.window||window}); }")
    rich_page.add_script_tag(path=ENTRY)
    rich_result = rich_page.evaluate("""async () => { const runtime=window.__AI_AUTO_CONTINUE_RUNTIME__;await runtime.start({prompt:'继续下一步',startupObservationMs:0,sendReadyTimeoutMs:1500});await new Promise(r=>setTimeout(r,80));return{status:runtime.status(),users:[...document.querySelectorAll('[data-role=user]')].map(x=>x.textContent),events:window.richInputEvents,editor:document.querySelector('#rich-editor').innerText}; }""")
    assert rich_result['users'] == ['继续下一步'], rich_result
    assert rich_result['status']['lastError'] != 'manual_input', rich_result
    assert rich_result['status']['state'] in ('CONFIRMING', 'GENERATING'), rich_result

    # A real user edit outside an internal-write token must still pause immediately.
    rich_page.evaluate("""async () => { const runtime=window.__AI_AUTO_CONTINUE_RUNTIME__;document.querySelector('#rich-stop').hidden=true;await runtime.start({prompt:'later',startupObservationMs:5000});document.querySelector('#rich-editor').focus(); }""")
    rich_page.keyboard.type('manual')
    rich_page.wait_for_timeout(50)
    rich_manual = rich_page.evaluate('window.__AI_AUTO_CONTINUE_RUNTIME__.status()')
    assert rich_manual['state'] == 'PAUSED' and rich_manual['lastError'] == 'manual_input', rich_manual
    rich_page.close()

    # Auto prompt language is resolved once from the latest assistant reply, then cached for the run.
    language_page = browser.new_page(viewport={"width": 1000, "height": 900})
    language_page.set_content('''<!doctype html><html><head><style>body{min-height:900px}.chat{margin-top:260px;width:700px}textarea{width:560px;height:60px}.message{min-height:50px}button{width:100px;height:44px}</style></head><body><div class="chat"><div id="lang-messages"><div class="message" data-role="assistant">第一阶段已经完成，现在可以开始后续实施。</div></div><textarea role="textbox" placeholder="Message"></textarea><button id="lang-send" type="submit" aria-label="Send" disabled>Send</button><button id="lang-stop" aria-label="Stop" hidden>Stop</button></div><script>const box=document.querySelector('textarea'),send=document.querySelector('#lang-send'),messages=document.querySelector('#lang-messages'),stop=document.querySelector('#lang-stop');box.addEventListener('input',()=>send.disabled=!box.value.trim());send.addEventListener('click',e=>{e.preventDefault();if(!box.value.trim())return;const u=document.createElement('div');u.dataset.role='user';u.textContent=box.value;messages.append(u);box.value='';send.disabled=true;stop.hidden=false;});</script></body></html>''')
    language_page.add_script_tag(path=PROMPT_LANGUAGE)
    language_page.add_script_tag(path=CORE)
    language_page.add_script_tag(path=ADAPTERS)
    language_page.add_script_tag(path=FIXTURE)
    language_page.evaluate('''() => {
      const listeners=[]; const store={};
      window.chrome={
        runtime:{onMessage:{addListener(fn){listeners.push(fn)}},sendMessage(){return Promise.resolve({ok:true})}},
        storage:{local:{async get(key){return typeof key==='string'?{[key]:store[key]}:store},async set(obj){Object.assign(store,obj)}}},
        i18n:{
          getUILanguage(){return 'en-US'},
          detectLanguage(text, callback){
            const chinese=/[\u3400-\u9fff]/.test(text);
            const result={isReliable:true,languages:[{language:chinese?'zh-CN':'en',percentage:96}]};
            if(callback) callback(result);
            return Promise.resolve(result);
          }
        }
      };
    }''')
    language_page.evaluate("() => { AIACAdapters.createAdapter = (env={}) => AIACFixture.create({document:env.document||document,window:env.window||window}); }")
    language_page.add_script_tag(path=ENTRY)
    auto_zh = language_page.evaluate('''async () => {
      const runtime=window.__AI_AUTO_CONTINUE_RUNTIME__;
      await runtime.start({promptMode:'auto',preferredPromptLanguage:'auto',startupObservationMs:0,sendReadyTimeoutMs:1000});
      await new Promise(r=>setTimeout(r,50));
      return {status:runtime.status(),users:[...document.querySelectorAll('[data-role=user]')].map(x=>x.textContent)};
    }''')
    assert auto_zh['users'] == ['继续下一步'], auto_zh
    assert auto_zh['status']['promptLanguage'] == 'zh-CN' and auto_zh['status']['promptSource'] == 'conversation', auto_zh

    auto_en = language_page.evaluate('''async () => {
      const runtime=window.__AI_AUTO_CONTINUE_RUNTIME__;
      await runtime.stop('test_reset');
      document.querySelector('#lang-stop').hidden=true;
      document.querySelectorAll('[data-role=user]').forEach(x=>x.remove());
      document.querySelector('[data-role=assistant]').textContent='The first stage is complete and the next implementation step is ready.';
      await runtime.start({promptMode:'auto',preferredPromptLanguage:'auto',startupObservationMs:0,sendReadyTimeoutMs:1000});
      await new Promise(r=>setTimeout(r,50));
      return {status:runtime.status(),users:[...document.querySelectorAll('[data-role=user]')].map(x=>x.textContent)};
    }''')
    assert auto_en['users'] == ['Continue with the next step.'], auto_en
    assert auto_en['status']['promptLanguage'] == 'en' and auto_en['status']['promptSource'] == 'conversation', auto_en

    # Starting during generation must defer language resolution until the complete final reply is stable.
    deferred_language = language_page.evaluate('''async () => {
      const runtime=window.__AI_AUTO_CONTINUE_RUNTIME__;
      await runtime.stop('deferred_language_reset');
      document.querySelectorAll('[data-role=user]').forEach(x=>x.remove());
      document.querySelector('textarea').value='';
      document.querySelector('#lang-send').disabled=true;
      document.querySelector('[data-role=assistant]').textContent='English partial output';
      document.querySelector('#lang-stop').hidden=false;
      window.__languageDetectCalls=0;
      const original=window.chrome.i18n.detectLanguage;
      window.chrome.i18n.detectLanguage=(text,callback)=>{
        window.__languageDetectCalls+=1;
        return original(text,callback);
      };
      await runtime.start({promptMode:'auto',preferredPromptLanguage:'auto',stabilityMs:250,delayMs:0,sendReadyTimeoutMs:1000});
      const callsAtStart=window.__languageDetectCalls;
      document.querySelector('[data-role=assistant]').textContent='当前回答已经完整结束，可以继续执行下一阶段。';
      document.querySelector('#lang-stop').hidden=true;
      await runtime.engine.tick();
      await new Promise(r=>setTimeout(r,280));
      await runtime.engine.tick();await runtime.engine.tick();
      await new Promise(r=>setTimeout(r,50));
      return {callsAtStart,calls:window.__languageDetectCalls,status:runtime.status(),users:[...document.querySelectorAll('[data-role=user]')].map(x=>x.textContent)};
    }''')
    assert deferred_language['callsAtStart'] == 0, deferred_language
    assert deferred_language['calls'] == 1, deferred_language
    assert deferred_language['users'] == ['继续下一步'], deferred_language
    assert deferred_language['status']['promptLanguage'] == 'zh-CN', deferred_language

    # A browser language detector that never resolves must time out instead of hanging Start forever.
    detect_timeout = language_page.evaluate('''async () => {
      const runtime=window.__AI_AUTO_CONTINUE_RUNTIME__;
      window.chrome.i18n.detectLanguage=()=>undefined;
      const started=performance.now();
      const result=await runtime.detectLanguage('plain English text',250);
      return {result,elapsed:performance.now()-started};
    }''')
    assert detect_timeout['result'] is None and detect_timeout['elapsed'] < 800, detect_timeout
    language_page.close()

    # The Content Runtime independently rejects a direct start on an unknown site and never writes text.
    unsupported_runtime_page = browser.new_page(viewport={"width": 1000, "height": 900})
    unsupported_runtime_page.set_content('''<!doctype html><html><body><div data-role="assistant">Answer</div><textarea role="textbox"></textarea><button type="submit" aria-label="Send">Send</button></body></html>''')
    unsupported_runtime_page.add_script_tag(path=PROMPT_LANGUAGE)
    unsupported_runtime_page.add_script_tag(path=CORE)
    unsupported_runtime_page.add_script_tag(path=ADAPTERS)
    unsupported_runtime_page.evaluate('''() => {
      const listeners=[];const store={};
      window.chrome={runtime:{onMessage:{addListener(fn){listeners.push(fn)}},sendMessage(){return Promise.resolve({ok:true})}},storage:{local:{async get(key){return typeof key==='string'?{[key]:store[key]}:store},async set(obj){Object.assign(store,obj)}}}};
    }''')
    unsupported_runtime_page.add_script_tag(path=ENTRY)
    unsupported_runtime = unsupported_runtime_page.evaluate('''async () => {
      try { await window.__AI_AUTO_CONTINUE_RUNTIME__.start({prompt:'must not send',startupObservationMs:0}); return {error:null}; }
      catch(error) { return {error:error.message,composer:document.querySelector('textarea').value}; }
    }''')
    assert unsupported_runtime == {'error':'unsupported_site','composer':''}, unsupported_runtime
    unsupported_runtime_page.close()

    # Compact popup stays within one screen, exposes one primary action, and opens the publisher link only on click.
    popup_page = browser.new_page(viewport={"width": 420, "height": 600})
    popup_page.set_content(POPUP_HTML)
    popup_page.evaluate("""() => {
      window.__openedPublisherUrl = null;
      window.__openedOptions = false;
      const store = { aiac_settings: { settingsVersion:5, promptMode:'auto', preferredPromptLanguage:'auto', uiLanguage:'auto', customPrompt:'', maxPromptSubmissions:5, delayMs:3000, nativeContinueEnabled:true, maxNativeContinuePerCycle:5, startupMode:'smart' } };
      window.chrome = {
        i18n:{getMessage(){return ''},getUILanguage(){return 'en-US'}},
        runtime: {
          lastError: null,
          openOptionsPage(){window.__openedOptions=true;return Promise.resolve()},
          getURL(path){return `chrome-extension://test/${path}`},
          sendMessage(message, callback) {
            const response = { ok: true, status: { state: 'IDLE', maxPromptSubmissions:5 } };
            if (callback) callback(response);
            return Promise.resolve(response);
          }
        },
        storage: { local: {
          async get(key) { return typeof key === 'string' ? { [key]: store[key] } : store; },
          async set(values) { Object.assign(store, values); }
        } },
        tabs: {
          async query() { return [{ id: 1, url: 'https://chatgpt.com/c/test' }]; },
          create(options, callback) {
            window.__openedPublisherUrl = options.url;
            const tab = { id: 99, url: options.url };
            if (callback) callback(tab);
            return Promise.resolve(tab);
          }
        }
      };
    }""")
    popup_page.add_script_tag(path=PLATFORMS)
    popup_page.add_script_tag(path=UI_I18N)
    popup_page.add_script_tag(path=PROMPT_LANGUAGE)
    popup_page.add_script_tag(path=PROMPT_SETTINGS)
    popup_page.add_script_tag(path=PUBLISHER_LINK)
    popup_page.add_script_tag(path=POPUP_JS)
    popup_page.wait_for_timeout(80)
    popup_metrics = popup_page.evaluate("""() => ({
      scrollHeight:document.documentElement.scrollHeight,
      bodyHeight:document.body.getBoundingClientRect().height,
      hasTextarea:Boolean(document.querySelector('textarea')),
      mainAction:document.querySelector('#mainAction').textContent,
      supportedHidden:document.querySelector('#supportedView').hidden,
      optionsUi:document.querySelector('#settings').getAttribute('aria-label')
    })""")
    assert popup_metrics['bodyHeight'] <= 420, popup_metrics
    assert popup_metrics['hasTextarea'] is False, popup_metrics
    assert '5' in popup_metrics['mainAction'], popup_metrics
    assert popup_metrics['supportedHidden'] is False, popup_metrics
    assert popup_page.evaluate('window.__openedPublisherUrl') is None
    popup_page.click('#publisher-link')
    popup_page.wait_for_timeout(30)
    assert popup_page.evaluate('window.__openedPublisherUrl') == 'https://muhook.com/'
    popup_page.click('#settings')
    popup_page.wait_for_timeout(30)
    assert popup_page.evaluate('window.__openedOptions') is True
    popup_page.close()

    unsupported_popup = browser.new_page(viewport={"width": 420, "height": 600})
    unsupported_popup.set_content(POPUP_HTML)
    unsupported_popup.evaluate("""() => {
      const store={};
      window.chrome={
        i18n:{getMessage(){return ''},getUILanguage(){return 'en-US'}},
        runtime:{
          lastError:null,getURL(path){return `chrome-extension://test/${path}`},
          sendMessage(message,callback){
            const response={ok:true,status:{state:'UNSUPPORTED',lastError:'unsupported_site'}};
            if(callback)callback(response);
            return Promise.resolve(response);
          }
        },
        storage:{local:{
          async get(key){return typeof key==='string'?{[key]:store[key]}:store},
          async set(values){Object.assign(store,values)}
        }},
        tabs:{
          async query(){return[{id:2,url:'https://unknown.example/chat'}]},
          create(options,callback){const tab={id:3,url:options.url};if(callback)callback(tab);return Promise.resolve(tab)}
        }
      };
    }""")
    unsupported_popup.add_script_tag(path=PLATFORMS)
    unsupported_popup.add_script_tag(path=UI_I18N)
    unsupported_popup.add_script_tag(path=PROMPT_LANGUAGE)
    unsupported_popup.add_script_tag(path=PROMPT_SETTINGS)
    unsupported_popup.add_script_tag(path=PUBLISHER_LINK)
    unsupported_popup.add_script_tag(path=POPUP_JS)
    unsupported_popup.wait_for_timeout(80)
    unsupported_metrics = unsupported_popup.evaluate("""() => ({
      supportedHidden:document.querySelector('#supportedView').hidden,
      unsupportedHidden:document.querySelector('#unsupportedView').hidden,
      state:document.querySelector('#stateText').textContent,
      bodyHeight:document.body.getBoundingClientRect().height
    })""")
    assert unsupported_metrics['supportedHidden'] is True, unsupported_metrics
    assert unsupported_metrics['unsupportedHidden'] is False, unsupported_metrics
    assert unsupported_metrics['state'] == 'Unsupported', unsupported_metrics
    assert unsupported_metrics['bodyHeight'] <= 420, unsupported_metrics
    unsupported_popup.close()

    # Full options page owns low-frequency settings and saves changes locally.
    options_page = browser.new_page(viewport={"width": 1000, "height": 900})
    options_page.set_content(OPTIONS_HTML)
    options_page.evaluate("""() => {
      window.__settingsStore={aiac_settings:{settingsVersion:5,promptMode:'auto',preferredPromptLanguage:'auto',uiLanguage:'auto',customPrompt:'',maxPromptSubmissions:5,delayMs:3000,nativeContinueEnabled:true,maxNativeContinuePerCycle:5,startupMode:'smart'}};
      window.chrome={
        i18n:{getMessage(){return ''},getUILanguage(){return 'en-US'}},
        runtime:{getManifest(){return{version:'1.3.2'}},getURL(path){return `chrome-extension://test/${path}`}},
        storage:{local:{
          async get(key){return typeof key==='string'?{[key]:window.__settingsStore[key]}:window.__settingsStore},
          async set(values){Object.assign(window.__settingsStore,values)}
        }}
      };
    }""")
    options_page.add_script_tag(path=PLATFORMS)
    options_page.add_script_tag(path=UI_I18N)
    options_page.add_script_tag(path=PROMPT_LANGUAGE)
    options_page.add_script_tag(path=PROMPT_SETTINGS)
    options_page.add_script_tag(path=OPTIONS_JS)
    options_page.wait_for_timeout(80)
    assert options_page.evaluate("document.querySelector('#customSettings').hidden") is True
    assert options_page.evaluate("document.querySelector('#uiLanguage').value") == 'auto'
    options_page.check('input[name="promptMode"][value="custom"]', force=True, timeout=5000)
    options_page.fill('#customPrompt', 'Review the work and continue.')
    options_page.select_option('#delayMs', '5000')
    options_page.wait_for_timeout(350)
    stored_options = options_page.evaluate('window.__settingsStore.aiac_settings')
    assert stored_options['promptMode'] == 'custom', stored_options
    assert stored_options['customPrompt'] == 'Review the work and continue.', stored_options
    assert stored_options['delayMs'] == 5000, stored_options
    assert options_page.evaluate("document.querySelector('#platformList').children.length") == 12
    options_page.close()

    browser.close()
print('Browser DOM integration passed.')
