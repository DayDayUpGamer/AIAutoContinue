const test = require('node:test');
const assert = require('node:assert/strict');
const core = require('../src/content/core.js');
global.AIACCore = core;
const { PLATFORM_CONFIGS, matchConfig, exactNativeText, scoreComposer, DomAdapter } = require('../src/content/adapters.js');

function attachMainRoot(composer, resolver = () => []) {
  const root = {
    hidden:false,
    getAttribute:()=>null,
    getBoundingClientRect:()=>({top:0,left:0,right:800,bottom:800,width:800,height:800}),
    contains:(element)=>element===composer || resolver('__contains__').includes(element),
    querySelectorAll:(selector)=>resolver(selector)
  };
  composer.closest = (selector) => selector === 'main' || selector === '[role="main"]' ? root : null;
  return root;
}

test('twelve built-in platform adapters exist and remain beta until live certification',()=>{
  assert.equal(PLATFORM_CONFIGS.length,12);
  assert.equal(new Set(PLATFORM_CONFIGS.map(x=>x.id)).size,12);
  assert.ok(PLATFORM_CONFIGS.every(x=>x.supportLevel==='beta'));
});
test('major hosts map exactly and unknown subdomains are rejected',()=>{assert.equal(matchConfig('chatgpt.com').id,'chatgpt');assert.equal(matchConfig('claude.ai').id,'claude');assert.equal(matchConfig('chat.deepseek.com').id,'deepseek');assert.equal(matchConfig('yuanbao.tencent.com').id,'yuanbao');assert.equal(matchConfig('sub.chatgpt.com'),null);});
test('native continue text matching is exact',()=>{assert.equal(exactNativeText('Continue generating'),true);assert.equal(exactNativeText('继续生成'),true);assert.equal(exactNativeText('Continue shopping'),false);});
test('composer scoring rejects disabled and favors textarea',()=>{const el={disabled:false,readOnly:false,tagName:'TEXTAREA',isContentEditable:false,getAttribute:(n)=>n==='placeholder'?'Message':null,getBoundingClientRect:()=>({top:500,width:400,height:40})};assert.ok(scoreComposer(el,{innerHeight:800,getComputedStyle:()=>({display:'block',visibility:'visible',opacity:'1'})})>=50);el.disabled=true;assert.equal(scoreComposer(el,{getComputedStyle:()=>({})}),-1000);});
test('DOM adapter can be constructed and find an exact composer',()=>{
  const element={disabled:false,readOnly:false,hidden:false,tagName:'TEXTAREA',isContentEditable:false,value:'',getAttribute:(name)=>name==='placeholder'?'Message':null,getBoundingClientRect:()=>({top:500,left:0,right:400,bottom:540,width:400,height:40}),focus(){},dispatchEvent(){return true;}};
  attachMainRoot(element);
  const doc={querySelectorAll:(selector)=>selector==='#prompt-textarea'?[element]:[],body:{innerText:''}};
  const win={location:{protocol:'https:',origin:'https://chatgpt.com',pathname:'/c/1',search:'?utm_source=x',hostname:'chatgpt.com'},innerHeight:800,getComputedStyle:()=>({display:'block',visibility:'visible',opacity:'1'}),Event:class{},InputEvent:class{}};
  const adapter=new DomAdapter(matchConfig('chatgpt.com'),{document:doc,window:win});
  assert.equal(adapter.findComposer(),element);
  assert.equal(adapter.getConversationKey(),'https://chatgpt.com/c/1');
});


test('unknown hosts are unsupported in production',()=>{const doc={querySelectorAll:()=>[],body:{innerText:''}};const win={location:{origin:'https://unknown.example',pathname:'/chat',search:'',hostname:'unknown.example'}};assert.equal(require('../src/content/adapters.js').createAdapter({document:doc,window:win}),null);});
test('smart start readiness does not require an enabled send button before writing',()=>{
  const composer={disabled:false,readOnly:false,hidden:false,tagName:'TEXTAREA',isContentEditable:false,value:'',getAttribute:(n)=>n==='placeholder'?'Message':null,getBoundingClientRect:()=>({top:500,left:0,right:400,bottom:540,width:400,height:40}),focus(){},dispatchEvent(){return true;}};
  const send={disabled:true,hidden:false,tagName:'BUTTON',type:'submit',getAttribute:(n)=>n==='aria-label'?'Send':null,getBoundingClientRect:()=>({top:500,left:420,right:470,bottom:540,width:50,height:40})};
  const assistant={disabled:false,hidden:false,tagName:'DIV',innerText:'Answer',textContent:'Answer',childElementCount:0,getAttribute:(n)=>n==='data-message-author-role'?'assistant':null,getBoundingClientRect:()=>({top:100,left:0,right:400,bottom:200,width:400,height:100})};
  attachMainRoot(composer,(selector)=>selector==='[data-testid="send-button"]'?[send]:selector==='[data-message-author-role="assistant"]'?[assistant]:selector==='__contains__'?[send,assistant]:[]);
  const doc={querySelectorAll(selector){if(selector==='#prompt-textarea')return[composer];return[];},body:{innerText:''}};
  const win={location:{protocol:'https:',origin:'https://chatgpt.com',pathname:'/c/1',search:'',hostname:'chatgpt.com'},innerHeight:800,getComputedStyle:()=>({display:'block',visibility:'visible',opacity:'1'}),Event:class{},InputEvent:class{},setTimeout};
  const adapter=new DomAdapter(matchConfig('chatgpt.com'),{document:doc,window:win});
  assert.equal(adapter.findSend(),null);
  assert.deepEqual(adapter.getSmartStartReadiness(),{ok:true});
});


