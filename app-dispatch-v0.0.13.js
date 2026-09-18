// v0.0.13 completes Stage 3 on top of the validated v0.0.12 isolated runtime.
await import('./app-dispatch-v0.0.12.js?v=0.0.12');
await import('./dispatch/dispatch-gameplay-v0.0.13.js?v=0.0.13');
const pill=document.querySelector('#version-pill');if(pill)pill.textContent='v0.0.13';
document.documentElement.dataset.dispatchPrototypeVersion='0.0.13';
