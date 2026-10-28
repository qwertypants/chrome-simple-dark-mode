import {test} from 'node:test';
import assert from 'node:assert/strict';
import {classifySite} from '../../src/site.js';
import {getEnabled, setEnabled} from '../../src/preferences.js';
test('exact hostname shares paths and schemes, but not subdomains', () => {
 const a = classifySite('https://example.com/a?b=1');
 assert.deepEqual(a, classifySite('http://example.com/other'));
 assert.equal(a.originPattern, '*://example.com/*');
 assert.notEqual(a.hostname, classifySite('https://sub.example.com').hostname);
 for (const url of ['bad','file:///test','chrome://settings','https://chromewebstore.google.com/detail/a','https://chrome.google.com/webstore/a']) assert.equal(classifySite(url).supported,false);
});
test('preferences use independent hostname keys and default off', async () => {
 const data={};const storage={get:async key=>({...data}),set:async values=>Object.assign(data,values)};
 assert.equal(await getEnabled('example.com',storage),false);
 await Promise.all([setEnabled('example.com',true,storage),setEnabled('sub.example.com',true,storage)]);
 assert.equal(await getEnabled('example.com',storage),true);
 await setEnabled('example.com',false,storage);
 assert.equal(await getEnabled('example.com',storage),false);
 assert.equal(await getEnabled('sub.example.com',storage),true);
});