test('adapter exposes a bounded latest assistant sample for language detection',()=>{
  const composer={disabled:false,readOnly:false,hidden:false,tagName:'TEXTAREA',isContentEditable:false,value:'',getAttribute:()=>null,getBoundingClientRect:()=>({top:500,left:0,right:400,bottom:540,width:400,height:40})};
  const assistant={disabled:false,hidden:false,tagName:'DIV',innerText:'A'.repeat(6000),textContent:'A'.repeat(6000),childElementCount:0,getAttribute:()=>null,getBoundingClientRect:()=>({top:100,left:0,right:400,bottom:200,width:400,height:100})};
  attachMainRoot(composer,(selector)=>selector==='[data-message-author-role="assistant"]'?[assistant]:selector==='__contains__'?[assistant]:[]);
  const doc={querySelectorAll(selector){if(selector==='#prompt-textarea')return[composer];return[];},body:{innerText:''}};
  const win={location:{protocol:'https:',origin:'https://chatgpt.com',pathname:'/c/1',search:'',hostname:'chatgpt.com'},innerHeight:800,getComputedStyle:()=>({display:'block',visibility:'visible',opacity:'1'})};
  const adapter=new DomAdapter(matchConfig('chatgpt.com'),{document:doc,window:win});
  assert.equal(adapter.getLatestAssistantText(4000).length,4000);
});


test('blocking safeguards detect visible usage-limit UI',()=>{
  const alert={disabled:false,hidden:false,tagName:'DIV',innerText:'You have reached your usage limit. Upgrade to continue.',textContent:'You have reached your usage limit. Upgrade to continue.',getBoundingClientRect:()=>({width:300,height:40}),getAttribute:()=>null};
  const doc={querySelectorAll(selector){return selector==='[role=alert]'?[alert]:[];}};
  const win={location:{origin:'https://chatgpt.com',pathname:'/c/1',search:'',hostname:'chatgpt.com'},getComputedStyle:()=>({display:'block',visibility:'visible',opacity:'1'})};
  const adapter=new DomAdapter(matchConfig('chatgpt.com'),{document:doc,window:win});
  assert.match(adapter.getBlockingState(),/limit/);
});

test('adapter rejects blocked non-chat page modes',()=>{const doc={querySelectorAll:()=>[],body:{innerText:''}};const win={location:{protocol:'https:',origin:'https://chatgpt.com',pathname:'/settings',search:'',hostname:'chatgpt.com'},getComputedStyle:()=>({display:'block',visibility:'visible',opacity:'1'})};const adapter=new DomAdapter(matchConfig('chatgpt.com'),{document:doc,window:win});assert.deepEqual(adapter.getPageReadiness(),{ok:false,reason:'unsupported_page_mode'});});

test('even strict composers must belong to a verified chat root',()=>{
  const composer={disabled:false,readOnly:false,hidden:false,tagName:'TEXTAREA',isContentEditable:false,value:'',getAttribute:()=>null,getBoundingClientRect:()=>({top:500,left:0,right:400,bottom:540,width:400,height:40}),closest:()=>null};
  const doc={querySelectorAll(selector){return selector==='#prompt-textarea'?[composer]:[];},body:{innerText:''}};
  const win={location:{protocol:'https:',origin:'https://chatgpt.com',pathname:'/c/1',search:'',hostname:'chatgpt.com'},innerHeight:800,getComputedStyle:()=>({display:'block',visibility:'visible',opacity:'1'})};
  const adapter=new DomAdapter(matchConfig('chatgpt.com'),{document:doc,window:win});
  assert.equal(adapter.findComposer(),null);
  assert.deepEqual(adapter.getPageReadiness(),{ok:false,reason:'unsupported_page_mode'});
});
