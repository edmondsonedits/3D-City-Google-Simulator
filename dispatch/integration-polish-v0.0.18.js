import { peterboroughDataReady } from './peterborough-data-adapter-v0.0.10.js?v=0.0.10';

const VERSION='0.0.18';
const data=await peterboroughDataReady;
const $=s=>document.querySelector(s);

function cleanup(reason='context-change'){
  window.dispatchEvent(new CustomEvent('dispatch-prototype-cleanup',{detail:{reason}}));
  $('#dispatch-tablet')?.removeAttribute('open');
  $('#dispatch-after-action-review')?.removeAttribute('open');
  document.querySelectorAll('[data-dispatch-transient="true"]').forEach(el=>el.remove());
}

// Stage 8 deliberately keeps one authoritative editor-compatible schema: the adapter's
// normalized bases/calls/hospital objects. Export is diagnostic/sync data, not a forked store.
function exportNormalizedData(){
  return Object.freeze({
    schemaVersion:data.schemaVersion,
    source:{city:data.city.id,packageVersion:data.city.packageVersion,dispatchVersion:data.dispatch.dataVersion},
    bases:{fire:data.fireBases,ems:data.emsBases},
    hospital:data.hospital,
    dispatchCalls:data.dispatchCalls,
    roads:data.roads
  });
}

const panel=document.createElement('details');
panel.id='dispatch-diagnostics';
panel.style.cssText='position:fixed;right:10px;bottom:34px;z-index:8999;max-width:min(360px,calc(100vw - 20px));background:rgba(4,15,25,.9);border:1px solid rgba(116,211,255,.3);border-radius:10px;color:#dff7ff;font:11px/1.45 system-ui;padding:7px 9px';
panel.innerHTML=`<summary style="cursor:pointer;font-weight:800">Dispatch diagnostics</summary><div style="padding-top:7px">Prototype v${VERSION}<br>Peterborough package v${data.city.packageVersion}<br>Dispatch data v${data.dispatch.dataVersion}<br>${data.fireBases.length} Fire bases · ${data.emsBases.length} EMS bases · ${data.dispatchCalls.length} calls<br>Schema v${data.schemaVersion} · OSM routing truth</div>`;
document.body.append(panel);

// City reset is the common boundary used by the isolated Cesium runtime. Downstream modules
// can subscribe to the cleanup event without this coordinator reaching into their private state.
window.addEventListener('city-session-reset',()=>cleanup('city-session-reset'));
window.addEventListener('dispatch-base-selected',()=>cleanup('base-change'));

window.__DISPATCH_INTEGRATION__=Object.freeze({
  version:VERSION,
  diagnostics:()=>Object.freeze({version:VERSION,packageVersion:data.city.packageVersion,dispatchVersion:data.dispatch.dataVersion,fireBases:data.fireBases.length,emsBases:data.emsBases.length,calls:data.dispatchCalls.length,schemaVersion:data.schemaVersion}),
  exportNormalizedData,
  cleanup
});
document.documentElement.dataset.dispatchMergeCandidate='true';
