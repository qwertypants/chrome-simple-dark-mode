import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

test('controller removes every media listener and observer after repeated toggles', async () => {
 const source=(await readFile(new URL('../../src/content.js',import.meta.url),'utf8'))
   .replace(/^import .*;$/gm,'').replace('export function applyEnabled','function applyEnabled');
 const mediaLists=[];const observers=[];const events=new Map();
 const globals={__simpleDarkMode:true};
 const matchMedia=()=>{const listeners=new Set();mediaLists.push(listeners);return {addEventListener:(name,fn)=>listeners.add(fn),removeEventListener:(name,fn)=>listeners.delete(fn)};};
 class Observer{constructor(){this.active=false;observers.push(this);}observe(){this.active=true;}disconnect(){this.active=false;}}
 const create=new Function('globalThis','document','matchMedia','MutationObserver','addEventListener','removeEventListener','enableTheme','disableTheme','sampleNativeTheme',`${source};return applyEnabled;`);
 const apply=create(globals,{contentType:'text/html',documentElement:{}},matchMedia,Observer,(name,fn)=>events.set(name,fn),name=>events.delete(name),()=>{},()=>{},()=>({theme:'dark',roots:[]}));
 for(let i=0;i<4;i++){
   apply(true);assert.equal(mediaLists.reduce((n,list)=>n+list.size,0),1);
   apply(false);assert.equal(mediaLists.reduce((n,list)=>n+list.size,0),0);
   assert.equal(events.size,0);assert.ok(observers.every(observer=>!observer.active));
 }
});
