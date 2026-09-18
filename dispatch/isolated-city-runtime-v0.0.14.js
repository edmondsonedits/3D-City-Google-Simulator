// v0.0.14 derives the isolated coordinate-spawn runtime and exposes only the viewer accessor Stage 4 needs.
const sourceUrl=new URL('./isolated-city-runtime-v0.0.12.js?v=0.0.12',import.meta.url);
const response=await fetch(sourceUrl,{cache:'no-store'});if(!response.ok)throw new Error(`Unable to load isolated runtime baseline (${response.status})`);
let source=await response.text();
const appUrl=new URL('../app-v0.0.8.js?v=0.0.8',import.meta.url).href;
source=source.replace("new URL('../app-v0.0.8.js?v=0.0.8', import.meta.url)",`new URL('${appUrl}')`);
const old="window.__CITY_DEMO_RUNTIME__ = Object.freeze({ spawnAtCoordinates: dispatchSpawnAtCoordinates, snapshot: () => ({";
const replacement="window.__CITY_DEMO_RUNTIME__ = Object.freeze({ spawnAtCoordinates: dispatchSpawnAtCoordinates, getViewer: () => state.viewer && !state.viewer.isDestroyed() ? state.viewer : null, snapshot: () => ({";
if(!source.includes(old))throw new Error('v0.0.12 runtime export marker changed; refusing unsafe patch.');source=source.replace(old,replacement);
const blobUrl=URL.createObjectURL(new Blob([source],{type:'text/javascript'}));try{await import(blobUrl);}finally{URL.revokeObjectURL(blobUrl);}
if(typeof window.__CITY_DEMO_RUNTIME__?.getViewer!=='function')throw new Error('Experimental viewer accessor failed to initialize.');
