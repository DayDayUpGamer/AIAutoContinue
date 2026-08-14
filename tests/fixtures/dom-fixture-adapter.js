(function initAIACFixture(root) {
  'use strict';
  const config = Object.freeze({
    id:'fixture', name:'Test fixture', supportLevel:'test-only', hosts:[],
    chatRoot:['.chat','main','[role="main"]','form'],
    composerStrict:['textarea','[contenteditable="true"]'], composerFallback:[],
    send:['button[type="submit"]','button[aria-label="Send"]'],
    stop:['button[aria-label="Stop"]'], assistant:['[data-role="assistant"]'], user:['[data-role="user"]'],
    native:['button[aria-label="Continue generating"]','button[aria-label="继续生成"]']
  });
  class FixtureAdapter extends root.AIACAdapters.DomAdapter {
    getPageReadiness() { return { ok:true, reason:null }; }
  }
  root.AIACFixture = {
    config,
    create(env = {}) { return new FixtureAdapter(config, { document:env.document || document, window:env.window || window }); }
  };
  if (typeof module === 'object' && module.exports) module.exports = root.AIACFixture;
})(typeof globalThis !== 'undefined' ? globalThis : this);
