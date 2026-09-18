// v0.0.16 completes Stage 6: responsive 2D dispatch tablet and independent OSM-road route guidance.
await import('./app-dispatch-v0.0.15.js?v=0.0.15');
await import('./dispatch/response-tablet-v0.0.16.js?v=0.0.16');
const pill=document.querySelector('#version-pill');if(pill)pill.textContent='v0.0.16';document.documentElement.dataset.dispatchPrototypeVersion='0.0.16';
