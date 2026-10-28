import {test,expect,chromium} from '@playwright/test';
import {createServer} from 'node:http';
import {readFile,mkdtemp,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';

test('production content colors meet measured fixture AA contrast',async({},info)=>{
 const server=createServer(async(req,res)=>{res.setHeader('Content-Type','text/html');res.end(await readFile('tests/fixtures/contrast.html'));});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const profile=await mkdtemp(path.join(tmpdir(),'contrast-'));
 const extension=path.resolve('dist-lifecycle-test');
 const context=await chromium.launchPersistentContext(profile,{channel:'chromium',headless:true,args:[`--disable-extensions-except=${extension}`,`--load-extension=${extension}`]});
 try{
 const worker=context.serviceWorkers()[0]||await context.waitForEvent('serviceworker');
 const page=await context.newPage();await page.goto(`http://127.0.0.1:${server.address().port}/`);
 const tabId=await worker.evaluate(async()=> (await chrome.tabs.query({})).find(t=>t.url?.startsWith('http://127.0.0.1')).id);
 const control=await context.newPage();await control.goto(`chrome-extension://${new URL(worker.url()).host}/manifest.json`);
 const set=enabled=>control.evaluate(({tabId,enabled})=>chrome.runtime.sendMessage({type:'site:set',tabId,hostname:'127.0.0.1',enabled}),{tabId,enabled});
 await set(true);await expect.poll(()=>page.locator('.darkreader').count()).toBeGreaterThan(0);await page.waitForTimeout(400);
 await page.locator('button').focus();
 const measurements=await page.evaluate(()=>{
 const rgba=s=>{const n=s.match(/[\d.]+/g).map(Number);return [...n.slice(0,3),n[3]??1];};
 const over=(f,b)=>[...f.slice(0,3).map((v,i)=>v*f[3]+b[i]*(1-f[3])),1];
 const bg=el=>{const chain=[];for(let n=el;n;n=n.parentElement)chain.unshift(n);return chain.reduce((b,n)=>over(rgba(getComputedStyle(n).backgroundColor),b),[255,255,255,1]);};
 const lum=c=>c.slice(0,3).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;}).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);
 const ratio=(a,b)=>(Math.max(lum(a),lum(b))+.05)/(Math.min(lum(a),lum(b))+.05);
 const rows=['h1','#article','a','.red','.green','.purple','input','input[placeholder]','button','code','nav','dialog'].map(selector=>{const el=document.querySelector(selector);const style=getComputedStyle(el,selector==='input[placeholder]'?'::placeholder':null);const background=bg(el);return {selector,foreground:style.color,background,ratio:ratio(over(rgba(style.color),background),background),minimum:selector==='h1'?3:4.5};});
 const button=document.querySelector('button');const c=getComputedStyle(button);rows.push({selector:'button focus outline',foreground:c.outlineColor,background:bg(button.parentElement),ratio:ratio(rgba(c.outlineColor),bg(button.parentElement)),minimum:3});
 rows.push({selector:'input boundary',ratio:ratio(rgba(getComputedStyle(document.querySelector('input')).borderTopColor),bg(document.querySelector('input').parentElement)),minimum:3});return rows;
 });
 await writeFile(info.outputPath('computed-contrast.json'),JSON.stringify(measurements,null,2));
 await info.attach('computed-contrast.json',{body:JSON.stringify(measurements,null,2),contentType:'application/json'});
 for(const row of measurements)expect(row.ratio,JSON.stringify(row)).toBeGreaterThanOrEqual(row.minimum);
 await set(false);await expect.poll(()=>page.locator('.darkreader').count()).toBe(0);
 }finally{await context.close();await rm(profile,{recursive:true,force:true});await new Promise(r=>server.close(r));}
});
