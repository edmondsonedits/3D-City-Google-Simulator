// v0.0.19 is the post-Stage-8 validation release. Runtime behavior remains the v0.0.18 merge candidate while expanded integration tests exercise its contracts.
await import('./app-dispatch-v0.0.18.js?v=0.0.18');
const pill=document.querySelector('#version-pill');if(pill)pill.textContent='v0.0.19';document.documentElement.dataset.dispatchPrototypeVersion='0.0.19';
