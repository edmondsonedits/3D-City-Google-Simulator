import { peterboroughDataReady } from './dispatch/peterborough-data-adapter-v0.0.31.js?v=0.0.31';

const VERSION = '0.0.40';
const data = await peterboroughDataReady;
window.DISPATCH_PROTOTYPE = Object.freeze({ version:VERSION, cityDataReady:Promise.resolve(data) });

// Keep the proven v0.0.8 Google/Cesium driving runtime isolated from production.
await import('./app-dispatch-runtime-v0.0.40.js?v=0.0.40');

document.documentElement.dataset.dispatchPrototypeData = 'ready';
document.documentElement.dataset.dispatchPackageVersion = data.city.packageVersion;
document.documentElement.dataset.dispatchCallCount = String(data.dispatchCalls.length);
const versionPill = document.querySelector('#version-pill');
if (versionPill) versionPill.textContent = `v${VERSION}`;

const style = document.createElement('style');
style.textContent = `
#dispatch-mode-overlay{position:fixed;inset:0;z-index:12000;display:grid;place-items:center;padding:18px;background:rgba(3,10,17,.72);backdrop-filter:blur(10px)}
#dispatch-mode-overlay[hidden]{display:none}.dispatch-card{width:min(520px,100%);border:1px solid rgba(125,211,252,.25);border-radius:20px;padding:20px;background:#07131d;color:#edf8ff;box-shadow:0 24px 80px rgba(0,0,0,.48);font:14px/1.4 system-ui}.dispatch-card h2{margin:0 0 5px;font-size:22px}.dispatch-card p{margin:0 0 16px;color:#9fb8c8}.dispatch-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.dispatch-choice,.dispatch-base{border:1px solid #244356;border-radius:13px;padding:13px;background:#0b1c28;color:#eaf8ff;text-align:left;cursor:pointer}.dispatch-choice:hover,.dispatch-base:hover{border-color:#69c8ff}.dispatch-choice strong,.dispatch-base strong{display:block;font-size:14px}.dispatch-choice small,.dispatch-base small{display:block;color:#91adbd;margin-top:3px}.dispatch-bases{display:grid;gap:8px;max-height:45vh;overflow:auto}.dispatch-back{margin-top:12px;border:0;background:transparent;color:#8dd8ff;cursor:pointer;padding:6px}.dispatch-mode-badge{position:fixed;z-index:9000;left:12px;bottom:34px;padding:6px 9px;border-radius:999px;background:rgba(4,15,25,.78);border:1px solid rgba(116,211,255,.32);color:#d8f8ff;font:800 10px system-ui;letter-spacing:.04em;pointer-events:none}
@media(max-width:560px){.dispatch-grid{grid-template-columns:1fr}.dispatch-card{padding:16px}.dispatch-mode-badge{bottom:92px}}
`;
document.head.append(style);

const overlay = document.createElement('section');
overlay.id = 'dispatch-mode-overlay'; overlay.hidden = true;
overlay.innerHTML = '<div class="dispatch-card"><div id="dispatch-mode-content"></div></div>';
document.body.append(overlay);
const content = overlay.querySelector('#dispatch-mode-content');
let bypassPickerIntercept = false;
let selectedMode = 'free';
let selectedService = null;
let selectedBase = null;

