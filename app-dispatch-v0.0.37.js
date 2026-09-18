// v0.0.37 fire-hall free-drive spawn. The stable dispatch.html loader remains unchanged while this
// isolated entry module fixes mobile HUD collisions and re-runs ground alignment after base spawns.
await import('./app-dispatch-mode-v0.0.37.js?v=0.0.37');
await import('./dispatch/dispatch-gameplay-v0.0.13.js?v=0.0.13');
await import('./dispatch/incident-spatial-v0.0.14.js?v=0.0.14');
await import('./dispatch/ems-transport-v0.0.15.js?v=0.0.15');
await import('./dispatch/response-tablet-v0.0.16.js?v=0.0.16');
await import('./dispatch/after-action-review-v0.0.17.js?v=0.0.17');
await import('./dispatch/integration-polish-v0.0.18.js?v=0.0.18');
const VERSION='0.0.37';
const style=document.createElement('style');style.textContent=`
#dispatch-launch-direct{position:fixed;z-index:11950;left:12px;bottom:66px;border:1px solid #65cfff;border-radius:12px;padding:10px 13px;background:#07344b;color:#effbff;font:800 12px system-ui;cursor:pointer}#dispatch-launch-direct[hidden]{display:none}
/* Completion-pass mobile layout: every driving control owns a separate screen zone. */
@media(max-width:600px){
 #dispatch-hud{top:86px!important;right:8px!important;width:min(270px,calc(100vw - 112px))!important;max-height:32vh;overflow:auto}
 .dispatch-mode-badge{left:12px!important;bottom:112px!important;max-width:245px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
 #boot-run-box.minimized{left:auto!important;right:8px!important;top:auto!important;bottom:12px!important;width:auto!important;transform:none!important;padding:0!important}
 #boot-run-box.minimized header>b,#boot-run-box.minimized #boot-copy,#boot-run-box.minimized #boot-run-log{display:none!important}
 #boot-run-box.minimized header{background:transparent!important}.boot-actions{gap:0!important}
 #boot-run-box.minimized #boot-min{padding:5px 8px!important;font-size:10px!important}
 #dispatch-diagnostics{right:72px!important;bottom:8px!important;max-width:180px!important;padding:4px 6px!important}
 #dispatch-diagnostics:not([open]){opacity:.72}
 #street-card{max-width:calc(100vw - 112px)!important}
}
`;document.head.append(style);
const button=document.createElement('button');button.id='dispatch-launch-direct';button.type='button';button.textContent='PETERBOROUGH DISPATCH';button.hidden=true;document.body.append(button);
function sync(){const s=window.__CITY_DEMO_RUNTIME__?.snapshot?.();button.hidden=!(s?.pickerActive&&s?.selectedCity==='Peterborough');}
button.onclick=()=>document.querySelector('#city-picker-start')?.click();setInterval(sync,250);sync();
document.querySelector('#version-pill')?.replaceChildren('v'+VERSION);document.documentElement.dataset.dispatchPrototypeVersion=VERSION;
// Repair any stale visible prototype-version labels without touching production index.html.
document.querySelectorAll('body *').forEach(el=>{if(el.children.length===0&&/v0\.0\.31/.test(el.textContent||''))el.textContent=el.textContent.replaceAll('v0.0.31','v'+VERSION);});

// Dispatch base spawning resets the surface lock after the city first aligned. Re-run the existing
// CENTER action after the authoritative base spawn, allowing photorealistic tiles time to resolve.
// The runtime's CENTER handler performs both camera recentering and rendered-surface alignment.
window.addEventListener('city-dispatch-spawned',()=>{
 const center=document.querySelector('#mobile-recenter');
 [250,800,1600,2800].forEach(delay=>setTimeout(()=>center?.click(),delay));
});

window.__BOOT_RUN_LOG__?.('APP MODULE: v'+VERSION+' completion-pass hotfix reached');
const runBox=document.createElement('aside');runBox.id='run-diagnostics-box';runBox.hidden=true;runBox.innerHTML='<div class="run-head"><strong>RUN DIAGNOSTICS</strong><button id="run-copy" type="button">COPY</button></div><pre id="run-log">BOOT: page loaded\n</pre>';
document.body.append(runBox);window.__BOOT_RUN_LOG__?.('APP MODULE: all dispatch imports completed');
const ds=document.createElement('style');ds.textContent='#run-diagnostics-box{position:fixed;z-index:20000;left:8px;right:8px;bottom:8px;max-height:24vh;overflow:auto;background:#03090eee;border:1px solid #39718e;border-radius:10px;padding:8px;color:#bfeaff;font:11px/1.35 ui-monospace,monospace;box-shadow:0 8px 30px #000a}.run-head{display:flex;justify-content:space-between;position:sticky;top:0;background:#03090e}.run-head button{font:inherit;background:#123246;color:#fff;border:1px solid #39718e;border-radius:6px}.run-ok{color:#9ff0bd}.run-bad{color:#ffaaa3}';document.head.append(ds);
const logEl=runBox.querySelector('#run-log');const runLog=(msg,kind='')=>{const t=new Date().toISOString().slice(11,23);logEl.textContent+=t+' '+msg+'\n';logEl.scrollTop=logEl.scrollHeight;if(kind==='bad')runBox.classList.add('run-bad');};
window.__RUN_DIAGNOSTICS__={log:runLog};
runBox.querySelector('#run-copy').onclick=async()=>{try{await navigator.clipboard.writeText(logEl.textContent);runLog('COPY: diagnostics copied');}catch(e){runLog('COPY FAIL: '+e.message,'bad')}};
window.addEventListener('error',e=>runLog('JS ERROR: '+(e.message||e.error?.message||'unknown')+' @ '+(e.filename||'')+':'+(e.lineno||''),'bad'));
window.addEventListener('unhandledrejection',e=>runLog('PROMISE ERROR: '+String(e.reason?.stack||e.reason||'unknown'),'bad'));
const originalFetch=window.fetch.bind(window);window.fetch=async(...args)=>{const u=String(args[0]?.url||args[0]);try{const r=await originalFetch(...args);if(!r.ok)runLog('FETCH FAIL '+r.status+': '+u,'bad');return r}catch(e){runLog('FETCH ERROR: '+u+' :: '+e.message,'bad');throw e}};
runLog('MODULES: dispatch application loaded v'+VERSION);
const launch=document.querySelector('#launch-button');launch?.addEventListener('click',()=>{runLog('START: Launch button clicked');setTimeout(()=>{const s=window.__CITY_DEMO_RUNTIME__?.snapshot?.();runLog('CHECK: cityRuntime='+!!window.__CITY_DEMO_RUNTIME__+' modeRuntime='+!!window.__DISPATCH_MODE_RUNTIME__+' pickerActive='+!!s?.pickerActive+' selectedCity='+(s?.selectedCity||'none'));if(!s?.pickerActive)runLog('FAILURE: Ontario/Peterborough picker did not open after Start','bad');},2500)},true);
window.addEventListener('dispatch-base-selected',e=>runLog('DISPATCH BASE: '+JSON.stringify(e.detail)));
window.addEventListener('city-dispatch-spawned',e=>runLog('SPAWN OK + surface recovery queued: '+JSON.stringify(e.detail)));