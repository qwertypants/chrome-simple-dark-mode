import {build} from 'esbuild';
import {readFile,writeFile,mkdir,rm,copyFile} from 'node:fs/promises';
await rm('dist', {recursive:true,force:true});
await mkdir('dist',{recursive:true});
const manifest=JSON.parse(await readFile('extension/manifest.json','utf8'));
manifest.host_permissions=['http://127.0.0.1/*'];
manifest.background={service_worker:'worker.js'};
manifest.content_scripts=[{matches:['http://127.0.0.1/*'],js:['rendering.js'],run_at:'document_idle',world:'ISOLATED'}];
await writeFile('dist/manifest.json',JSON.stringify(manifest,null,2));
await copyFile('tests/extension/worker.js','dist/worker.js');
await copyFile('node_modules/darkreader/LICENSE','dist/DARKREADER-LICENSE.txt');
// The API build unconditionally injects an optional page-world proxy. Remove that
// exact block, failing closed on upstream changes. MutationObserver support stays.
const source=await readFile('node_modules/darkreader/darkreader.mjs','utf8');
const start=source.indexOf('        const proxyScript = createOrUpdateScript("darkreader--proxy");');
const end=source.indexOf('        proxyScript.remove();',start);
if(start<0||end<0) throw Error('Review upstream proxy implementation before updating Dark Reader');
const patched=source.slice(0,start)+source.slice(end+'        proxyScript.remove();'.length);
await build({entryPoints:['tests/extension/rendering-entry.js'],bundle:true,format:'iife',outfile:'dist/rendering.js',plugins:[{name:'isolated-darkreader',setup(b){b.onLoad({filter:/darkreader\.mjs$/},()=>({contents:patched,loader:'js'}));}}]});
