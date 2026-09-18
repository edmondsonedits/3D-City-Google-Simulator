import { peterboroughDataReady } from './dispatch/peterborough-data-adapter-v0.0.10.js?v=0.0.10';

window.DISPATCH_PROTOTYPE = Object.freeze({ version:'0.0.10', cityDataReady:peterboroughDataReady });

peterboroughDataReady.then(data => {
  document.documentElement.dataset.dispatchPrototypeData = 'ready';
  document.documentElement.dataset.dispatchPackageVersion = data.city.packageVersion;
  document.documentElement.dataset.dispatchCallCount = String(data.dispatchCalls.length);
}).catch(error => {
  document.documentElement.dataset.dispatchPrototypeData = 'error';
  console.error('[Dispatch prototype] Peterborough data adapter failed:', error);
});

// The production v0.0.8 runtime is imported directly as a stable baseline. Future
// dispatch behavior is added in this isolated runtime rather than production app.js.
await import('./app-v0.0.8.js?v=0.0.8');
