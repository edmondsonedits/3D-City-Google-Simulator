// Experimental-only loader. It derives the proven v0.0.8 runtime in-memory without
// changing the production module, then exposes the small spawn API dispatch needs.
const sourceUrl = new URL('../app-v0.0.8.js?v=0.0.8', import.meta.url);
const response = await fetch(sourceUrl, { cache: 'no-store' });
if (!response.ok) throw new Error(`Unable to load isolated city runtime (${response.status})`);
let source = await response.text();

const logicUrl = new URL('../logic.js?v=0.0.8', import.meta.url).href;
const surfaceUrl = new URL('../surface.js?v=0.0.8', import.meta.url).href;
source = source
  .replace("from './logic.js?v=0.0.8';", `from '${logicUrl}';`)
  .replace("from './surface.js?v=0.0.8';", `from '${surfaceUrl}';`);

const setupMarker = 'setupGlobalInput(); setupJoystick(); setupUi(); requestAnimationFrame(tick);';
if (!source.includes(setupMarker)) throw new Error('v0.0.8 runtime setup marker changed; refusing unsafe patch.');
source = source.replace(setupMarker, `
function dispatchSpawnAtCoordinates(spawn) {
  const lat = Number(spawn?.lat), lon = Number(spawn?.lon), headingDeg = Number(spawn?.headingDeg);
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) throw new Error('Invalid dispatch spawn latitude.');
  if (!Number.isFinite(lon) || lon < -180 || lon > 180) throw new Error('Invalid dispatch spawn longitude.');
  if (!Number.isFinite(headingDeg)) throw new Error('Invalid dispatch spawn heading.');
  if (!state.demoRunning || !state.viewer) throw new Error('3D driving runtime is not ready.');
  state.station = {
    id: String(spawn.id || 'dispatch-base'),
    name: String(spawn.name || 'Dispatch base'),
    address: String(spawn.address || ''),
    lat, lon, headingDeg,
  };
  state.trainingRoadsEnabled = distanceMeters(lat, lon, PETERBOROUGH_CENTER.lat, PETERBOROUGH_CENTER.lon) < 30000;
  resetVehicle({ forceSurface: true });
  dom.station.textContent = state.station.name;
  updateRoadMatch();
  state.viewer.camera.setView({
    destination: Cesium.Cartesian3.fromDegrees(lon, lat, 340),
    orientation: { heading: state.vehicle.heading, pitch: -1.12, roll: 0 },
  });
  setStatus(dom.surfaceStatus, 'Surface: seeking 3D road', 'warn');
  dom.setupOverlay.hidden = true;
  state.lastFrame = performance.now();
  refreshSurfaceHeight();
  updateTruckEntity();
  recenterCamera();
  window.dispatchEvent(new CustomEvent('city-dispatch-spawned', { detail: { ...state.station } }));
  return { ...state.vehicle };
}

${setupMarker}`);

const runtimeMarker = 'window.__CITY_DEMO_RUNTIME__ = Object.freeze({ snapshot: () => ({';
if (!source.includes(runtimeMarker)) throw new Error('v0.0.8 runtime export marker changed; refusing unsafe patch.');
source = source.replace(runtimeMarker, 'window.__CITY_DEMO_RUNTIME__ = Object.freeze({ spawnAtCoordinates: dispatchSpawnAtCoordinates, snapshot: () => ({');

const blobUrl = URL.createObjectURL(new Blob([source], { type: 'text/javascript' }));
try {
  await import(blobUrl);
} finally {
  URL.revokeObjectURL(blobUrl);
}

if (typeof window.__CITY_DEMO_RUNTIME__?.spawnAtCoordinates !== 'function') {
  throw new Error('Experimental coordinate spawn API failed to initialize.');
}
