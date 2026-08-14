const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const platforms=require('../src/shared/platforms.js');

function createHarness(activeUrl='https://unknown.example/chat', pendingUrl=''){
  const listeners={message:null,installed:null,startup:null};
  const stored={
    'aiac_binding:https://legacy.example':{schemaVersion:2},
    siteBindings:{legacy:true},
    bindingSchemaVersion:2,
    customLocators:{legacy:true},
    aiac_settings:{maxPromptSubmissions:5}
  };
  let injectionCount=0;
  const chrome={
    runtime:{
      onMessage:{addListener(fn){listeners.message=fn}},
      onInstalled:{addListener(fn){listeners.installed=fn}},
      onStartup:{addListener(fn){listeners.startup=fn}}
    },
    tabs:{
      async query(){return[{id:7,url:activeUrl,pendingUrl}]},
      async sendMessage(){throw new Error('no runtime')},
      onUpdated:{addListener(){}},
      onRemoved:{addListener(){}}
    },
    scripting:{async executeScript(){injectionCount+=1}},
    storage:{
      local:{
        async get(key){
          if(key===null||key===undefined)return{...stored};
          if(typeof key==='string')return{[key]:stored[key]};
          return{...stored};
        },
        async remove(keys){for(const key of Array.isArray(keys)?keys:[keys])delete stored[key]}
      },
      session:{async set(){},async remove(){}}
    },
    action:{async setBadgeText(){},async setBadgeBackgroundColor(){}},
    commands:{onCommand:{addListener(){}}}
  };
  const context={console,URL,Promise,Map,Set,setTimeout,clearTimeout,chrome,AIACPlatforms:platforms,importScripts(){}};
  context.globalThis=context;
  const source=fs.readFileSync(path.join(__dirname,'../src/background/service-worker.js'),'utf8');
  vm.runInNewContext(source,context,{filename:'service-worker.js'});
  async function dispatch(message){
    return new Promise((resolve,reject)=>{
      const keep=listeners.message(message,{},resolve);
      if(keep!==true)reject(new Error('listener did not keep response channel open'));
    });
  }
  return{stored,listeners,dispatch,get injectionCount(){return injectionCount}};
}

test('background removes legacy binding storage while preserving settings',async()=>{
  const harness=createHarness();
  await new Promise(resolve=>setTimeout(resolve,0));
  assert.equal(harness.stored['aiac_binding:https://legacy.example'],undefined);
  assert.equal(harness.stored.siteBindings,undefined);
  assert.equal(harness.stored.bindingSchemaVersion,undefined);
  assert.equal(harness.stored.customLocators,undefined);
  assert.deepEqual(harness.stored.aiac_settings,{maxPromptSubmissions:5});
});

test('unsupported sites are rejected before content-script injection',async()=>{
  const harness=createHarness('https://unknown.example/chat');
  const result=await harness.dispatch({type:'START_ACTIVE',options:{}});
  assert.equal(result.ok,false);
  assert.equal(result.error,'unsupported_site');
  assert.equal(result.status.state,'UNSUPPORTED');
  assert.equal(harness.injectionCount,0);
});


test('known non-chat page modes are rejected before injection',async()=>{
  const harness=createHarness('https://chatgpt.com/settings');
  const result=await harness.dispatch({type:'START_ACTIVE',options:{}});
  assert.equal(result.ok,false);
  assert.equal(result.error,'unsupported_page_mode');
  assert.equal(harness.injectionCount,0);
});

test('pending navigation URL takes priority and fails closed',async()=>{
  const harness=createHarness('https://chatgpt.com/c/old','https://unknown.example/next');
  const result=await harness.dispatch({type:'START_ACTIVE',options:{}});
  assert.equal(result.ok,false);
  assert.equal(result.error,'unsupported_site');
  assert.equal(harness.injectionCount,0);
});
