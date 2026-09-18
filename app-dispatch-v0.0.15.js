// v0.0.15 completes Stage 5: EMS pickup, PRHC transport, authoritative hospital arrival and timing.
await import('./app-dispatch-v0.0.14.js?v=0.0.14');
await import('./dispatch/ems-transport-v0.0.15.js?v=0.0.15');
const pill=document.querySelector('#version-pill');if(pill)pill.textContent='v0.0.15';document.documentElement.dataset.dispatchPrototypeVersion='0.0.15';
