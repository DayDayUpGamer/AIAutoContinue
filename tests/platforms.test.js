const test=require('node:test');
const assert=require('node:assert/strict');
const core=require('../src/content/core.js');
global.AIACCore=core;
const platforms=require('../src/shared/platforms.js');
const adapters=require('../src/content/adapters.js');

test('built-in registry matches the twelve adapter ids and hosts',()=>{
  assert.equal(platforms.PLATFORMS.length,12);
  assert.deepEqual(platforms.PLATFORMS.map(x=>x.id),adapters.PLATFORM_CONFIGS.map(x=>x.id));
  for(const platform of platforms.PLATFORMS){
    const config=adapters.PLATFORM_CONFIGS.find(x=>x.id===platform.id);
    assert.deepEqual(platform.hosts,config.hosts);
  }
});
test('only HTTPS built-in AI hosts are supported',()=>{
  assert.equal(platforms.isSupportedUrl('https://chatgpt.com/c/1'),true);
  assert.equal(platforms.isSupportedUrl('https://sub.chatgpt.com/c/1'),false);
  assert.equal(platforms.isSupportedUrl('http://chatgpt.com/c/1'),false);
  assert.equal(platforms.isSupportedUrl('https://unknown.example/chat'),false);
  assert.equal(platforms.isSupportedUrl('chrome://extensions'),false);
  assert.equal(platforms.pageModeForUrl('https://chatgpt.com/settings').reason,'unsupported_page_mode');
  assert.equal(platforms.isPotentialChatUrl('https://chatgpt.com/c/1'),true);
});
