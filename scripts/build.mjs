import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {readFile,writeFile,mkdir,rm,copyFile} from 'node:fs/promises';
const testing = process.argv.includes('--rendering-test');
const lifecycle = process.argv.includes('--lifecycle-test');
const outdir = testing ? 'dist-rendering-test' : lifecycle ? 'dist-lifecycle-test' : 'dist';
await rm(outdir, {recursive:true,force:true});
await mkdir(outdir,{recursive:true});
const manifest=JSON.parse(await readFile('extension/manifest.json','utf8'));
if (lifecycle) manifest.host_permissions = ['*://127.0.0.1/*'];
if (testing) {
  manifest.host_permissions=['http://127.0.0.1/*'];
  manifest.background={service_worker:'worker.js'};
  manifest.content_scripts=[{matches:['http://127.0.0.1/*'],js:['rendering.js'],run_at:'document_idle',world:'ISOLATED'}];
  await copyFile('tests/extension/worker.js',`${outdir}/worker.js`);
}
await writeFile(`${outdir}/manifest.json`,JSON.stringify(manifest,null,2));
await copyFile('extension/popup.html',`${outdir}/popup.html`);
await copyFile('extension/popup.css',`${outdir}/popup.css`);
await mkdir(`${outdir}/icons`,{recursive:true});
for(const size of [16,32,48,128]) await copyFile(`extension/icons/icon-${size}.png`,`${outdir}/icons/icon-${size}.png`);
await build({entryPoints:['src/popup.js'],bundle:true,format:'iife',outfile:`${outdir}/popup.js`});
await copyFile('node_modules/darkreader/LICENSE',`${outdir}/DARKREADER-LICENSE.txt`);
// The API build unconditionally injects an optional page-world proxy. Remove that
// exact block, failing closed on upstream changes. MutationObserver support stays.
const source=await readFile('node_modules/darkreader/darkreader.mjs','utf8');
const start=source.indexOf('        const proxyScript = createOrUpdateScript("darkreader--proxy");');
const end=source.indexOf('        proxyScript.remove();',start);
if(start<0||end<0) throw Error('Review upstream proxy implementation before updating Dark Reader');
const block=source.slice(start,end+'        proxyScript.remove();'.length);
if (createHash('sha256').update(block).digest('hex') !== 'ab40b9d45e6db84e9c95935ace44ef948f832aef0b440d123a28126cc27e5e38' || source.indexOf('        const proxyScript = createOrUpdateScript("darkreader--proxy");',start+1)!==-1) throw Error('Upstream proxy block changed; review before patching');
const patched=source.slice(0,start)+source.slice(end+'        proxyScript.remove();'.length);
await build({entryPoints: testing ? {'rendering':'tests/extension/rendering-entry.js'} : {'background':'src/background.js','content':'src/content.js'},bundle:true,format:'iife',outdir,plugins:[{name:'isolated-darkreader',setup(b){b.onLoad({filter:/darkreader\.mjs$/},()=>({contents:patched,loader:'js'}));}}]});
