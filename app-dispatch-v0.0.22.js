// v0.0.22 removes the nested Blob/source-rewrite boot chain.
await import('./app-dispatch-mode-v0.0.22.js?v=0.0.22');
await import('./dispatch/dispatch-gameplay-v0.0.13.js?v=0.0.13');
await import('./dispatch/incident-spatial-v0.0.14.js?v=0.0.14');
await import('./dispatch/ems-transport-v0.0.15.js?v=0.0.15');
await import('./dispatch/response-tablet-v0.0.16.js?v=0.0.16');
await import('./dispatch/after-action-review-v0.0.17.js?v=0.0.17');
await import('./dispatch/integration-polish-v0.0.18.js?v=0.0.18');
const VERSION='0.0.22';
const style=document.createElement('style');style.textContent='#dispatch-launch-direct{position:fixed;z-index:11950;left:12px;bottom:66px;border:1px solid #65cfff;border-radius:12px;padding:10px 13px;background:#07344b;color:#effbff;font:800 12px system-ui;cursor:pointer}#dispatch-launch-direct[hidden]{display:none}';document.head.append(style);
const button=document.createElement('button');button.id='dispatch-launch-direct';button.type='button';button.textContent='PETERBOROUGH DISPATCH';button.hidden=true;document.body.append(button);
function sync(){const s=window.__CITY_DEMO_RUNTIME__?.snapshot?.();button.hidden=!(s?.pickerActive&&s?.selectedCity==='Peterborough');}
button.onclick=()=>document.querySelector('#city-picker-start')?.click();setInterval(sync,250);sync();
document.querySelector('#version-pill')?.replaceChildren('v'+VERSION);document.documentElement.dataset.dispatchPrototypeVersion=VERSION;