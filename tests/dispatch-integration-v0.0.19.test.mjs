import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('v0.0.19 validation release preserves production v0.0.8',()=>{
  assert.match(read('index.html'),/app\.js\?v=0\.0\.8/);
  assert.doesNotMatch(read('index.html'),/app-dispatch/);
});

test('all five authoritative base choices remain data-driven',()=>{
  const ui=read('app-dispatch-v0.0.11.js');
  assert.match(ui,/data\.fireBases/); assert.match(ui,/data\.emsBases/);
  assert.match(ui,/data\.getBase\(service,baseId\)/);
  const spawn=read('app-dispatch-v0.0.12.js');
  assert.match(spawn,/spawnLat/); assert.match(spawn,/spawnLng/); assert.match(spawn,/spawnHeading/);
});

test('dispatch lifecycle, arrival and service filtering are wired',()=>{
  const game=read('dispatch/dispatch-gameplay-v0.0.13.js');
  for(const token of ['INACTIVE','ENROUTE','ONSCENE','INSERVICE','dispatch-call-started','dispatch-call-onscene','dispatch-call-cleared']) assert.ok(game.includes(token),token);
  assert.match(game,/service==='ems'/);
  const spatial=read('dispatch/incident-spatial-v0.0.14.js');
  assert.match(spatial,/nearestRoadAccess/); assert.match(spatial,/arrivalRadius/); assert.match(spatial,/markOnScene/);
});

test('EMS mission targets authoritative hospital and records both timers',()=>{
  const ems=read('dispatch/ems-transport-v0.0.15.js');
  for(const token of ['TO_SCENE','PICKUP','TRANSPORTING','HANDOVER','COMPLETE','checkpointLat','checkpointLng','responseMs','transportMs']) assert.ok(ems.includes(token),token);
});

test('tablet uses independent road graph and changes destination for transport',()=>{
  const mdt=read('dispatch/response-tablet-v0.0.16.js');
  assert.match(mdt,/data\.roads\.dataUrl/);
  assert.match(mdt,/phase==='TRANSPORTING'/);
  assert.match(mdt,/checkpointLat/);
  assert.match(mdt,/OpenStreetMap contributors/);
});

test('after-action review records Fire and EMS route evidence',()=>{
  const review=read('dispatch/after-action-review-v0.0.17.js');
  for(const token of ['actual','recommended','response','transport','dispatch-ems-complete','historyCount']) assert.ok(review.includes(token),token);
});

test('context-changing modules expose cleanup boundaries',()=>{
  for(const p of ['dispatch/dispatch-gameplay-v0.0.13.js','dispatch/incident-spatial-v0.0.14.js','dispatch/ems-transport-v0.0.15.js','dispatch/response-tablet-v0.0.16.js','dispatch/after-action-review-v0.0.17.js']){
    const src=read(p); assert.match(src,/city-session-reset/,p); assert.match(src,/dispatch-base-selected|dispatch-call-cleared/,p);
  }
});

test('Stage 8 diagnostics/export remains normalized and key-free',()=>{
  const src=read('dispatch/integration-polish-v0.0.18.js');
  assert.match(src,/exportNormalizedData/); assert.match(src,/schemaVersion/); assert.match(src,/dispatch-prototype-cleanup/);
  const all=['app-dispatch-v0.0.19.js','dispatch/integration-polish-v0.0.18.js','dispatch/response-tablet-v0.0.16.js'].map(read).join('\n');
  assert.doesNotMatch(all,/AIza[0-9A-Za-z_-]{20,}/);
});
