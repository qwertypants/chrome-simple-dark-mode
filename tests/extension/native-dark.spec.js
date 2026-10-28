import {test, expect, chromium} from '@playwright/test';
import {createServer} from 'node:http';
import {mkdtemp, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';

test('native themes, mixed headers, dynamic SPA content and bounded large pages', async () => {
 const server=createServer((req,res)=>{res.setHeader('Content-Type','text/html');res.end(`<html><head><style>
 html,body{margin:0;min-height:100%;background:white;color:black} body{background:transparent}
 html.dark,html[data-bs-theme="dark"]{background:rgb(18,18,18);color:rgb(230,230,230)}html.dark body,html[data-bs-theme="dark"] body{color:inherit}
 header{height:60px;background:#111;color:#eee}html.dark header,html[data-bs-theme="dark"] header{background:white;color:black}
 main{height:1200px} </style></head><body><header>Opposite header</header><main>Article text</main></body></html>`);});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const profile=await mkdtemp(path.join(tmpdir(),'native-dark-'));
 const extension=path.resolve('dist-lifecycle-test');
 let context;
 try {
 context=await chromium.launchPersistentContext(profile,{channel:'chromium',headless:true,args:[`--disable-extensions-except=${extension}`,`--load-extension=${extension}`]});
 const worker=context.serviceWorkers()[0]||await context.waitForEvent('serviceworker');
 const page=await context.newPage();await page.goto(`http://127.0.0.1:${server.address().port}/`);
 const id=await worker.evaluate(async()=> (await chrome.tabs.query({})).find(t=>t.url?.startsWith('http://127.0.0.1')).id);
 const control=await context.newPage();await control.goto(`chrome-extension://${new URL(worker.url()).host}/manifest.json`);
 const state=enabled=>control.evaluate(({id,enabled})=>chrome.runtime.sendMessage({type:enabled===undefined?'site:state':'site:set',tabId:id,hostname:'127.0.0.1',enabled}),{id,enabled});
 expect((await state(true)).status).toBe('on');
 await expect.poll(()=>page.locator('body').evaluate(el=>getComputedStyle(el).color)).not.toBe('rgb(0, 0, 0)');
 await page.evaluate(()=>{document.documentElement.classList.add('dark');history.pushState({},'', '/spa');});
 await expect.poll(async()=> (await state()).status).toBe('already-dark');
 expect((await state()).enabled).toBe(true);
 expect(await page.locator('.darkreader').count()).toBe(0);
 expect(await page.locator('html').evaluate(el=>getComputedStyle(el).backgroundColor)).toBe('rgb(18, 18, 18)');
 await page.evaluate(()=>document.documentElement.classList.remove('dark'));
 await expect.poll(async()=> (await state()).status).toBe('on');
 await page.evaluate(()=>document.documentElement.setAttribute('data-bs-theme','dark'));
 await expect.poll(async()=> (await state()).status).toBe('already-dark');
 // Keep delivering relevant events faster than 120ms: the deadline must still fire.
 await page.evaluate(()=>{
   window.busy=setInterval(()=>{document.documentElement.setAttribute('data-clock',String(Date.now()));dispatchEvent(new PopStateEvent('popstate'));},60);
   document.documentElement.setAttribute('data-bs-theme','light');
 });
 await expect.poll(async()=> (await state()).status,{timeout:2000}).toBe('on');
 await page.evaluate(()=>clearInterval(window.busy));
 const insertedAt=Date.now();
 await page.evaluate(()=>{const host=document.createElement('section');host.attachShadow({mode:'open'}).innerHTML='<style>p{background:white;color:black}</style><p>Shadow text</p>';document.body.prepend(host);const frame=document.createElement('iframe');frame.src='http://localhost:'+location.port+'/';document.body.append(frame);const fragment=document.createDocumentFragment();for(let i=0;i<10000;i++){const p=document.createElement('p');p.textContent='Late content '+i;fragment.append(p);}document.body.append(fragment);});
 await expect.poll(()=>page.locator('section').locator('p').evaluate(el=>getComputedStyle(el).backgroundColor)).toBe('rgb(24, 26, 27)');
 const untouched=page.frames().find(f=>f.url().startsWith('http://localhost'));
 expect(await untouched.locator('.darkreader').count()).toBe(0);
 // Stable DOM ownership over an idle interval rules out repeated disable/re-enable loops.
 await page.waitForTimeout(500);
 console.log('Enabled 10k insertion and settling ms:',Date.now()-insertedAt);
 await page.evaluate(()=>{const clock=document.createElement('div');document.body.append(clock);window.clock=setInterval(()=>{clock.textContent=String(Date.now());const span=document.createElement('span');span.textContent='tick';clock.append(span);},160);});
 await page.waitForTimeout(300);
 const stable=await page.evaluate(async()=>{const node=document.querySelector('.darkreader');await new Promise(r=>setTimeout(r,700));return node===document.querySelector('.darkreader');});expect(stable).toBe(true);
 await page.evaluate(()=>clearInterval(window.clock));
 await state(false);expect(await page.locator('.darkreader').count()).toBe(0);
 const disabledAt=Date.now();
 await page.evaluate(()=>{const f=document.createDocumentFragment();for(let i=0;i<10000;i++)f.append(document.createElement('p'));document.body.append(f);});
 console.log('Disabled 10k insertion ms:',Date.now()-disabledAt);
 await page.waitForTimeout(200);expect(await page.locator('.darkreader').count()).toBe(0);
 await state(true);await page.reload();await expect.poll(()=>page.locator('.darkreader').count()).toBeGreaterThan(0);
 }finally{await context?.close();await rm(profile,{recursive:true,force:true});await new Promise(r=>server.close(r));}
});
