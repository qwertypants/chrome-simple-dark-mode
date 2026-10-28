import {readFile,mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const {version}=JSON.parse(await readFile('extension/manifest.json','utf8'));
await mkdir('release',{recursive:true});
const target=`release/shade-toggle-${version}.zip`;
execFileSync('python3',['-c',`import zipfile,pathlib,sys
files=['manifest.json','background.js','content.js','popup.js','popup.html','popup.css','DARKREADER-LICENSE.txt']+[f'icons/icon-{s}.png' for s in [16,32,48,128]]
with zipfile.ZipFile(sys.argv[1],'w',compression=zipfile.ZIP_DEFLATED,compresslevel=9) as z:
 for name in sorted(files):
  data=(pathlib.Path('dist')/name).read_bytes()
  info=zipfile.ZipInfo(name,(2026,1,1,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED;info.external_attr=0o100644<<16
  z.writestr(info,data)
`,target]);
console.log(`${createHash('sha256').update(await readFile(target)).digest('hex')}  ${target}`);
