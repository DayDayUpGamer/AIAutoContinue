'use strict';
const fs=require('fs');const path=require('path');const cp=require('child_process');
const root=path.resolve(__dirname,'..');const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));const failures=[];
function walk(dir){const out=[];for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);e.isDirectory()?out.push(...walk(p)):out.push(p);}return out;}
for(const target of ['chrome','edge','firefox','safari']){
  const dir=path.join(root,'dist',target);const manifestPath=path.join(dir,'manifest.json');
  if(!fs.existsSync(manifestPath)){failures.push(`${target}: missing manifest`);continue;}
  const m=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
  if(m.manifest_version!==3)failures.push(`${target}: manifest_version`);
  if(m.version!==pkg.version)failures.push(`${target}: version mismatch`);
  for(const p of ['activeTab','scripting','storage'])if(!m.permissions.includes(p))failures.push(`${target}: missing ${p}`);
  for(const forbidden of ['<all_urls>','cookies','history','clipboardRead','clipboardWrite','webRequest','unlimitedStorage'])if(JSON.stringify(m).includes(forbidden))failures.push(`${target}: forbidden permission ${forbidden}`);
  for(const file of ['shared/platforms.js','shared/ui-i18n.js','content/prompt-language.js','content/core.js','content/adapters.js','content/entry.js','background/service-worker.js','popup/index.html','popup/prompt-settings.js','popup/publisher-link.js','options/index.html','options/options.js','icons/icon128.png'])if(!fs.existsSync(path.join(dir,file)))failures.push(`${target}: missing ${file}`);
  if(target==='firefox'&&!m.background.scripts)failures.push('firefox: background scripts missing');
  if(target!=='firefox'&&!m.background.service_worker)failures.push(`${target}: service worker missing`);
  if(target==='safari'&&!fs.existsSync(path.join(dir,'SAFARI_SOURCE_ONLY.txt')))failures.push('safari: source-only marker missing');
  for(const file of walk(dir).filter(f=>f.endsWith('.js'))){try{cp.execFileSync(process.execPath,['--check',file],{stdio:'pipe'});}catch(error){failures.push(`${target}: invalid JS ${path.relative(dir,file)}`);}}
  const productionText=walk(dir).filter(f=>/\.(js|json|html)$/.test(f)).map(f=>fs.readFileSync(f,'utf8')).join('\n');
  for(const forbiddenToken of ['allowGenericForTesting','generic-test','__AIAC_TEST_ALLOW_GENERIC__','AIAC_ACTIVE','__AIAC_LITE__'])if(productionText.includes(forbiddenToken))failures.push(`${target}: forbidden test/page-world token ${forbiddenToken}`);
}
const userscriptPath=path.join(root,'dist/userscript/ai-auto-continue-lite.user.js');
if(!fs.existsSync(userscriptPath))failures.push('userscript: missing build');
else{
  const source=fs.readFileSync(userscriptPath,'utf8');
  const version=(source.match(/^\/\/ @version\s+(.+)$/m)||[])[1];
  if(version!==pkg.version)failures.push(`userscript: version mismatch ${version||'missing'}`);
  if(source.includes('AIAC_PROBE'))failures.push('userscript: passive extension probing is not allowed');
}

const sourceUserscriptPath=path.join(root,'userscript/ai-auto-continue-lite.user.js');
const sourceUserscript=fs.readFileSync(sourceUserscriptPath,'utf8');
const sourceUserscriptVersion=(sourceUserscript.match(/^\/\/ @version\s+(.+)$/m)||[])[1];
if(sourceUserscriptVersion!==pkg.version)failures.push(`userscript source: version mismatch ${sourceUserscriptVersion||'missing'}`);
if(/AIAC_ACTIVE|__AIAC_LITE__|AIAC_PROBE/.test(sourceUserscript))failures.push('userscript source: page-visible coordination/probing is not allowed');

if(failures.length){console.error(failures.join('\n'));process.exit(1);}console.log('Static verification passed.');
