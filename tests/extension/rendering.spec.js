import {test,expect,chromium} from '@playwright/test';
import {createServer} from 'node:http';
import {readFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';

test('installed isolated engine renders, preserves media, and cleans up',async({},testInfo)=>{
 const server=createServer(async(req,res)=>{try{const name=new URL(req.url,'http://local').pathname;res.setHeader('Content-Type',name.endsWith('.webm')?'video/webm':name.endsWith('.png')?'image/png':name.endsWith('.svg')?'image/svg+xml':'text/html');res.end(await readFile(path.resolve('tests/fixtures',name==='/'?'rendering.html':name.slice(1))));}catch{res.statusCode=404;res.end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const profile=await mkdtemp(path.join(tmpdir(),'darkmode-render-'));
 const extension=path.resolve('dist-rendering-test');
 const context=await chromium.launchPersistentContext(profile,{channel:'chromium',headless:true,args:[`--disable-extensions-except=${extension}`,`--load-extension=${extension}`]});
 try{
 const worker=context.serviceWorkers()[0]||await context.waitForEvent('serviceworker');
 const page=await context.newPage();const requests=[];page.on('request',r=>requests.push(r.url()));
 await page.route('https://external.invalid/**',route=>route.fulfill({contentType:'text/css',body:'.external {background:#fff;color:#111}'}));
 await page.addInitScript(()=>{window.proxyScripts=[];new MutationObserver(ms=>{for(const m of ms)for(const n of m.addedNodes)if(n.nodeName==='SCRIPT'&&n.className?.includes('darkreader'))window.proxyScripts.push(n.textContent);}).observe(document,{childList:true,subtree:true});});
 const send=async(enabled)=>worker.evaluate(async(enabled)=>{const tabs=await chrome.tabs.query({});const tab=tabs.find(t=>t.url?.startsWith('http://127.0.0.1'));return chrome.tabs.sendMessage(tab.id,{type:'rendering-test',enabled});},enabled);
 for(const mode of ['light','dark','transparent']){
 await page.goto(`http://127.0.0.1:${server.address().port}/?mode=${mode}`);
 await page.evaluate(()=>{const link=document.createElement('link');link.rel='stylesheet';link.href='https://external.invalid/site.css';document.head.append(link);});
 await page.waitForTimeout(150);
 expect(await page.evaluate(()=>{try {return [...document.styleSheets].find(s=>s.href?.includes('external.invalid')).cssRules.length;} catch(error) {return error.name;}})).toBe('SecurityError');
 const externalBefore=requests.filter(url=>url.startsWith('https://external.invalid')).length;
 const snapshot=()=>page.evaluate(()=>{const selectors=['body','h1','input','.dark','img','video'];return selectors.map(s=>{const c=getComputedStyle(document.querySelector(s));return [s,c.backgroundColor,c.color,c.filter];});});
 const before=await snapshot();
 await page.locator('video').evaluate(async el=>{await el.play();el.pause();el.currentTime=0.25;await new Promise(r=>el.addEventListener('seeked',r,{once:true}));});
 const mediaShot=async selector=>{const b=await page.locator(selector).boundingBox();return page.screenshot({clip:{x:Math.ceil(b.x)+2,y:Math.ceil(b.y)+2,width:216,height:136}});};
 const imageBefore=await mediaShot('img');const videoBefore=await mediaShot('video');
 await page.screenshot({path:testInfo.outputPath(`${mode}-before.png`)});
 await send(true);await page.waitForTimeout(350);
 if(mode==='light')expect((await snapshot())[0][1]).not.toBe(before[0][1]);
 expect(await mediaShot('img')).toEqual(imageBefore);expect(await page.locator('img').evaluate(el=>getComputedStyle(el).filter)).toBe('none');
 expect(await mediaShot('video')).toEqual(videoBefore);
 expect(await page.locator('video').evaluate(el=>getComputedStyle(el).filter)).toBe('none');
 expect(await page.locator('input').evaluate(el=>getComputedStyle(el).backgroundColor)).toBe('rgb(24, 26, 27)');
 await page.evaluate(()=>window.insertDynamic());
 await expect.poll(()=>page.locator('.late').evaluate(el=>getComputedStyle(el).backgroundColor)).toBe('rgb(24, 26, 27)');
 await expect.poll(()=>page.locator('#shadow').evaluate(el=>getComputedStyle(el.shadowRoot.querySelector('p')).backgroundColor)).toBe('rgb(24, 26, 27)');
 await page.screenshot({path:testInfo.outputPath(`${mode}-enabled.png`)});
 expect(requests.filter(url=>url.startsWith('https://external.invalid')).length).toBe(externalBefore);
 const cleanup=await send(false);expect(cleanup.activeObservers).toBe(0);await page.waitForTimeout(200);
 expect(await snapshot()).toEqual(before);
 expect(await page.locator('.darkreader').evaluateAll(els=>els.map(el=>el.outerHTML))).toEqual([]);
 expect(await page.locator('#shadow').evaluate(el=>el.shadowRoot.querySelectorAll('.darkreader').length)).toBe(0);
 expect(await page.evaluate(()=>window.proxyScripts)).toEqual([]);
 await page.evaluate(()=>{window.insertDynamic();document.body.style.color='rgb(33, 44, 55)';});
 await page.waitForTimeout(150);
 expect(await page.locator('.darkreader').evaluateAll(els=>els.map(el=>el.outerHTML))).toEqual([]);
 expect(await page.locator('body').evaluate(el=>getComputedStyle(el).color)).toBe('rgb(33, 44, 55)');
 await page.screenshot({path:testInfo.outputPath(`${mode}-disabled.png`)});
 }
 expect(requests.every(url=>url.startsWith(`http://127.0.0.1:${server.address().port}/`)||url==='https://external.invalid/site.css')).toBe(true);
 await testInfo.attach('browser',{body:context.browser().version(),contentType:'text/plain'});
 }finally{await context.close();await rm(profile,{recursive:true,force:true});await new Promise(r=>server.close(r));}
});