function pickerSelectedCity(){ return window.__CITY_DEMO_RUNTIME__?.snapshot?.().selectedCity || ''; }
function hideOverlay(){ overlay.hidden = true; }
function continueFreeDrive(){ selectedMode='free'; selectedService=null; selectedBase=null; hideOverlay(); bypassPickerIntercept=true; document.querySelector('#city-picker-start')?.click(); queueMicrotask(()=>{bypassPickerIntercept=false;}); updateBadge(); }
function showModeChoice(){
  content.innerHTML = `<h2>Peterborough</h2><p>Choose how you want to drive.</p><div class="dispatch-grid"><button class="dispatch-choice" data-mode="free"><strong>Free Drive</strong><small>Explore the Google 3D city without calls.</small></button><button class="dispatch-choice" data-mode="dispatch"><strong>Dispatch Simulator</strong><small>Start from an authoritative Fire or EMS base.</small></button></div><button class="dispatch-back" data-action="cancel">Cancel</button>`;
  overlay.hidden=false;
  content.querySelector('[data-mode="free"]').onclick=continueFreeDrive;
  content.querySelector('[data-mode="dispatch"]').onclick=showServiceChoice;
  content.querySelector('[data-action="cancel"]').onclick=hideOverlay;
}
function showServiceChoice(){
  content.innerHTML = `<h2>Dispatch Simulator</h2><p>Select an emergency service.</p><div class="dispatch-grid"><button class="dispatch-choice" data-service="fire"><strong>Fire</strong><small>${data.fireBases.length} Peterborough Fire stations</small></button><button class="dispatch-choice" data-service="ems"><strong>EMS</strong><small>${data.emsBases.length} Peterborough County/City EMS bases</small></button></div><button class="dispatch-back" data-action="back">← Back</button>`;
  content.querySelectorAll('[data-service]').forEach(button=>button.onclick=()=>showBaseChoice(button.dataset.service));
  content.querySelector('[data-action="back"]').onclick=showModeChoice;
}
function showBaseChoice(service){
  selectedService=service;
  const bases=service==='ems'?data.emsBases:data.fireBases;
  content.innerHTML=`<h2>${service==='ems'?'EMS':'Fire'} base</h2><p>Spawn coordinates and headings come directly from Peterborough package v${data.city.packageVersion}.</p><div class="dispatch-bases">${bases.map(base=>`<button class="dispatch-base" data-base="${base.id}"><strong>${base.name}</strong><small>${base.address} · heading ${base.spawnHeading}°</small></button>`).join('')}</div><button class="dispatch-back" data-action="back">← Back</button>`;
  content.querySelectorAll('[data-base]').forEach(button=>button.onclick=()=>launchDispatchBase(service,button.dataset.base));
  content.querySelector('[data-action="back"]').onclick=showServiceChoice;
}
function updateBadge(){
  let badge=document.querySelector('.dispatch-mode-badge'); if(!badge){badge=document.createElement('div');badge.className='dispatch-mode-badge';document.body.append(badge);}
  badge.textContent=selectedMode==='dispatch'&&selectedBase?`Dispatch · ${selectedService==='ems'?'EMS':'Fire'} · ${selectedBase.shortName||selectedBase.name}`:'Free Drive';
}
async function waitForDriving(timeout=20000){
  const started=performance.now(); while(performance.now()-started<timeout){const snap=window.__CITY_DEMO_RUNTIME__?.snapshot?.();if(snap?.running&&!snap?.pickerActive)return snap;await new Promise(r=>setTimeout(r,100));}throw new Error('3D driving runtime did not become ready.');
}
async function launchDispatchBase(service,baseId){
  const base=data.getBase(service,baseId); if(!base)return;
  selectedMode='dispatch';selectedService=service;selectedBase=base;hideOverlay();updateBadge();
  // Stage 2 launches the proven Peterborough 3D world first. The isolated runtime then
  // uses its existing Ontario geocoder spawn path with the authoritative coordinate pair.
  // A dedicated runtime spawn API is the remaining Stage-2 gate because v0.0.8 keeps
  // vehicle state private; we intentionally do not mutate production app.js.
  bypassPickerIntercept=true;document.querySelector('#city-picker-start')?.click();queueMicrotask(()=>{bypassPickerIntercept=false;});
  try{
    await waitForDriving();
    const spawned=window.__CITY_DEMO_RUNTIME__?.spawnAtCoordinates?.({id:base.id,name:base.name,address:base.address,lat:base.spawnLat,lon:base.spawnLng,headingDeg:base.spawnHeading});
    if(!spawned) throw new Error('Authoritative dispatch spawn API is unavailable.');
    document.documentElement.dataset.dispatchRequestedHeading=String(base.spawnHeading);
    document.documentElement.dataset.dispatchRequestedBase=base.id;
    window.dispatchEvent(new CustomEvent('dispatch-base-selected',{detail:{service,baseId:base.id,spawnLat:base.spawnLat,spawnLng:base.spawnLng,spawnHeading:base.spawnHeading}}));
  }catch(error){console.error('[Dispatch prototype] Base launch failed:',error);}
}

const pickerStart=document.querySelector('#city-picker-start');
pickerStart?.addEventListener('click',event=>{
  if(bypassPickerIntercept)return;
  if(pickerSelectedCity()!=='Peterborough') { selectedMode='free';selectedService=null;selectedBase=null;updateBadge();return; }
  event.preventDefault();event.stopImmediatePropagation();showModeChoice();
},true);

window.addEventListener('city-session-reset',updateBadge);
updateBadge();
window.__DISPATCH_MODE_RUNTIME__=Object.freeze({snapshot:()=>({version:VERSION,mode:selectedMode,service:selectedService,baseId:selectedBase?.id||null,base:selectedBase?{...selectedBase}:null,packageVersion:data.city.packageVersion})});
