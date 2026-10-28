import {classifySite} from './site.js';

export async function mountPopup(api = chrome, doc = document) {
 const toggle=doc.querySelector('#toggle');
 const hostname=doc.querySelector('#hostname');
 const status=doc.querySelector('#status');
 let site, tabId, busy=false, state;
 const render=(next, message)=>{
  state=next;
  toggle.checked=Boolean(next.savedEnabled ?? next.enabled);
  toggle.disabled=busy || !next.supported || next.renderable===false;
  status.textContent=message || (next.error ? `${next.error}${next.savedEnabled ? ' Site choice remains on.' : ''}` : !next.supported ? (next.reason || 'This protected page cannot be changed.') : next.accessNeeded ? 'Off · Turn on to allow access to this website.' : next.status==='already-dark' ? 'Already dark · Your site choice is on.' : next.enabled ? 'On · Remembered for this website.' : 'Off · Using the website’s own appearance.');
 };
 const read=()=>api.runtime.sendMessage({type:'site:state',tabId});
 toggle.addEventListener('change',async()=>{
  if(busy || !site?.supported) return;
  const enabled=toggle.checked;
  // Start the permission request synchronously inside the checkbox gesture.
  let permission;
  try {permission=enabled ? api.permissions.request({origins:[site.originPattern]}) : Promise.resolve(true);} catch {permission=Promise.resolve(false);}
  busy=true;render(state,'Updating this website…');
  try {
   if(!await permission) {render(await read(),'Access needed · Turn on again to allow this website.');return;}
   const result=await api.runtime.sendMessage({type:'site:set',tabId,hostname:site.hostname,enabled});
   if(result.error) {render(await read(),`${result.error}${result.savedEnabled ? ' Site choice remains on.' : ''}`);return;}
   render(result);
  } catch {
   try {render(await read(),'Could not update this page. Try again.');}
   catch {render({...state,supported:false},'Could not read the saved choice. Reopen to try again.');}
  } finally {busy=false;render(state,status.textContent);}
 });
 try {
  const [tab]=await api.tabs.query({active:true,currentWindow:true});
  tabId=tab?.id;site=classifySite(tab?.url);
  hostname.textContent=site.supported ? site.hostname : 'Protected page';
  if(!site.supported){render({...site,enabled:false});return;}
  render(await read());
 } catch {render({supported:false,enabled:false},'Could not read this page. Reopen to try again.');}
}
if(typeof chrome!=='undefined' && typeof document!=='undefined') mountPopup();
