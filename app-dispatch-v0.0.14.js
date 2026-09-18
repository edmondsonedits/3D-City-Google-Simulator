// v0.0.14 completes Stage 4: isolated viewer access, Cesium incident marker, nearest-road arrival target, automatic on-scene.
const sourceUrl=new URL('./app-dispatch-v0.0.12.js?v=0.0.12',import.meta.url);
const response=await fetch(sourceUrl,{cache:'no-store'});if(!response.ok)throw new Error(`Unable to load dispatch UI baseline (${response.status})`);
let source=await response.text();
const adapterUrl=new URL('./dispatch/peterborough-data-adapter-v0.0.10.js?v=0.0.10',import.meta.url).href;
const runtimeUrl=new URL('./dispatch/isolated-city-runtime-v0.0.14.js?v=0.0.14',import.meta.url).href;
source=source.replace("new URL('./dispatch/peterborough-data-adapter-v0.0.10.js?v=0.0.10', import.meta.url).href",`'${adapterUrl}'`).replace("new URL('./dispatch/isolated-city-runtime-v0.0.12.js?v=0.0.12', import.meta.url).href",`'${runtimeUrl}'`).replace("const VERSION = '0.0.12';","const VERSION = '0.0.14';");
const blobUrl=URL.createObjectURL(new Blob([source],{type:'text/javascript'}));try{await import(blobUrl);}finally{URL.revokeObjectURL(blobUrl);}
await import('./dispatch/dispatch-gameplay-v0.0.13.js?v=0.0.13');
await import('./dispatch/incident-spatial-v0.0.14.js?v=0.0.14');
const pill=document.querySelector('#version-pill');if(pill)pill.textContent='v0.0.14';document.documentElement.dataset.dispatchPrototypeVersion='0.0.14';
