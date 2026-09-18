// v0.0.12 derives the Stage-2 UI from v0.0.11 while swapping in the isolated
// city runtime that supports exact authoritative coordinates + heading.
const sourceUrl = new URL('./app-dispatch-v0.0.11.js?v=0.0.11', import.meta.url);
const response = await fetch(sourceUrl, { cache: 'no-store' });
if (!response.ok) throw new Error(`Unable to load dispatch UI baseline (${response.status})`);
let source = await response.text();
const adapterUrl = new URL('./dispatch/peterborough-data-adapter-v0.0.10.js?v=0.0.10', import.meta.url).href;
const runtimeUrl = new URL('./dispatch/isolated-city-runtime-v0.0.12.js?v=0.0.12', import.meta.url).href;
source = source
  .replace("from './dispatch/peterborough-data-adapter-v0.0.10.js?v=0.0.10';", `from '${adapterUrl}';`)
  .replace("const VERSION = '0.0.11';", "const VERSION = '0.0.12';")
  .replace("await import('./app-v0.0.8.js?v=0.0.8');", `await import('${runtimeUrl}');`);

const oldSpawn = `const field=document.querySelector('#spawn-address'); const button=document.querySelector('#spawn-address-button');
    if(field&&button){field.value=\`${'${base.spawnLat}'}, ${'${base.spawnLng}'}\`;button.click();}
    document.documentElement.dataset.dispatchRequestedHeading=String(base.spawnHeading);`;
const newSpawn = `const spawned = window.__CITY_DEMO_RUNTIME__?.spawnAtCoordinates?.({
      id: base.id, name: base.name, address: base.address,
      lat: base.spawnLat, lon: base.spawnLng, headingDeg: base.spawnHeading,
    });
    if (!spawned) throw new Error('Authoritative dispatch spawn API is unavailable.');
    document.documentElement.dataset.dispatchRequestedHeading=String(base.spawnHeading);
    document.documentElement.dataset.dispatchAppliedHeading=String((spawned.heading * 180 / Math.PI + 360) % 360);`;
if (!source.includes(oldSpawn)) throw new Error('v0.0.11 base-launch marker changed; refusing unsafe patch.');
source = source.replace(oldSpawn, newSpawn);
source = source.replace('// Stage 2 launches the proven Peterborough 3D world first. The isolated runtime then\n  // uses its existing Ontario geocoder spawn path with the authoritative coordinate pair.\n  // A dedicated runtime spawn API is the remaining Stage-2 gate because v0.0.8 keeps\n  // vehicle state private; we intentionally do not mutate production app.js.\n', '// Stage 2 launches the isolated Peterborough 3D world, then applies the exact authoritative base coordinate and heading through the experimental spawn API.\n');

const blobUrl = URL.createObjectURL(new Blob([source], { type: 'text/javascript' }));
try { await import(blobUrl); }
finally { URL.revokeObjectURL(blobUrl); }
