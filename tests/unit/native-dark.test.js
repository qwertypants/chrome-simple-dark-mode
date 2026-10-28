import {test} from 'node:test';
import assert from 'node:assert/strict';
import {sampleNativeTheme} from '../../src/native-dark.js';

test('native sampling composites ancestors and bounds work independently of page size', () => {
 let reads=0, points=0;
 const root={backgroundColor:'rgb(20,20,20)',color:'rgb(230,230,230)'};
 const child={backgroundColor:'rgba(0,0,0,0)',color:root.color,parentElement:root,tagName:'MAIN'};
 const doc={defaultView:{innerWidth:1000,innerHeight:1000,getComputedStyle:el=>{reads++;return el;}},elementFromPoint:()=>{points++;return child;}};
 assert.equal(sampleNativeTheme(doc).theme,'dark');
 assert.equal(points,25);assert.ok(reads<=75);
 root.backgroundColor='rgb(255,255,255)';child.color='rgb(0,0,0)';
 assert.equal(sampleNativeTheme(doc).theme,'light');
 child.backgroundColor='rgba(0,0,0,0.1)';
 assert.equal(sampleNativeTheme(doc).theme,'light');
 child.backgroundColor='rgb(100,100,100)';
 assert.equal(sampleNativeTheme(doc).theme,'uncertain');
});
