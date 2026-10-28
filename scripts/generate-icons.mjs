// Reproducible original switch mark; SVG is the editable design source.
import {chromium} from '@playwright/test';
import {readFile} from 'node:fs/promises';
const browser=await chromium.launch();
try {const page=await browser.newPage();await page.setContent(await readFile('extension/icons/source.svg','utf8'));await page.addStyleTag({content:'body{margin:0}svg{display:block;width:100vw;height:100vh}'});for(const size of [16,32,48,128]){await page.setViewportSize({width:size,height:size});await page.screenshot({path:`extension/icons/icon-${size}.png`,omitBackground:true});}} finally {await browser.close();}
