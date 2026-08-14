'use strict';
const fs=require('fs');const path=require('path');
const root=path.resolve(__dirname,'..');const failures=[];
function walk(dir){const out=[];if(!fs.existsSync(dir))return out;for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);e.isDirectory()?out.push(...walk(p)):out.push(p);}return out;}
const runtimeFiles=[...walk(path.join(root,'src')),...walk(path.join(root,'userscript'))].filter(f=>/\.(js|json|html)$/.test(f));
for(const file of runtimeFiles){const text=fs.readFileSync(file,'utf8');const rel=path.relative(root,file);
  if(/\beval\s*\(|new\s+Function\s*\(/.test(text))failures.push(`${rel}: dynamic code execution`);
  if(/https?:\/\/cdn\.|import\s*\(\s*['"]https?:/.test(text))failures.push(`${rel}: remote runtime code`);
  if(/selectors\.push\(element\.tagName\.toLowerCase\(\)\)/.test(text))failures.push(`${rel}: unsafe broad locator fallback`);
}
const publisherRuntime=fs.readFileSync(path.join(root,'src/popup/publisher-link.js'),'utf8')+fs.readFileSync(path.join(root,'src/popup/popup.js'),'utf8')+fs.readFileSync(path.join(root,'src/popup/index.html'),'utf8');
const allowedPublisherUrls=new Set(['https://muhook.com/']);
for(const match of publisherRuntime.matchAll(/https:\/\/[^\s\"'<>]+/g)){const url=match[0];if(!allowedPublisherUrls.has(url))failures.push(`publisher link: unapproved external URL ${url}`);}
if(/\bfetch\s*\(|XMLHttpRequest|sendBeacon/.test(publisherRuntime))failures.push('publisher link: network tracking or remote configuration is not allowed');
if(/[?&](utm_[a-z]+|ref|affiliate|aff_id)=/i.test(publisherRuntime))failures.push('publisher link: tracking or affiliate parameters are not allowed');

const popupHtml=fs.readFileSync(path.join(root,'src/popup/index.html'),'utf8');
const optionsHtml=fs.readFileSync(path.join(root,'src/options/index.html'),'utf8');
if(/<textarea|id="delayMs"|id="nativeContinueEnabled"/.test(popupHtml))failures.push('popup: low-frequency settings must stay out of the compact popup');
if(!popupHtml.includes('class="popup-footer"')||!popupHtml.includes('muhook.com · Find your next favorite song hook.'))failures.push('popup: compact publisher footer link missing');
if(!optionsHtml.includes('id="customPrompt"')||!optionsHtml.includes('id="nativeContinueEnabled"'))failures.push('options: full settings controls missing');

const refs=walk(path.join(root,'reference')).map(f=>path.relative(path.join(root,'reference'),f));
if(refs.length!==1||refs[0]!=='README.md')failures.push('reference/: third-party source must not be redistributed');
const adapters=fs.readFileSync(path.join(root,'src/content/adapters.js'),'utf8');
if(!/supportLevel:'beta'/.test(adapters))failures.push('adapters: uncertified platforms must be beta');
if(/supportLevel:'stable'/.test(adapters))failures.push('adapters: stable label requires live certification');
const entry=fs.readFileSync(path.join(root,'src/content/entry.js'),'utf8');
const popup=fs.readFileSync(path.join(root,'src/popup/popup.js'),'utf8')+fs.readFileSync(path.join(root,'src/popup/index.html'),'utf8');
if(!entry.includes("manual_send"))failures.push('runtime: manual send protection missing');
if(!entry.includes("manual_send_keyboard"))failures.push('runtime: keyboard send protection missing');
if(!entry.includes("internalActionToken")||!entry.includes("isInternalSubmitEvent"))failures.push('runtime: internal programmatic submit protection missing');
if(!popup.includes('startFollowUps')||!popup.includes('currentPlatform')||!popup.includes('messageSummary'))failures.push('popup: compact per-run count, recipient, or message summary missing');
if(!adapters.includes('usage limit')||!adapters.includes('quota exceeded'))failures.push('runtime: AI usage-limit safeguard detection missing');
if(!entry.includes("promptResolutionPending"))failures.push('runtime: deferred auto-language resolution missing');
if(entry.includes('AIAC_PROBE'))failures.push('runtime: passive installed-extension probe must not be exposed');
if(/AIAC_ACTIVE|postMessage\s*\(/.test(entry))failures.push('runtime: page-world extension activity broadcast must not ship');
if(/START_BINDING|BindingRecorder|aiac_binding:|isSafeBinding/.test(entry))failures.push('runtime: user-binding workflow must not ship');
if(/bindingToConfig|supportLevel:'binding'/.test(adapters))failures.push('adapters: user-binding adapter must not ship');
if(!adapters.includes('return null'))failures.push('adapters: unknown sites must be unsupported in production');
if(/allowGenericForTesting|generic-test|__AIAC_TEST_ALLOW_GENERIC__/.test(adapters))failures.push('adapters: test-only generic adapter logic must not ship in production source');
if(!adapters.includes('getPageReadiness')||!adapters.includes('composerStrict')||!adapters.includes('composerFallback')||!adapters.includes('getControlScope'))failures.push('adapters: hardened page/composer/control scoping is missing');
if(/\.endsWith\(\s*`\.\$\{host\}`\s*\)/.test(adapters))failures.push('adapters: arbitrary subdomains must not inherit support');
const platforms=fs.readFileSync(path.join(root,'src/shared/platforms.js'),'utf8');
if(/\.endsWith\(\s*`\.\$\{host\}`\s*\)/.test(platforms))failures.push('platforms: arbitrary subdomains must not inherit support');
if(!platforms.includes('pageModeForUrl')||!platforms.includes('BLOCKED_PATH'))failures.push('platforms: supported page-mode gate missing');
const userscript=fs.readFileSync(path.join(root,'userscript/ai-auto-continue-lite.user.js'),'utf8');
if(/AIAC_ACTIVE|__AIAC_LITE__|AIAC_PROBE/.test(userscript))failures.push('userscript: page-visible extension coordination/probing must not ship');
const sourceUserscriptVersion=(userscript.match(/^\/\/ @version\s+(.+)$/m)||[])[1];
const packageVersion=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8')).version;
if(sourceUserscriptVersion!==packageVersion)failures.push(`userscript: source version mismatch ${sourceUserscriptVersion||'missing'} != ${packageVersion}`);
const background=fs.readFileSync(path.join(root,'src/background/service-worker.js'),'utf8');
if(!background.includes('unsupported_site')||!background.includes('purgeLegacyBindings'))failures.push('background: support gate or legacy binding cleanup missing');
for(const file of walk(root))if(/(^|[\/])__pycache__([\/]|$)|\.pyc$/.test(file))failures.push(`source package: generated Python cache ${path.relative(root,file)}`);
if(failures.length){console.error(failures.join('\n'));process.exit(1);}console.log('Security and release audit passed.');
