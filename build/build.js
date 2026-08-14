'use strict';
const fs=require('fs');const path=require('path');
const root=path.resolve(__dirname,'..');const dist=path.join(root,'dist');
function rm(p){fs.rmSync(p,{recursive:true,force:true});}function mkdir(p){fs.mkdirSync(p,{recursive:true});}function readJson(p){return JSON.parse(fs.readFileSync(p,'utf8'));}
function merge(a,b){if(Array.isArray(a)||Array.isArray(b))return b===undefined?a:b;const o={...(a||{})};for(const[k,v]of Object.entries(b||{}))o[k]=v&&typeof v==='object'&&!Array.isArray(v)?merge(o[k],v):v;return o;}
function copyDir(src,dst){mkdir(dst);for(const entry of fs.readdirSync(src,{withFileTypes:true})){const s=path.join(src,entry.name),d=path.join(dst,entry.name);entry.isDirectory()?copyDir(s,d):fs.copyFileSync(s,d);}}
if(process.argv.includes('--clean')){rm(dist);process.exit(0);}rm(dist);mkdir(dist);
const pkg=readJson(path.join(root,'package.json'));const base=readJson(path.join(root,'manifest/base.json'));base.version=pkg.version;
for(const target of ['chrome','edge','firefox','safari']){
  const out=path.join(dist,target);mkdir(out);
  const override=readJson(path.join(root,`manifest/${target==='chrome'?'chromium':target}.override.json`));
  const manifest=merge(base,override);if(target==='firefox'||target==='safari')delete manifest.minimum_chrome_version;
  fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify(manifest,null,2));
  copyDir(path.join(root,'src/shared'),path.join(out,'shared'));
  copyDir(path.join(root,'src/content'),path.join(out,'content'));
  copyDir(path.join(root,'src/background'),path.join(out,'background'));
  copyDir(path.join(root,'src/popup'),path.join(out,'popup'));
  copyDir(path.join(root,'src/options'),path.join(out,'options'));
  copyDir(path.join(root,'src/_locales'),path.join(out,'_locales'));
  copyDir(path.join(root,'src/icons'),path.join(out,'icons'));
  if(target==='safari')fs.writeFileSync(path.join(out,'SAFARI_SOURCE_ONLY.txt'),'This is Safari Web Extension source material. Convert and sign it with Xcode before distribution.\n');
}
const users=path.join(dist,'userscript');mkdir(users);
const userscriptSource=fs.readFileSync(path.join(root,'userscript/ai-auto-continue-lite.user.js'),'utf8')
  .replace(/^\/\/ @version\s+.*$/m,`// @version      ${pkg.version}`);
fs.writeFileSync(path.join(users,'ai-auto-continue-lite.user.js'),userscriptSource);
console.log('Built targets:',fs.readdirSync(dist).join(', '));
