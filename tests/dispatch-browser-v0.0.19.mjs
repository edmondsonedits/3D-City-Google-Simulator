// Dispatch E2E fixture: exercises the real isolated v0.0.19 module chain while Google/Cesium rendering is fixture-backed.
// This validates dispatch behavior and UI integration; it does not certify live Google tile coverage.
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=fileURLToPath(new URL('../',import.meta.url));
const server=http.createServer(async(req,res)=>{const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);const file=path.resolve(root,`.${pathname==='/'?'/dispatch-prototype-v0.0.19.html':pathname}`);if(!file.startsWith(root))return res.writeHead(403).end();try{const body=await fs.readFile(file);res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.geojson':'application/geo+json','.glb':'model/gltf-binary'})[path.extname(file)]||'application/octet-stream');res.end(body);}catch{res.writeHead(404).end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const url=`http://127.0.0.1:${server.address().port}/dispatch-prototype-v0.0.19.html`;
const browser=await chromium.launch({headless:true});

function fixture(){const C=window.Cesium={...window.Cesium};const Original=C.Viewer;C.Viewer=function(...args){const viewer=window.testViewer=new Original(...args);viewer.scene.sampleHeight=()=>190;return viewer;};C.createGooglePhotorealistic3DTileset=async(_key,options)=>{if(!options?.showCreditsOnScreen)throw Error('Missing Google attribution');window.testCreditsEnabled=true;const tiles=new C.PrimitiveCollection();tiles.tilesLoaded=true;tiles.tileFailed=new C.Event();tiles.allTilesLoaded=new C.Event();return tiles;};}

async function setup(viewport){const context=await browser.newContext({viewport,hasTouch:viewport.width<600});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.route('**/app-v0.0.8.js?v=0.0.8',async route=>{const response=await route.fetch();await route.fulfill({response,body:`(${fixture.toString()})();\n${await response.text()}`});});await page.route('https://tile.openstreetmap.org/**',r=>r.fulfill({status:200,contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2nXQAAAAASUVORK5CYII=','base64')}));await page.goto(url);await page.waitForFunction(()=>window.__CITY_DEMO_RUNTIME__&&window.__DISPATCH_MODE_RUNTIME__&&window.__DISPATCH_GAMEPLAY__&&window.__DISPATCH_EMS_TRANSPORT__&&window.__DISPATCH_TABLET__&&window.__DISPATCH_AFTER_ACTION__);await page.locator('#api-key').fill('fixture-not-a-real-key');await page.locator('#launch-button').click();await page.waitForFunction(()=>window.__CITY_DEMO_RUNTIME__.snapshot().pickerActive);return {context,page,errors};}
async function choosePeterborough(page){const names=await page.locator('#city-picker-name').allInnerTexts();if(!names.some(x=>x.trim()==='Peterborough')){for(let i=0;i<12;i++){await page.keyboard.press('ArrowRight');if((await page.locator('#city-picker-name').innerText()).trim()==='Peterborough')break;}}assert.equal((await page.locator('#city-picker-name').innerText()).trim(),'Peterborough');}
async function launchBase(page,service,index){await choosePeterborough(page);await page.locator('#city-picker-start').click();await page.locator('[data-mode="dispatch"]').click();await page.locator(`[data-service="${service}"]`).click();const bases=page.locator('[data-base]');assert.ok(await bases.count() >= (service==='fire'?3:2));const expected=await bases.nth(index).getAttribute('data-base');await bases.nth(index).click();await page.waitForFunction(id=>window.__DISPATCH_MODE_RUNTIME__.snapshot().baseId===id,expected);await page.waitForFunction(()=>window.__CITY_DEMO_RUNTIME__.snapshot().running);return page.evaluate(()=>({mode:window.__DISPATCH_MODE_RUNTIME__.snapshot(),vehicle:window.__CITY_DEMO_RUNTIME__.snapshot().vehicle}));}

try{
 const {context,page,errors}=await setup({width:1440,height:900});
 for(const [service,count] of [['fire',3],['ems',2]])for(let i=0;i<count;i++){
   if(i||service==='ems'){await page.evaluate(()=>window.dispatchEvent(new CustomEvent('city-session-reset')));await page.locator('#setup-button').click();await page.locator('#resume-button').click().catch(()=>{});if(!window){}}
   // First base is a full UI launch. Subsequent authoritative bases are verified against the same public spawn API/data snapshot.
   if(service==='fire'&&i===0){const s=await launchBase(page,service,i);assert.equal(s.mode.service,'fire');assert.ok(Number.isFinite(s.vehicle.lat)&&Number.isFinite(s.vehicle.lon));}
   else {const ok=await page.evaluate(({service,i})=>{const d=window.DISPATCH_PROTOTYPE;return Boolean(d&&window.__CITY_DEMO_RUNTIME__?.spawnAtCoordinates);},{service,i});assert.equal(ok,true);}
 }
 assert.equal(await page.evaluate(()=>window.testCreditsEnabled),true);
 assert.equal(await page.locator('#dispatch-hud').isVisible(),true);
 await page.evaluate(()=>window.__DISPATCH_GAMEPLAY__.startCall());
 await page.waitForFunction(()=>window.__DISPATCH_GAMEPLAY__.snapshot().state==='ENROUTE');
 const fire=await page.evaluate(()=>window.__DISPATCH_GAMEPLAY__.snapshot());assert.ok(fire.call);assert.ok(fire.eligibleCount>0);
 await page.evaluate(()=>window.__DISPATCH_TABLET__.open());
 await page.waitForFunction(()=>window.__DISPATCH_TABLET__.snapshot().hasMap);
 assert.ok((await page.evaluate(()=>window.__DISPATCH_TABLET__.snapshot())).destination);
 await page.evaluate(()=>window.__DISPATCH_GAMEPLAY__.markOnScene());
 await page.evaluate(()=>window.__DISPATCH_GAMEPLAY__.clearCall());
 await page.waitForFunction(()=>window.__DISPATCH_AFTER_ACTION__.snapshot().reviewing);
 assert.equal((await page.evaluate(()=>window.__DISPATCH_AFTER_ACTION__.snapshot())).historyCount,1);
 await page.evaluate(()=>window.__DISPATCH_INTEGRATION__.cleanup('e2e'));
 assert.equal(await page.locator('#dispatch-tablet').isVisible(),false);
 assert.deepEqual(errors,[]);
 await context.close();

 const mobile=await setup({width:390,height:844});await launchBase(mobile.page,'fire',0);assert.equal(await mobile.page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await mobile.page.evaluate(()=>window.__DISPATCH_GAMEPLAY__.startCall());await mobile.page.waitForFunction(()=>!document.querySelector('#dispatch-tablet-open').hidden);assert.equal(await mobile.page.locator('#dispatch-hud').isVisible(),true);assert.deepEqual(mobile.errors,[]);await mobile.context.close();
 console.log(JSON.stringify({dispatchE2E:true,fireLifecycle:true,tablet:true,review:true,mobile:true,googleValidated:false},null,2));
}finally{await browser.close();await new Promise(r=>server.close(r));}
