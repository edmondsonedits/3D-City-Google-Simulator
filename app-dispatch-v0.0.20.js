// v0.0.20: release-blocking dispatch launch fix.
// Do not rely on intercepting the city-picker Start handler. Add an explicit, always-visible
// Peterborough Dispatch button and reuse the authoritative Stage 2 selector/runtime.
await import('./app-dispatch-v0.0.18.js?v=0.0.18');

const VERSION='0.0.20';
const style=document.createElement('style');
style.textContent=`
#dispatch-launch-direct{position:fixed;z-index:11950;left:12px;bottom:66px;border:1px solid #65cfff;border-radius:12px;padding:10px 13px;background:#07344b;color:#effbff;font:800 12px system-ui;box-shadow:0 8px 28px #0008;cursor:pointer}
#dispatch-launch-direct[hidden]{display:none}
@media(max-width:600px){#dispatch-launch-direct{left:auto;right:10px;bottom:150px;padding:9px 11px}}
`;
document.head.append(style);
const button=document.createElement('button');button.id='dispatch-launch-direct';button.type='button';button.textContent='PETERBOROUGH DISPATCH';button.hidden=true;document.body.append(button);
const picker=()=>window.__CITY_DEMO_RUNTIME__?.snapshot?.();
function sync(){const s=picker();button.hidden=!(s?.pickerActive&&s?.selectedCity==='Peterborough');}
button.onclick=()=>{
  const start=document.querySelector('#city-picker-start');
  // The Stage 2 capture listener owns the dispatch/free-drive chooser. Dispatch a real click
  // while Peterborough is selected so the player-facing path is identical and testable.
  start?.click();
};
setInterval(sync,250);sync();
window.addEventListener('city-session-reset',sync);
const pill=document.querySelector('#version-pill');if(pill)pill.textContent='v'+VERSION;
document.documentElement.dataset.dispatchPrototypeVersion=VERSION;
