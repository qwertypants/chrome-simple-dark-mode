import {test,expect,chromium} from '@playwright/test';
import {createServer} from 'node:http';
import {mkdtemp,rm,mkdir,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';

test('loaded popup: keyboard, saved state, protected pages, denial and computed contrast',async()=>{
 const server=createServer(async(req,res)=>{if(req.url==='/document'){res.setHeader('Content-Type','application/pdf');res.end(await readFile('tests/fixtures/protected.pdf'));return;}res.setHeader('Content-Type','text/html');res.end('<style>body{background:white;color:black}</style><h1>Popup fixture</h1>');});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const profile=await mkdtemp(path.join(tmpdir(),'shade-popup-'));const extension=path.resolve('dist-lifecycle-test');
 const context=await chromium.launchPersistentContext(profile,{channel:'chromium',headless:true,args:[`--disable-extensions-except=${extension}`,`--load-extension=${extension}`]});
 try {
 const worker=context.serviceWorkers()[0]||await context.waitForEvent('serviceworker');const id=new URL(worker.url()).host;
 const target=await context.newPage();await target.goto(`http://127.0.0.1:${server.address().port}`);
 const tab=await worker.evaluate(async()=> (await chrome.tabs.query({})).find(t=>t.url?.startsWith('http://127.0.0.1')));
 const popup=await context.newPage();
 // Opening the actual action document as a tab would otherwise select itself.
 await popup.addInitScript(tab=>{chrome.tabs.query=async()=>[tab];},tab);
 await popup.goto(`chrome-extension://${id}/popup.html`);
 const toggle=popup.getByRole('checkbox',{name:'Dark mode'});await expect(toggle).toBeEnabled();await expect(toggle).not.toBeChecked();
 const contrast=async label=>{
  const values=await popup.evaluate(()=>{
   const rgb=s=>s.match(/[\d.]+/g).slice(0,3).map(Number);
   const lum=c=>rgb(c).map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((n,v,i)=>n+v*[.2126,.7152,.0722][i],0);
   const ratio=(a,b)=>(Math.max(lum(a),lum(b))+.05)/(Math.min(lum(a),lum(b))+.05);
   const bg=getComputedStyle(document.body).backgroundColor;
   const text=[...document.querySelectorAll('h1,#hostname,.control>span:first-child,#status')].map(e=>ratio(getComputedStyle(e).color,bg));
   const s=getComputedStyle(document.querySelector('.switch'));const thumb=getComputedStyle(document.querySelector('.switch'),'::after');
   return {text,edge:ratio(s.borderTopColor,bg),thumb:ratio(thumb.backgroundColor,s.backgroundColor),focus:ratio(s.outlineColor,bg)};
  });
  for(const value of values.text)expect(value,label).toBeGreaterThanOrEqual(4.5);expect(values.edge,label).toBeGreaterThanOrEqual(3);expect(values.thumb,label).toBeGreaterThanOrEqual(3);console.log(label,values);return values;
 };
 await contrast('off');await popup.keyboard.press('Tab');await expect(toggle).toBeFocused();expect((await contrast('focus')).focus).toBeGreaterThanOrEqual(3);
 await popup.keyboard.press('Space');await expect(toggle).toBeChecked();await expect(popup.getByRole('status')).toContainText('On ·');await contrast('on');
 await mkdir('test-results/popup-evidence',{recursive:true});await popup.locator('main').screenshot({path:'test-results/popup-evidence/on.png'});
 await target.evaluate(()=>{document.documentElement.style.background='#15191d';document.body.style.minHeight='100vh';document.body.style.background='#15191d';document.body.style.color='#eeeeee';});
 await expect.poll(async()=>{await popup.reload();return popup.getByRole('status').textContent();}).toContain('Already dark');await expect(toggle).toBeChecked();await contrast('already dark');
 await popup.locator('main').screenshot({path:'test-results/popup-evidence/already-dark.png'});
 const other=await context.newPage();await other.goto(`chrome-extension://${id}/manifest.json`);await other.evaluate(async tab=>chrome.runtime.sendMessage({type:'site:set',tabId:tab.id,hostname:'127.0.0.1',enabled:false}),tab);
 await popup.reload();await expect(toggle).not.toBeChecked();
 await popup.evaluate(()=>{chrome.permissions.request=()=>new Promise(resolve=>{window.deny=resolve;});});await toggle.click();await expect(toggle).toBeDisabled();await contrast('pending');await popup.evaluate(()=>window.deny(false));await expect(popup.getByRole('status')).toContainText('Access needed');await expect(toggle).not.toBeChecked();await contrast('denial');
 await popup.evaluate(()=>{chrome.permissions.request=async()=>{throw Error('failure');};});await toggle.click();await expect(toggle).not.toBeChecked();
 await popup.evaluate(()=>{chrome.permissions.request=async()=>true;const real=chrome.runtime.sendMessage;chrome.runtime.sendMessage=message=>message.type==='site:set'?Promise.reject(Error('fixture failure')):real(message);});await toggle.click();await expect(popup.getByRole('status')).toContainText('Could not update');await expect(toggle).not.toBeChecked();await contrast('operation failed');
 await popup.locator('main').screenshot({path:'test-results/popup-evidence/failure.png'});
 const protectedTarget=await context.newPage();await protectedTarget.goto('chrome://settings/');
 const protectedTab=await worker.evaluate(async()=> (await chrome.tabs.query({active:true,currentWindow:true}))[0]);expect(protectedTab).toBeTruthy();
 const protectedPopup=await context.newPage();await protectedPopup.addInitScript(tab=>{chrome.tabs.query=async()=>[tab];},protectedTab);await protectedPopup.goto(`chrome-extension://${id}/popup.html`);await expect(protectedPopup.getByRole('checkbox')).toBeDisabled();await expect(protectedPopup.getByRole('status')).not.toBeEmpty();
 const pdf=await context.newPage();await pdf.goto(`http://127.0.0.1:${server.address().port}/document`);
 const pdfTab=await worker.evaluate(async()=> (await chrome.tabs.query({})).find(t=>t.url?.endsWith('/document')));
 const pdfPopup=await context.newPage();await pdfPopup.addInitScript(tab=>{chrome.tabs.query=async()=>[tab];},pdfTab);await pdfPopup.goto(`chrome-extension://${id}/popup.html`);await expect(pdfPopup.getByRole('checkbox')).toBeDisabled();await expect(pdfPopup.getByRole('status')).toContainText('PDF');await pdfPopup.locator('main').screenshot({path:'test-results/popup-evidence/pdf.png'});
 await protectedPopup.locator('main').screenshot({path:'test-results/popup-evidence/protected.png'});
 // Exercise every response state in the loaded document, with deterministic protocol replies.
 for(const state of [{supported:false,reason:'Protected page',enabled:false},{supported:true,enabled:false,accessNeeded:true},{supported:true,enabled:false,savedEnabled:true,renderable:false,error:'This PDF cannot be changed.'}]){
  await popup.addInitScript(({tab,state})=>{chrome.tabs.query=async()=>[tab];chrome.runtime.sendMessage=async()=>state;},{tab,state});await popup.reload();await expect(popup.getByRole('status')).not.toContainText('Checking');await contrast(JSON.stringify(state));
 }
 await popup.emulateMedia({reducedMotion:'reduce'});expect(await popup.locator('.switch').evaluate(e=>getComputedStyle(e,'::after').transitionDuration)).toBe('0s');
 expect(await popup.locator('input,button,a,select,textarea').count()).toBe(1);
 }finally{await context.close();await rm(profile,{recursive:true,force:true});await new Promise(r=>server.close(r));}
});
