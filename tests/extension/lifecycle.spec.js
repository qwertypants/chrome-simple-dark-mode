import {test, expect, chromium} from '@playwright/test';
import {createServer} from 'node:http';
import {mkdtemp, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';

test('pre-granted lifecycle survives browser and worker restart and cleans tabs', async () => {
 const server=createServer((req,res)=>{res.setHeader('Content-Type','text/html');res.end('<html><head><style>body {background:white;color:black}</style></head><body><h1>Lifecycle fixture</h1></body></html>');});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const profile=await mkdtemp(path.join(tmpdir(),'darkmode-lifecycle-'));
 const extension=path.resolve('dist-lifecycle-test');
 const options={channel:'chromium',headless:true,args:[`--disable-extensions-except=${extension}`,`--load-extension=${extension}`]};
 let context;
 const launch=async()=>{context=await chromium.launchPersistentContext(profile,options);return context.serviceWorkers()[0]||await context.waitForEvent('serviceworker');};
 try {
 let worker=await launch();
 const url=`http://127.0.0.1:${server.address().port}/`;
 let page=await context.newPage();await page.goto(url);
 const tabId=await worker.evaluate(async()=> (await chrome.tabs.query({})).find(t=>t.url?.startsWith('http://127.0.0.1'))?.id);
 const id=tabId;
 const extensionId=new URL(worker.url()).host;
 const control=await context.newPage();await control.goto(`chrome-extension://${extensionId}/manifest.json`);
 const state=async(enabled, selected=id)=>control.evaluate(async({id,enabled})=>chrome.runtime.sendMessage({type:enabled===undefined?'site:state':'site:set',tabId:id,hostname:'127.0.0.1',enabled}),{id:selected,enabled});
 expect((await state(true)).enabled).toBe(true);
 await expect.poll(()=>page.locator('body').evaluate(el=>getComputedStyle(el).backgroundColor)).toBe('rgb(24, 26, 27)');
 await page.reload();await expect.poll(()=>page.locator('.darkreader').count()).toBeGreaterThan(0);
 const unrelated=await context.newPage();await unrelated.goto(url.replace('127.0.0.1','localhost'));
 expect(await unrelated.locator('.darkreader').count()).toBe(0);
 const second=await context.newPage();await second.goto(url);
 await expect.poll(()=>second.locator('.darkreader').count()).toBeGreaterThan(0);
 await Promise.all([state(false),state(true),state(false),state(true)]);
 expect((await state()).enabled).toBe(true);
 await context.close();worker=await launch();
 page=await context.newPage();await page.goto(url);
 await expect.poll(()=>page.locator('.darkreader').count()).toBeGreaterThan(0);
 const control2=await context.newPage();await control2.goto(`chrome-extension://${extensionId}/manifest.json`);
 const currentId=await worker.evaluate(async()=> (await chrome.tabs.query({})).find(t=>t.url?.startsWith('http://127.0.0.1')).id);
 const state2=enabled=>control2.evaluate(async({id,enabled})=>chrome.runtime.sendMessage({type:enabled===undefined?'site:state':'site:set',tabId:id,hostname:'127.0.0.1',enabled}),{id:currentId,enabled});
 // Stop the worker through CDP, then wake it using the production read protocol.
 const cdp=await context.newCDPSession(control2);await cdp.send('ServiceWorker.enable');
 await cdp.send('ServiceWorker.stopAllWorkers');
 expect((await state2()).enabled).toBe(true);
 const restartedSecond=await context.newPage();await restartedSecond.goto(url);
 await expect.poll(()=>restartedSecond.locator('.darkreader').count()).toBeGreaterThan(0);
 await state2(false);
 for(const tab of context.pages().filter(p=>p.url().startsWith(url))) await expect.poll(()=>tab.locator('.darkreader').count()).toBe(0);
 expect(await control2.evaluate(()=>chrome.scripting.getRegisteredContentScripts())).toEqual([]);

 } finally {await context?.close();await rm(profile,{recursive:true,force:true});await new Promise(r=>server.close(r));}
});
