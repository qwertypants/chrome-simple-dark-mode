import {test} from 'node:test';
import assert from 'node:assert/strict';

test('worker serializes updates, rejects denied access, reconciles revocation and wake', async () => {
 const values={};const registrations=new Map();const notifications=[];
 let access=true;let listener;let removed;
 globalThis.chrome={
  storage:{local:{get:async key=>key===null?{...values}:{[key]:values[key]},set:async data=>Object.assign(values,data)}},
  permissions:{contains:async()=>access,onAdded:{addListener(){}},onRemoved:{addListener(fn){removed=fn;}}},
  tabs:{get:async()=>({id:1,url:'https://example.com/page'}),query:async()=>[{id:1,url:access?'https://example.com/page':undefined},{id:2,url:'https://other.test/'}],sendMessage:async(id,msg)=>{notifications.push({id,...msg});}},
  scripting:{getRegisteredContentScripts:async filter=>[...registrations.values()].filter(s=>!filter||filter.ids.includes(s.id)),registerContentScripts:async scripts=>scripts.forEach(s=>registrations.set(s.id,s)),unregisterContentScripts:async({ids})=>ids.forEach(id=>registrations.delete(id)),executeScript:async()=>{}},
  runtime:{onMessage:{addListener(fn){listener=fn;}},onInstalled:{addListener(){}},onStartup:{addListener(){}}}
 };
 await import(`../../src/background.js?test=${Date.now()}`);
 const send=(enabled,sender={})=>new Promise(resolve=>listener({type:enabled===undefined?'site:state':'site:set',tabId:1,hostname:'example.com',enabled},sender,resolve));
 await send(true);
 assert.equal(values['site:example.com'],true);assert.equal(registrations.size,1);
 assert.deepEqual(registrations.values().next().value.matches,['*://example.com/*']);
 const responses=await Promise.all([send(false),send(true),send(false)]);
 assert.deepEqual(responses.map(r=>r.enabled),[false,true,false]);assert.equal(registrations.size,0);
 await send(true);access=false;removed();
 assert.equal((await send()).enabled,false);
 assert.equal(values['site:example.com'],false);assert.equal(registrations.size,0);
 assert.ok(notifications.some(n=>n.id===1&&n.hostname==='example.com'&&n.enabled===false));
 assert.equal((await send(true)).enabled,false);assert.equal(values['site:example.com'],false);
 assert.match((await send(true)).error,/not granted/);
 assert.match((await send(true,{tab:{id:1,url:'https://example.com/'}})).error,/Only the extension/);
 // A new worker instance reconstructs registration solely from saved state/access.
 values['site:example.com']=true;access=true;registrations.clear();
 await import(`../../src/background.js?test=wake-${Date.now()}`);
 assert.equal((await send()).enabled,true);assert.equal(registrations.size,1);
 delete globalThis.chrome;
});
