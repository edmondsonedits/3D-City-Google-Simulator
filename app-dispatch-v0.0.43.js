// v0.0.43 completion-pass entry. Production index.html remains v0.0.8.
await import('./app-dispatch-mode-v0.0.43.js?v=0.0.43');
await import('./dispatch/dispatch-gameplay-v0.0.13.js?v=0.0.13');
await import('./dispatch/incident-spatial-v0.0.14.js?v=0.0.14');
await import('./dispatch/ems-transport-v0.0.15.js?v=0.0.15');
await import('./dispatch/response-tablet-v0.0.16.js?v=0.0.16');
await import('./dispatch/after-action-review-v0.0.17.js?v=0.0.17');
await import('./dispatch/integration-polish-v0.0.18.js?v=0.0.18');
const VERSION='0.0.43';
document.querySelector('#version-pill')?.replaceChildren('v'+VERSION);
document.documentElement.dataset.dispatchPrototypeVersion=VERSION;
const style=document.createElement('style');style.textContent=`@media(max-width:600px){#dispatch-hud{top:86px!important;right:8px!important;width:min(270px,calc(100vw - 112px))!important;max-height:32vh;overflow:auto}.dispatch-mode-badge{left:12px!important;bottom:112px!important;max-width:245px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}#boot-run-box.minimized{left:auto!important;right:8px!important;top:auto!important;bottom:12px!important;width:auto!important;transform:none!important;padding:0!important}#dispatch-diagnostics{right:72px!important;bottom:8px!important;max-width:180px!important;padding:4px 6px!important}#street-card{max-width:calc(100vw - 112px)!important}}`;document.head.append(style);
window.addEventListener('city-dispatch-spawned',()=>{const center=document.querySelector('#mobile-recenter');[250,800,1600,2800].forEach(delay=>setTimeout(()=>center?.click(),delay));});
window.__BOOT_RUN_LOG__?.('APP MODULE: v'+VERSION+' completion pass loaded');