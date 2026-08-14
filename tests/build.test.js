const test=require('node:test');const assert=require('node:assert/strict');const fs=require('fs');const path=require('path');const cp=require('child_process');const root=path.resolve(__dirname,'..');const pkg=require('../package.json');
test('build produces browser-specific manifests',()=>{cp.execFileSync(process.execPath,['build/build.js'],{cwd:root});const chrome=JSON.parse(fs.readFileSync(path.join(root,'dist/chrome/manifest.json')));const firefox=JSON.parse(fs.readFileSync(path.join(root,'dist/firefox/manifest.json')));const safari=JSON.parse(fs.readFileSync(path.join(root,'dist/safari/manifest.json')));assert.equal(chrome.version,pkg.version);assert.equal(chrome.background.service_worker,'background/service-worker.js');assert.deepEqual(firefox.background.scripts,['background/service-worker.js']);assert.ok(firefox.browser_specific_settings.gecko.id);assert.ok(fs.existsSync(path.join(root,'dist/safari/SAFARI_SOURCE_ONLY.txt')));assert.equal(safari.version,pkg.version);assert.equal(chrome.options_ui.page,'options/index.html');});
test('build contains no broad host access or sensitive permissions',()=>{for(const target of ['chrome','edge','firefox','safari']){const m=fs.readFileSync(path.join(root,'dist',target,'manifest.json'),'utf8');for(const forbidden of ['<all_urls>','webRequest','cookies','history','clipboardRead','clipboardWrite'])assert.equal(m.includes(forbidden),false,`${target}:${forbidden}`);}});

test('build includes the disclosed publisher link without tracking parameters',()=>{
  for(const target of ['chrome','edge','firefox','safari']){
    const dir=path.join(root,'dist',target,'popup');
    assert.ok(fs.existsSync(path.join(dir,'publisher-link.js')),`${target}:publisher-link.js`);
    const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
    assert.match(html,/https:\/\/muhook\.com\//);
    assert.equal(/[?&](utm_[a-z]+|ref|affiliate|aff_id)=/i.test(html),false);
  }
});

test('build includes language-aware prompt runtime, settings migration, and localized UI resources',()=>{
  for(const target of ['chrome','edge','firefox','safari']){
    const dir=path.join(root,'dist',target);
    assert.ok(fs.existsSync(path.join(dir,'shared/platforms.js')),`${target}:platform-registry`);
    assert.ok(fs.existsSync(path.join(dir,'content/prompt-language.js')),`${target}:prompt-language`);
    assert.ok(fs.existsSync(path.join(dir,'popup/prompt-settings.js')),`${target}:prompt-settings`);
    assert.ok(fs.existsSync(path.join(dir,'options/options.js')),`${target}:options-runtime`);
    for(const locale of ['en','zh_CN','zh_TW','ja','ko']){
      assert.ok(fs.existsSync(path.join(dir,'_locales',locale,'messages.json')),`${target}:${locale}`);
    }
    const background=fs.readFileSync(path.join(dir,'background/service-worker.js'),'utf8');
    assert.ok(background.indexOf("content/prompt-language.js") < background.indexOf("content/core.js"),`${target}:injection order`);
  }
});

test('userscript build version matches package and does not probe for installed extensions',()=>{
  const source=fs.readFileSync(path.join(root,'dist/userscript/ai-auto-continue-lite.user.js'),'utf8');
  assert.match(source,new RegExp(`^// @version\\s+${pkg.version.replace(/\./g,'\\.')}$`,'m'));
  assert.equal(source.includes('AIAC_PROBE'),false);
  assert.equal(source.includes('AIAC_ACTIVE'),false);
  assert.equal(source.includes('__AIAC_LITE__'),false);
});


test('production builds contain no user-binding workflow or unknown-site fallback',()=>{
  for(const target of ['chrome','edge','firefox','safari']){
    const dir=path.join(root,'dist',target);
    const runtime=fs.readFileSync(path.join(dir,'content/entry.js'),'utf8');
    const adapters=fs.readFileSync(path.join(dir,'content/adapters.js'),'utf8');
    const popup=fs.readFileSync(path.join(dir,'popup/index.html'),'utf8')+fs.readFileSync(path.join(dir,'popup/popup.js'),'utf8');
    for(const forbidden of ['START_BINDING','BindingRecorder','aiac_binding:','Bind current AI site']) assert.equal((runtime+adapters+popup).includes(forbidden),false,`${target}:${forbidden}`);
    assert.equal(adapters.includes('allowGenericForTesting'),false);
    assert.equal(adapters.includes('generic-test'),false);
    assert.ok(adapters.includes('return config ? new DomAdapter(config, env) : null'));
    assert.ok(popup.includes('unsupportedView'));
    assert.ok(fs.existsSync(path.join(dir,'options/index.html')),`${target}:options page`);
  }
});

test('source userscript version matches package before build',()=>{const source=fs.readFileSync(path.join(root,'userscript/ai-auto-continue-lite.user.js'),'utf8');const version=(source.match(/^\/\/ @version\s+(.+)$/m)||[])[1];assert.equal(version,pkg.version);});
