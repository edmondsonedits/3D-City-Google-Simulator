// v0.0.18 completes Stage 8: normalized editor/data handoff, diagnostics and cleanup coordination.
await import('./app-dispatch-v0.0.17.js?v=0.0.17');
await import('./dispatch/integration-polish-v0.0.18.js?v=0.0.18');
const pill=document.querySelector('#version-pill');if(pill)pill.textContent='v0.0.18';document.documentElement.dataset.dispatchPrototypeVersion='0.0.18';
