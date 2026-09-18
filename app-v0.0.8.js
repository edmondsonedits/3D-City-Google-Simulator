import {
  TRUCK,
  clamp,
  expStep,
  roadHeadingDifference,
  wrapAngle,
  advanceVehicle,
  roadAllowsFullSpeed,
} from './logic.js?v=0.0.8';
import { SurfaceAlignmentService } from './surface.js?v=0.0.8';

const VERSION = '0.0.8';
const Cesium = window.Cesium;
const TRUCK_MODEL_URL = './assets/generic-pumper.glb';
const ROAD_DATA_URL = './data/osm-public-roads.geojson';
const surfaceAlignment = new SurfaceAlignmentService();

const STATIONS = Object.freeze({
  station1: { id: 'station1', name: 'Station 1', address: '210 Sherbrooke St.', lat: 44.30109, lon: -78.32342, headingDeg: 177 },
  station2: { id: 'station2', name: 'Station 2', address: '100 Marina Blvd.', lat: 44.32834, lon: -78.32090, headingDeg: 99 },
  station3: { id: 'station3', name: 'Station 3', address: '1359 Clonsilla Ave.', lat: 44.29079, lon: -78.33747, headingDeg: 87 },
});

const CAMERA_PRESETS = Object.freeze({
  cab: { id: 'cab', label: 'Cab POV', range: 2.7, pitch: -0.08, targetHeight: 2.55, lookAhead: 8.5, hideTruck: true },
  close: { id: 'close', label: 'Close chase', range: 10, pitch: -0.22, targetHeight: 2.0, lookAhead: 3.0 },
  chase: { id: 'chase', label: 'Standard chase', range: 18, pitch: -0.34, targetHeight: 1.9, lookAhead: 2.2 },
  wide: { id: 'wide', label: 'Wide chase', range: 29, pitch: -0.40, targetHeight: 2.0, lookAhead: 2.0 },
  high: { id: 'high', label: 'High angle', range: 24, pitch: -0.64, targetHeight: 2.2, lookAhead: 1.8 },
  tactical: { id: 'tactical', label: 'Tactical overhead', range: 55, pitch: -0.92, targetHeight: 3.0, lookAhead: 3.0 },
  birdsEye: { id: 'birdsEye', label: 'Bird’s-eye · GTA', range: 95, pitch: -1.24, targetHeight: 4.0, lookAhead: 4.0 },
});
const CAMERA_ORDER = ['cab', 'close', 'chase', 'wide', 'high', 'tactical', 'birdsEye'];
const QUALITY_SSE = Object.freeze({ performance: 24, balanced: 14, high: 8 });
const FALLBACK_HEIGHT_M = 190;
const SURFACE_SAMPLE_INTERVAL = 0.28;
const ROAD_MATCH_INTERVAL = 0.18;
const PETERBOROUGH_CENTER = { lat: 44.3091, lon: -78.3197 };

const ONTARIO_VIEW = Cesium.Rectangle.fromDegrees(-95.5, 41.55, -74.0, 56.95);
const ONTARIO_CITIES = Object.freeze([
  { name: 'Barrie', lat: 44.3894, lon: -79.6903, radiusKm: 7, major: true },
  { name: 'Belleville', lat: 44.1628, lon: -77.3832, radiusKm: 10 },
  { name: 'Brampton', lat: 43.7315, lon: -79.7624, radiusKm: 10, major: true },
  { name: 'Brant', lat: 43.1167, lon: -80.3833, radiusKm: 16 },
  { name: 'Brantford', lat: 43.1394, lon: -80.2644, radiusKm: 7 },
  { name: 'Brockville', lat: 44.5895, lon: -75.6843, radiusKm: 4 },
  { name: 'Burlington', lat: 43.3255, lon: -79.7990, radiusKm: 9 },
  { name: 'Cambridge', lat: 43.3616, lon: -80.3144, radiusKm: 7 },
  { name: 'Clarence-Rockland', lat: 45.5501, lon: -75.2910, radiusKm: 11 },
  { name: 'Cornwall', lat: 45.0181, lon: -74.7281, radiusKm: 6 },
  { name: 'Dryden', lat: 49.7833, lon: -92.8336, radiusKm: 6 },
  { name: 'Elliot Lake', lat: 46.3833, lon: -82.6500, radiusKm: 15 },
  { name: 'Greater Sudbury', lat: 46.4917, lon: -80.9930, radiusKm: 32, major: true },
  { name: 'Guelph', lat: 43.5448, lon: -80.2482, radiusKm: 7 },
  { name: 'Haldimand County', lat: 42.9287, lon: -79.8683, radiusKm: 20 },
  { name: 'Hamilton', lat: 43.2557, lon: -79.8711, radiusKm: 19, major: true },
  { name: 'Kawartha Lakes', lat: 44.3501, lon: -78.7428, radiusKm: 32 },
  { name: 'Kenora', lat: 49.7670, lon: -94.4894, radiusKm: 10, major: true },
  { name: 'Kingston', lat: 44.2312, lon: -76.4860, radiusKm: 12, major: true },
  { name: 'Kitchener', lat: 43.4516, lon: -80.4925, radiusKm: 8, major: true },
  { name: 'London', lat: 42.9849, lon: -81.2453, radiusKm: 12, major: true },
  { name: 'Markham', lat: 43.8561, lon: -79.3370, radiusKm: 9 },
  { name: 'Mississauga', lat: 43.5890, lon: -79.6441, radiusKm: 11, major: true },
  { name: 'Niagara Falls', lat: 43.0896, lon: -79.0849, radiusKm: 9 },
  { name: 'Norfolk County', lat: 42.8354, lon: -80.3045, radiusKm: 22 },
  { name: 'North Bay', lat: 46.3091, lon: -79.4608, radiusKm: 10, major: true },
  { name: 'Orillia', lat: 44.6082, lon: -79.4197, radiusKm: 5 },
  { name: 'Oshawa', lat: 43.8971, lon: -78.8658, radiusKm: 8 },
  { name: 'Ottawa', lat: 45.4215, lon: -75.6972, radiusKm: 30, major: true },
  { name: 'Owen Sound', lat: 44.5690, lon: -80.9406, radiusKm: 4 },
  { name: 'Pembroke', lat: 45.8267, lon: -77.1109, radiusKm: 3 },
  { name: 'Peterborough', lat: 44.3091, lon: -78.3197, radiusKm: 6, major: true },
  { name: 'Pickering', lat: 43.8354, lon: -79.0890, radiusKm: 10 },
  { name: 'Port Colborne', lat: 42.8865, lon: -79.2509, radiusKm: 7 },
  { name: 'Prince Edward County', lat: 44.0077, lon: -77.1427, radiusKm: 18 },
  { name: 'Quinte West', lat: 44.1839, lon: -77.5662, radiusKm: 13 },
  { name: 'Richmond Hill', lat: 43.8828, lon: -79.4403, radiusKm: 7 },
  { name: 'Sarnia', lat: 42.9745, lon: -82.4066, radiusKm: 8 },
  { name: 'Sault Ste. Marie', lat: 46.5136, lon: -84.3358, radiusKm: 10, major: true },
  { name: 'St. Catharines', lat: 43.1594, lon: -79.2469, radiusKm: 7 },
  { name: 'St. Thomas', lat: 42.7777, lon: -81.1827, radiusKm: 5 },
  { name: 'Stratford', lat: 43.3700, lon: -80.9822, radiusKm: 5 },
  { name: 'Temiskaming Shores', lat: 47.4938, lon: -79.7153, radiusKm: 9 },
  { name: 'Thorold', lat: 43.1236, lon: -79.1990, radiusKm: 6 },
  { name: 'Thunder Bay', lat: 48.3809, lon: -89.2477, radiusKm: 11, major: true },
  { name: 'Timmins', lat: 48.4758, lon: -81.3305, radiusKm: 30, major: true },
  { name: 'Toronto', lat: 43.6532, lon: -79.3832, radiusKm: 14, major: true },
  { name: 'Vaughan', lat: 43.8372, lon: -79.5083, radiusKm: 10 },
  { name: 'Waterloo', lat: 43.4643, lon: -80.5204, radiusKm: 6 },
  { name: 'Welland', lat: 42.9922, lon: -79.2483, radiusKm: 6 },
  { name: 'Windsor', lat: 42.3149, lon: -83.0364, radiusKm: 8, major: true },
  { name: 'Woodstock', lat: 43.1306, lon: -80.7466, radiusKm: 6 },
]);

const dom = {
  container: document.querySelector('#cesium-container'),
  setupOverlay: document.querySelector('#setup-overlay'),
  setupForm: document.querySelector('#setup-form'),
  setupButton: document.querySelector('#setup-button'),
  apiKey: document.querySelector('#api-key'),
  stationSelect: document.querySelector('#station-select'),
  customCityField: document.querySelector('#custom-city-field'),
  cityInput: document.querySelector('#ontario-city-input'),
  cityPickerOverlay: document.querySelector('#city-picker-overlay'),
  cityPickerName: document.querySelector('#city-picker-name'),
  cityPickerHint: document.querySelector('#city-picker-hint'),
  cityPickerStart: document.querySelector('#city-picker-start'),
  cityPickerBack: document.querySelector('#city-picker-back'),
  spawnTools: document.querySelector('#spawn-tools'),
  spawnAddress: document.querySelector('#spawn-address'),
  spawnAddressButton: document.querySelector('#spawn-address-button'),
  recoverSurfaceButton: document.querySelector('#recover-surface-button'),
  spawnToolStatus: document.querySelector('#spawn-tool-status'),
  qualitySelect: document.querySelector('#quality-select'),
  cameraSelect: document.querySelector('#camera-select'),
  cameraCycle: document.querySelector('#camera-cycle-button'),
  launchButton: document.querySelector('#launch-button'),
  resumeButton: document.querySelector('#resume-button'),
  setupError: document.querySelector('#setup-error'),
  streetName: document.querySelector('#street-name'),
  roadStatus: document.querySelector('#road-status'),
  speed: document.querySelector('#speed-value'),
  gear: document.querySelector('#gear-value'),
  camera: document.querySelector('#camera-value'),
  station: document.querySelector('#station-value'),
  tilesStatus: document.querySelector('#tiles-status'),
  surfaceStatus: document.querySelector('#surface-status'),
  diagnosticsToggle: document.querySelector('#diagnostics-toggle'),
  diagnosticsPanel: document.querySelector('#diagnostics-panel'),
  diagnosticsClose: document.querySelector('#diagnostics-close'),
  diagFps: document.querySelector('#diag-fps'),
  diagTiles: document.querySelector('#diag-tiles'),
  diagRoads: document.querySelector('#diag-roads'),
  diagHeight: document.querySelector('#diag-height'),
  diagRoadDistance: document.querySelector('#diag-road-distance'),
  diagPosition: document.querySelector('#diag-position'),
  flipModel: document.querySelector('#flip-model'),
  resetTruck: document.querySelector('#reset-truck'),
  joystick: document.querySelector('#joystick'),
  joystickKnob: document.querySelector('#joystick-knob'),
  mobileBrake: document.querySelector('#mobile-brake'),
  mobileRecenter: document.querySelector('#mobile-recenter'),
  mobileCamera: document.querySelector('#mobile-camera'),
  version: document.querySelector('#version-pill'),
};

dom.version.textContent = `v${VERSION}`;

// Prevent mobile browsers from treating driving gestures as text-copy/long-press gestures.
// Keep this scoped to the live driving surface so setup inputs remain selectable/editable.
const driveGestureSurfaces = [
  dom.container,
  document.querySelector('#mobile-controls'),
  document.querySelector('.compact-topbar'),
  document.querySelector('#street-card'),
  document.querySelector('#drive-hud'),
].filter(Boolean);
for (const surface of driveGestureSurfaces) {
  surface.addEventListener('contextmenu', event => event.preventDefault());
  surface.addEventListener('selectstart', event => event.preventDefault());
  surface.addEventListener('dragstart', event => event.preventDefault());
}

const state = {
  viewer: null,
  tileset: null,
  truckEntity: null,
  station: STATIONS.station1,
  quality: 'balanced',
  trainingRoadsEnabled: true,
  vehicle: { lat: STATIONS.station1.lat, lon: STATIONS.station1.lon, heading: STATIONS.station1.headingDeg * Math.PI / 180, speed: 0, steering: 0 },
  surface: { targetHeight: FALLBACK_HEIGHT_M, displayHeight: FALLBACK_HEIGHT_M, locked: false, pending: false, elapsed: 999, mostDetailedTried: false, lastAcceptedAt: 0 },
  roadMatcher: null,
  roadMatch: null,
  roadElapsed: 999,
  roadDataStatus: 'Loading',
  camera: { mode: 'FOLLOW', preset: 'chase', yawOffset: 0, pitch: CAMERA_PRESETS.chase.pitch, range: CAMERA_PRESETS.chase.range },
  modelYawOffset: Math.PI / 2,
  demoRunning: false,
  viewerAbort: null,
  lastFrame: performance.now(),
  fpsFrames: 0,
  fpsElapsed: 0,
  fps: 0,
  hudElapsed: 0,
  surfaceGeneration: 0,
  tileFailure: false,
  distanceDriven: 0,
};

const picker = {
  viewer: null,
  handler: null,
  cityEntities: [],
  selectedIndex: ONTARIO_CITIES.findIndex(city => city.name === 'Peterborough'),
  apiKey: '',
  quality: 'balanced',
  cameraPreset: 'chase',
  centerCheckAt: 0,
  launching: false,
};

const input = { keys: new Set(), joystickX: 0, joystickY: 0, mobileBrake: false };
let googleMapsKey = null;
let googleMapsPromise = null;

function setStatus(element, text, kind = '') {
  element.textContent = text;
  element.classList.remove('good', 'warn', 'bad');
  if (kind) element.classList.add(kind);
}
function showSetupError(message) { dom.setupError.textContent = message; dom.setupError.hidden = false; }
function hideSetupError() { dom.setupError.hidden = true; dom.setupError.textContent = ''; }
function isTypingTarget(target) { return target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement; }
function saveSetting(name, value) { try { sessionStorage.setItem(name, value); } catch {} }
function readSetting(name) { try { return sessionStorage.getItem(name); } catch { return null; } }

function clearDriveInput() {
  input.keys.clear(); input.joystickX = 0; input.joystickY = 0; input.mobileBrake = false;
  dom.joystickKnob.style.transform = 'translate(-50%, -50%)';
  dom.mobileBrake.classList.remove('is-down');
  window.dispatchEvent(new Event('city-input-reset'));
}

function getDriveInput() {
  let throttle = 0, steer = 0;
  if (input.keys.has('KeyW') || input.keys.has('ArrowUp')) throttle += 1;
  if (input.keys.has('KeyS') || input.keys.has('ArrowDown')) throttle -= 1;
  if (input.keys.has('KeyD') || input.keys.has('ArrowRight')) steer += 1;
  if (input.keys.has('KeyA') || input.keys.has('ArrowLeft')) steer -= 1;
  if (Math.abs(input.joystickY) > Math.abs(throttle)) throttle = -input.joystickY;
  if (Math.abs(input.joystickX) > Math.abs(steer)) steer = input.joystickX;
  return { throttle: clamp(throttle, -1, 1), steer: clamp(steer, -1, 1), brake: input.mobileBrake || input.keys.has('Space') ? 1 : 0 };
}
function gearForSpeed(speed, driveInput) {
  if (speed > 0.25) return 'D'; if (speed < -0.25) return 'R';
  if (driveInput.throttle > 0.05) return 'D'; if (driveInput.throttle < -0.05) return 'R'; return 'N';
}
function distanceMeters(lat1, lon1, lat2, lon2) {
  const meanLat = ((lat1 + lat2) * 0.5) * Math.PI / 180;
  const north = (lat2 - lat1) * 111_320;
  const east = (lon2 - lon1) * 111_320 * Math.cos(meanLat);
  return Math.hypot(north, east);
}
function pointToSegmentMeters(lat, lon, aLat, aLon, bLat, bLon) {
  const cosLat = Math.cos(lat * Math.PI / 180);
  const ax = (aLon - lon) * 111_320 * cosLat, ay = (aLat - lat) * 111_320;
  const bx = (bLon - lon) * 111_320 * cosLat, by = (bLat - lat) * 111_320;
  const dx = bx - ax, dy = by - ay, lenSq = dx * dx + dy * dy;
  const t = lenSq > 0 ? clamp(-(ax * dx + ay * dy) / lenSq, 0, 1) : 0;
  return Math.hypot(ax + dx * t, ay + dy * t);
}
function segmentHeading(aLat, aLon, bLat, bLon) {
  const meanLat = ((aLat + bLat) * 0.5) * Math.PI / 180;
  return Math.atan2((bLon - aLon) * 111_320 * Math.cos(meanLat), (bLat - aLat) * 111_320);
}
function streetName(properties = {}) {
  return String(properties.name || properties.NAME || properties.full_name || properties.FULL_NAME || properties.street || properties.STREET || properties.road || properties.ROAD || properties.ref || properties.REF || 'Unnamed road').trim() || 'Unnamed road';
}

function buildRoadMatcher(geojson) {
  const cellSize = 0.002, grid = new Map(); let segmentCount = 0;
  const addToCell = (key, segment) => { let list = grid.get(key); if (!list) grid.set(key, (list = [])); list.push(segment); };
  const addLine = (coordinates, name) => {
    if (!Array.isArray(coordinates) || coordinates.length < 2) return;
    for (let i = 1; i < coordinates.length; i += 1) {
      const a = coordinates[i - 1], b = coordinates[i];
      if (!Array.isArray(a) || !Array.isArray(b)) continue;
      const aLon = Number(a[0]), aLat = Number(a[1]), bLon = Number(b[0]), bLat = Number(b[1]);
      if (![aLon, aLat, bLon, bLat].every(Number.isFinite)) continue;
      const segment = { aLat, aLon, bLat, bLon, name, heading: segmentHeading(aLat, aLon, bLat, bLon) }; segmentCount += 1;
      for (let y = Math.floor(Math.min(aLat, bLat) / cellSize); y <= Math.floor(Math.max(aLat, bLat) / cellSize); y += 1) {
        for (let x = Math.floor(Math.min(aLon, bLon) / cellSize); x <= Math.floor(Math.max(aLon, bLon) / cellSize); x += 1) addToCell(`${y}:${x}`, segment);
      }
    }
  };
  for (const feature of geojson?.features || []) {
    const geometry = feature?.geometry; if (!geometry) continue; const name = streetName(feature.properties);
    if (geometry.type === 'LineString') addLine(geometry.coordinates, name);
    else if (geometry.type === 'MultiLineString') for (const line of geometry.coordinates || []) addLine(line, name);
  }
  let stickyName = null;
  return { segmentCount, match(lat, lon, heading, speed) {
    const cy = Math.floor(lat / cellSize), cx = Math.floor(lon / cellSize), candidates = new Set();
    for (let oy = -1; oy <= 1; oy += 1) for (let ox = -1; ox <= 1; ox += 1) for (const segment of grid.get(`${cy + oy}:${cx + ox}`) || []) candidates.add(segment);
    let best = null;
    for (const segment of candidates) {
      const distance = pointToSegmentMeters(lat, lon, segment.aLat, segment.aLon, segment.bLat, segment.bLon); if (distance > 70) continue;
      const score = distance + (Math.abs(speed) > 1.5 ? roadHeadingDifference(heading, segment.heading) * 6 : 0) + (stickyName && segment.name === stickyName ? -3.5 : 0);
      if (!best || score < best.score) best = { ...segment, distance, score };
    }
    if (best) stickyName = best.name; return best;
  }};
}

async function loadRoadData() {
  try {
    const response = await fetch(ROAD_DATA_URL, { cache: 'force-cache', signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    state.roadMatcher = buildRoadMatcher(await response.json());
    if (!state.roadMatcher.segmentCount) throw new Error('Road file contains no usable segments');
    state.roadDataStatus = `${state.roadMatcher.segmentCount.toLocaleString()} segments`;
    if (state.trainingRoadsEnabled) dom.diagRoads.textContent = state.roadDataStatus;
    return state.roadMatcher;
  } catch (error) {
    state.roadMatcher = null; state.roadDataStatus = 'Unavailable'; console.warn('Road data unavailable:', error);
    dom.diagRoads.textContent = 'Unavailable — driving still works'; return null;
  }
}
const roadDataPromise = loadRoadData();

function loadGoogleMapsGeocoder(apiKey) {
  if (window.google?.maps?.Geocoder && googleMapsKey === apiKey) return Promise.resolve();
  if (googleMapsPromise && googleMapsKey === apiKey) return googleMapsPromise;
  if (window.google?.maps?.Geocoder && googleMapsKey && googleMapsKey !== apiKey) throw new Error('Reload the page after changing the Google API key.');
  googleMapsKey = apiKey;
  googleMapsPromise = new Promise((resolve, reject) => {
    const callback = `__googleMapsReady_${Date.now()}`;
    window[callback] = () => { delete window[callback]; window.google?.maps?.Geocoder ? resolve() : reject(new Error('Google geocoder unavailable')); };
    const script = document.createElement('script');
    script.id = 'google-maps-js'; script.async = true; script.defer = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&loading=async&callback=${callback}`;
    script.onerror = () => { delete window[callback]; reject(new Error('Google Maps JavaScript API failed to load')); };
    document.head.append(script);
  });
  return googleMapsPromise;
}

async function geocodeOntarioCity(apiKey, query) {
  const city = query.trim();
  if (!city) throw new Error('Enter an Ontario city or town.');
  await loadGoogleMapsGeocoder(apiKey);
  const geocoder = new window.google.maps.Geocoder();
  const results = await new Promise((resolve, reject) => {
    geocoder.geocode({ address: `${city}, Ontario, Canada`, componentRestrictions: { country: 'CA', administrativeArea: 'ON' } }, (items, status) => {
      if (status === 'OK' && items?.length) resolve(items); else reject(new Error('Ontario city not found'));
    });
  });
  const result = results.find(item => item.address_components?.some(component => component.types?.includes('administrative_area_level_1') && (component.short_name === 'ON' || component.long_name === 'Ontario')));
  if (!result) throw new Error('That location is not in Ontario.');
  const location = result.geometry?.location;
  if (!location) throw new Error('Google returned no coordinates for that Ontario location.');
  const locality = result.address_components?.find(component => component.types?.some(type => ['locality', 'postal_town', 'administrative_area_level_3'].includes(type)))?.long_name || city;
  return { id: 'ontario', name: locality, address: result.formatted_address || `${locality}, Ontario`, lat: location.lat(), lon: location.lng(), headingDeg: 0 };
}

async function geocodeOntarioAddress(apiKey, query) {
  const address = query.trim();
  if (!address) throw new Error('Enter an Ontario address.');
  await loadGoogleMapsGeocoder(apiKey);
  const geocoder = new window.google.maps.Geocoder();
  const results = await new Promise((resolve, reject) => {
    geocoder.geocode({ address, componentRestrictions: { country: 'CA', administrativeArea: 'ON' } }, (items, status) => {
      if (status === 'OK' && items?.length) resolve(items); else reject(new Error('Ontario address not found'));
    });
  });
  const result = results.find(item => item.address_components?.some(component => component.types?.includes('administrative_area_level_1') && (component.short_name === 'ON' || component.long_name === 'Ontario')));
  if (!result) throw new Error('That address is not in Ontario.');
  const location = result.geometry?.location;
  if (!location) throw new Error('Google returned no coordinates for that Ontario address.');
  return {
    id: 'address',
    name: result.formatted_address || address,
    address: result.formatted_address || address,
    lat: location.lat(),
    lon: location.lng(),
    headingDeg: 0,
  };
}

function currentPreset() { return CAMERA_PRESETS[state.camera.preset] || CAMERA_PRESETS.chase; }
function applyCameraPreset(id, { announce = true } = {}) {
  const preset = CAMERA_PRESETS[id] || CAMERA_PRESETS.chase;
  state.camera.preset = preset.id; if (!state.demoRunning) state.camera.range = preset.range; state.camera.pitch = preset.pitch; state.camera.yawOffset = 0;
  if (state.truckEntity) state.truckEntity.show = !preset.hideTruck;
  if (state.demoRunning) {
    state.camera.mode = 'RETURNING';
    if (announce) window.dispatchEvent(new CustomEvent('city-camera-mode', { detail: 'RETURNING' }));
  }
  if (dom.cameraSelect) dom.cameraSelect.value = preset.id;
  saveSetting('google3d.cameraPreset', preset.id);
}
function cycleCameraPreset() {
  const index = CAMERA_ORDER.indexOf(state.camera.preset);
  applyCameraPreset(CAMERA_ORDER[(index + 1) % CAMERA_ORDER.length]);
}
function recenterCamera() { state.camera.mode = 'RETURNING'; window.dispatchEvent(new CustomEvent('city-camera-mode', { detail: 'RETURNING' })); }

function resetVehicle({ forceSurface = true } = {}) {
  clearDriveInput(); state.surfaceGeneration += 1; state.surface.pending = false; state.distanceDriven = 0;
  const spawn = state.station;
  state.vehicle = { lat: spawn.lat, lon: spawn.lon, heading: spawn.headingDeg * Math.PI / 180, speed: 0, steering: 0 };
  state.roadMatch = null; state.camera.mode = 'RETURNING'; state.camera.yawOffset = 0; state.camera.pitch = currentPreset().pitch;
  if (forceSurface) {
    surfaceAlignment.reset(); state.surface.locked = false; state.surface.mostDetailedTried = false;
    state.surface.targetHeight = FALLBACK_HEIGHT_M; state.surface.displayHeight = FALLBACK_HEIGHT_M; state.surface.elapsed = 999;
  }
  window.dispatchEvent(new Event('city-session-reset'));
}

function setSpawnToolStatus(message, kind = '') {
  if (!dom.spawnToolStatus) return;
  dom.spawnToolStatus.textContent = message;
  dom.spawnToolStatus.classList.remove('good', 'warn', 'bad');
  if (kind) dom.spawnToolStatus.classList.add(kind);
}

async function spawnAtAddress() {
  if (!state.demoRunning || !state.viewer) return setSpawnToolStatus('Launch the 3D simulator first.', 'warn');
  const apiKey = dom.apiKey.value.trim();
  if (!apiKey) return setSpawnToolStatus('Google API key is required.', 'bad');
  const query = dom.spawnAddress?.value?.trim() || '';
  if (!query) return setSpawnToolStatus('Enter an Ontario street address.', 'warn');
  dom.spawnAddressButton.disabled = true;
  setSpawnToolStatus('Finding address…', 'warn');
  try {
    const spawn = await geocodeOntarioAddress(apiKey, query);
    state.station = spawn;
    state.trainingRoadsEnabled = distanceMeters(spawn.lat, spawn.lon, PETERBOROUGH_CENTER.lat, PETERBOROUGH_CENTER.lon) < 30000;
    resetVehicle({ forceSurface: true });
    dom.station.textContent = spawn.name;
    updateRoadMatch();
    state.viewer.camera.setView({
      destination: Cesium.Cartesian3.fromDegrees(spawn.lon, spawn.lat, 340),
      orientation: { heading: 0, pitch: -1.12, roll: 0 },
    });
    setStatus(dom.surfaceStatus, 'Surface: seeking 3D road', 'warn');
    setSpawnToolStatus(`Spawned at ${spawn.address}`, 'good');
    saveSetting('google3d.spawnAddress', spawn.address);
    dom.setupOverlay.hidden = true;
    state.lastFrame = performance.now();
    refreshSurfaceHeight();
  } catch (error) {
    setSpawnToolStatus(String(error?.message || 'Could not find that Ontario address.'), 'bad');
  } finally {
    dom.spawnAddressButton.disabled = false;
  }
}

async function recoverTruckToSurface() {
  if (!state.demoRunning || !state.viewer) return setSpawnToolStatus('Launch the 3D simulator first.', 'warn');
  const scene = state.viewer.scene;
  if (!scene?.sampleHeightSupported) return setSpawnToolStatus('Surface recovery is not available in this browser.', 'bad');
  dom.recoverSurfaceButton.disabled = true;
  setSpawnToolStatus('Finding the rendered ground beneath the truck…', 'warn');
  try {
    clearDriveInput();
    state.vehicle.speed = 0;
    state.vehicle.steering = 0;
    state.surfaceGeneration += 1;
    state.surface.pending = false;
    const cartographic = Cesium.Cartographic.fromDegrees(state.vehicle.lon, state.vehicle.lat, 0);
    const excluded = state.truckEntity ? [state.truckEntity] : [];
    let height = scene.sampleHeight(cartographic, excluded);
    if (!Number.isFinite(height) && typeof scene.sampleHeightMostDetailed === 'function') {
      const sampled = await scene.sampleHeightMostDetailed([cartographic], excluded);
      height = sampled?.[0]?.height;
    }
    if (!Number.isFinite(height)) throw new Error('Ground is not loaded here yet. Move the camera slightly and try again.');
    surfaceAlignment.reset();
    surfaceAlignment.accept(height, state.vehicle);
    surfaceAlignment.accept(height, state.vehicle);
    const recoveredHeight = height + 0.35;
    state.surface.targetHeight = recoveredHeight;
    state.surface.displayHeight = recoveredHeight;
    state.surface.locked = true;
    state.surface.mostDetailedTried = true;
    state.surface.lastAcceptedAt = performance.now();
    updateTruckEntity();
    recenterCamera();
    setStatus(dom.surfaceStatus, 'Surface: truck recovered', 'good');
    setSpawnToolStatus('Truck placed back on top of the rendered surface.', 'good');
    dom.setupOverlay.hidden = true;
    state.lastFrame = performance.now();
  } catch (error) {
    setSpawnToolStatus(String(error?.message || 'Could not recover the truck to the surface.'), 'bad');
  } finally {
    dom.recoverSurfaceButton.disabled = false;
  }
}

function updateRoadMatch() {
  if (!state.trainingRoadsEnabled || !state.roadMatcher) { state.roadMatch = null; return; }
  const v = state.vehicle; state.roadMatch = state.roadMatcher.match(v.lat, v.lon, v.heading, v.speed);
}
function isOnRoad() {
  if (!state.trainingRoadsEnabled) return true;
  return roadAllowsFullSpeed(Boolean(state.roadMatcher), state.roadMatch, distanceMeters(state.vehicle.lat, state.vehicle.lon, state.station.lat, state.station.lon));
}
function acceptSurfaceHeight(height) {
  if (!surfaceAlignment.accept(height, state.vehicle)) return false;
  if (!state.surface.locked) state.surface.displayHeight = height + 0.15;
  state.surface.targetHeight = height + 0.15; state.surface.locked = true; state.surface.lastAcceptedAt = performance.now(); return true;
}
async function refreshSurfaceHeight() {
  if (!state.viewer || state.surface.pending) return;
  const scene = state.viewer.scene; if (!scene?.sampleHeightSupported) return;
  state.surface.pending = true; const generation = state.surfaceGeneration; const sampledAt = { lat: state.vehicle.lat, lon: state.vehicle.lon };
  const cartographic = Cesium.Cartographic.fromDegrees(state.vehicle.lon, state.vehicle.lat, 0);
  try {
    const excluded = state.truckEntity ? [state.truckEntity] : [];
    let height = scene.sampleHeight(cartographic, excluded);
    if (Number.isFinite(height)) acceptSurfaceHeight(height);
    else if (!state.surface.mostDetailedTried && typeof scene.sampleHeightMostDetailed === 'function') {
      state.surface.mostDetailedTried = true; const sampled = await scene.sampleHeightMostDetailed([cartographic], excluded);
      if (generation !== state.surfaceGeneration || scene !== state.viewer?.scene || distanceMeters(sampledAt.lat, sampledAt.lon, state.vehicle.lat, state.vehicle.lon) > 2) return;
      height = sampled?.[0]?.height; acceptSurfaceHeight(height);
    }
  } catch (error) { console.debug('Surface sample deferred:', error); }
  finally { if (generation === state.surfaceGeneration) state.surface.pending = false; }
}
function vehicleCartesian(height = state.surface.displayHeight) { return Cesium.Cartesian3.fromDegrees(state.vehicle.lon, state.vehicle.lat, height); }
function updateTruckEntity() {
  if (!state.truckEntity) return;
  const position = vehicleCartesian(); state.truckEntity.position = position;
  state.truckEntity.orientation = Cesium.Transforms.headingPitchRollQuaternion(position, new Cesium.HeadingPitchRoll(wrapAngle(state.vehicle.heading + state.modelYawOffset), 0, 0));
}
function updateCamera(dt) {
  if (!state.viewer || !state.demoRunning) return;
  const preset = currentPreset();
  if (state.camera.mode === 'RETURNING') {
    state.camera.yawOffset = expStep(state.camera.yawOffset, 0, 5.8, dt);
    state.camera.pitch = expStep(state.camera.pitch, preset.pitch, 5.8, dt);
    state.camera.range = expStep(state.camera.range, preset.range, 2.8, dt);
    if (Math.abs(state.camera.yawOffset) < 0.008 && Math.abs(state.camera.pitch - preset.pitch) < 0.008 && Math.abs(state.camera.range - preset.range) < 0.12) {
      state.camera.yawOffset = 0; state.camera.pitch = preset.pitch; state.camera.mode = 'FOLLOW';
      window.dispatchEvent(new CustomEvent('city-camera-mode', { detail: 'FOLLOW' }));
    }
  }
  const speedRatio = clamp(Math.abs(state.vehicle.speed) / TRUCK.maxForwardSpeed, 0, 1);
  const lookAhead = preset.lookAhead + speedRatio * 5.2;
  const forwardNorth = Math.cos(state.vehicle.heading) * lookAhead, forwardEast = Math.sin(state.vehicle.heading) * lookAhead;
  const lat = state.vehicle.lat + forwardNorth / 111_320;
  const lon = state.vehicle.lon + forwardEast / (111_320 * Math.cos(state.vehicle.lat * Math.PI / 180));
  const target = Cesium.Cartesian3.fromDegrees(lon, lat, state.surface.displayHeight + preset.targetHeight);
  const frame = Cesium.Transforms.eastNorthUpToFixedFrame(target);
  const range = state.camera.range + (preset.id === 'cab' ? 0 : speedRatio * 2.5);
  state.viewer.camera.lookAtTransform(frame, new Cesium.HeadingPitchRange(wrapAngle(state.vehicle.heading + state.camera.yawOffset), state.camera.pitch, range));
}
function updateHud(driveInput) {
  const onRoad = isOnRoad(), preset = currentPreset();
  dom.speed.textContent = Math.round(Math.abs(state.vehicle.speed) * 3.6); dom.gear.textContent = gearForSpeed(state.vehicle.speed, driveInput);
  dom.camera.textContent = `${preset.label} · ${state.camera.mode}`; dom.station.textContent = state.station.name;
  if (!state.trainingRoadsEnabled) {
    dom.streetName.textContent = `${state.station.name} free drive`;
    dom.roadStatus.textContent = 'Street matching is currently available in Peterborough only'; dom.roadStatus.className = 'road-state';
    dom.diagRoads.textContent = 'Not required · Ontario free drive'; dom.diagRoadDistance.textContent = '—';
  } else if (state.roadMatch) {
    dom.streetName.textContent = state.roadMatch.name;
    dom.roadStatus.textContent = onRoad ? `${state.roadMatch.distance.toFixed(1)} m from mapped road` : `Off road · ${state.roadMatch.distance.toFixed(1)} m from road`;
    dom.roadStatus.className = `road-state ${onRoad ? 'on-road' : 'off-road'}`; dom.diagRoadDistance.textContent = `${state.roadMatch.distance.toFixed(1)} m`;
  } else if (state.roadMatcher) {
    dom.streetName.textContent = 'No nearby mapped street'; dom.roadStatus.textContent = 'Off road'; dom.roadStatus.className = 'road-state off-road'; dom.diagRoadDistance.textContent = '—';
  }
  if (state.tileset && !state.tileFailure) {
    const settled = Boolean(state.tileset.tilesLoaded); setStatus(dom.tilesStatus, settled ? '3D world: ready nearby' : '3D world: streaming', settled ? 'good' : 'warn');
    dom.diagTiles.textContent = settled ? 'Nearby tiles settled' : 'Streaming detail';
  }
  const surfaceAge = (performance.now() - state.surface.lastAcceptedAt) / 1000;
  if (state.surface.locked) setStatus(dom.surfaceStatus, `Surface: locked ${state.surface.targetHeight.toFixed(1)} m`, surfaceAge < 2 ? 'good' : 'warn');
  else setStatus(dom.surfaceStatus, 'Surface: seeking 3D road', 'warn');
  dom.diagFps.textContent = state.fps ? `${state.fps.toFixed(0)} fps` : '—';
  dom.diagHeight.textContent = state.surface.locked ? `${state.surface.displayHeight.toFixed(2)} m${surfaceAge > 2 ? ' · stale' : ''}` : `fallback ${state.surface.displayHeight.toFixed(1)} m`;
  dom.diagPosition.textContent = `${state.vehicle.lat.toFixed(6)}, ${state.vehicle.lon.toFixed(6)}`;
}

function tick(now) {
  const rawDt = Math.max(0, (now - state.lastFrame) / 1000), dt = Math.min(rawDt, 0.25); state.lastFrame = now;
  state.fpsFrames += 1; state.fpsElapsed += rawDt;
  if (state.fpsElapsed >= 0.75) { state.fps = state.fpsFrames / state.fpsElapsed; state.fpsFrames = 0; state.fpsElapsed = 0; }
  if (state.demoRunning && state.viewer && dom.setupOverlay.hidden && !document.hidden) {
    const driveInput = getDriveInput(); const next = advanceVehicle(state.vehicle, driveInput, dt, isOnRoad());
    state.distanceDriven += distanceMeters(state.vehicle.lat, state.vehicle.lon, next.lat, next.lon); state.vehicle = next;
    state.roadElapsed += dt; if (state.roadElapsed >= ROAD_MATCH_INTERVAL) { state.roadElapsed = 0; updateRoadMatch(); }
    state.surface.elapsed += dt; if (state.surface.elapsed >= SURFACE_SAMPLE_INTERVAL) { state.surface.elapsed = 0; refreshSurfaceHeight(); }
    state.surface.displayHeight = expStep(state.surface.displayHeight, state.surface.targetHeight, state.surface.locked ? 7.5 : 2.5, dt);
    updateTruckEntity(); updateCamera(dt);
    state.hudElapsed += dt; if (state.hudElapsed >= 0.08) { state.hudElapsed = 0; updateHud(driveInput); }
  }
  requestAnimationFrame(tick);
}

function createViewer() {
  const viewer = new Cesium.Viewer(dom.container, { animation: false, timeline: false, baseLayerPicker: false, geocoder: false, homeButton: false, sceneModePicker: false, navigationHelpButton: false, fullscreenButton: false, infoBox: false, selectionIndicator: false, scene3DOnly: true, requestRenderMode: false, baseLayer: false, globe: false, shadows: false });
  viewer.scene.backgroundColor = Cesium.Color.fromCssColorString('#071019'); viewer.scene.fog.enabled = false; viewer.scene.highDynamicRange = true;
  const controls = viewer.scene.screenSpaceCameraController; controls.enableRotate = false; controls.enableTranslate = false; controls.enableZoom = false; controls.enableTilt = false; controls.enableLook = false;
  return viewer;
}
async function loadGoogleWorld(apiKey) {
  setStatus(dom.tilesStatus, '3D world: connecting to Google…', 'warn'); const viewer = state.viewer; let expired = false, timeout;
  const request = Cesium.createGooglePhotorealistic3DTileset({ key: apiKey, onlyUsingWithGoogleGeocoder: true }, { ...window.GOOGLE_TILESET_OPTIONS, showCreditsOnScreen: true }).then(tileset => {
    if (expired || viewer !== state.viewer || viewer.isDestroyed()) { tileset.destroy(); throw new Error('Expired city startup'); } return tileset;
  });
  let tileset;
  try { tileset = await Promise.race([request, new Promise((_, reject) => { timeout = setTimeout(() => { expired = true; reject(new Error('City connection timed out')); }, 25000); })]); }
  finally { clearTimeout(timeout); }
  tileset.maximumScreenSpaceError = QUALITY_SSE[state.quality] || QUALITY_SSE.balanced; tileset.enableCollision = true; state.viewer.scene.primitives.add(tileset);
  state.tileset = tileset; state.tileFailure = false; dom.diagTiles.textContent = 'Connected · streaming';
  if (tileset.tileFailed?.addEventListener) tileset.tileFailed.addEventListener(() => { state.tileFailure = true; dom.diagTiles.textContent = 'Tile request failed — check key, quota or connection'; setStatus(dom.tilesStatus, '3D world: tile request issue', 'bad'); });
  tileset.allTilesLoaded?.addEventListener(() => { state.tileFailure = false; }); return tileset;
}
function createTruck() {
  const position = vehicleCartesian();
  state.truckEntity = state.viewer.entities.add({ id: 'demo-fire-truck', name: 'Generic Rescue Pumper', position,
    orientation: Cesium.Transforms.headingPitchRollQuaternion(position, new Cesium.HeadingPitchRoll(state.vehicle.heading + state.modelYawOffset, 0, 0)),
    model: { uri: TRUCK_MODEL_URL, scale: 1, minimumPixelSize: 0, maximumScale: 1, runAnimations: false, shadows: Cesium.ShadowMode.DISABLED } });
  state.truckEntity.show = !currentPreset().hideTruck;
}
function installViewerInput() {
  state.viewerAbort?.abort(); const controller = new AbortController(); state.viewerAbort = controller; const { signal } = controller, canvas = state.viewer.canvas;
  let pointerId = null, lastX = 0, lastY = 0;
  canvas.addEventListener('pointerdown', event => {
    if (!state.demoRunning || !dom.setupOverlay.hidden || (event.button !== 0 && event.pointerType === 'mouse') || pointerId !== null) return;
    pointerId = event.pointerId; lastX = event.clientX; lastY = event.clientY; state.camera.mode = 'FREE_LOOK'; window.dispatchEvent(new CustomEvent('city-camera-mode', { detail: 'FREE_LOOK' })); canvas.setPointerCapture?.(pointerId);
  }, { signal });
  canvas.addEventListener('pointermove', event => {
    if (event.pointerId !== pointerId) return; const dx = event.clientX - lastX, dy = event.clientY - lastY; lastX = event.clientX; lastY = event.clientY;
    state.camera.yawOffset = wrapAngle(state.camera.yawOffset - dx * 0.0052); state.camera.pitch = clamp(state.camera.pitch + dy * 0.0034, -1.48, 0.04);
  }, { signal });
  const release = event => { if (event.pointerId === pointerId) pointerId = null; };
  canvas.addEventListener('pointerup', release, { signal }); canvas.addEventListener('pointercancel', release, { signal }); canvas.addEventListener('lostpointercapture', release, { signal });
  window.addEventListener('city-input-reset', () => { pointerId = null; }, { signal });
  canvas.addEventListener('wheel', event => { if (!dom.setupOverlay.hidden) return; event.preventDefault(); state.camera.range = clamp(state.camera.range + Math.sign(event.deltaY) * 2.5, 2.4, 150); }, { passive: false, signal });
}

function pickerIsMobile() {
  return window.matchMedia?.('(pointer: coarse)').matches || window.innerWidth <= 900;
}

function pickerNearestCity(lat, lon) {
  let bestIndex = 0;
  let bestDistance = Infinity;
  for (let i = 0; i < ONTARIO_CITIES.length; i += 1) {
    const city = ONTARIO_CITIES[i];
    const distance = distanceMeters(lat, lon, city.lat, city.lon);
    if (distance < bestDistance) { bestDistance = distance; bestIndex = i; }
  }
  return { index: bestIndex, distance: bestDistance, city: ONTARIO_CITIES[bestIndex] };
}

function pickerGeoFromScreen(position) {
  if (!picker.viewer || !position) return null;
  const cartesian = picker.viewer.camera.pickEllipsoid(position, Cesium.Ellipsoid.WGS84);
  if (!cartesian) return null;
  const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
  return { lat: Cesium.Math.toDegrees(cartographic.latitude), lon: Cesium.Math.toDegrees(cartographic.longitude) };
}

function setPickerCity(index, source = 'map') {
  if (!Number.isInteger(index) || index < 0 || index >= ONTARIO_CITIES.length) return;
  const previous = picker.cityEntities[picker.selectedIndex];
  const previousCity = ONTARIO_CITIES[picker.selectedIndex];
  if (previous?.ellipse) {
    previous.ellipse.material = Cesium.Color.fromCssColorString('#49b9ff').withAlpha(0.10);
    previous.ellipse.outlineColor = Cesium.Color.fromCssColorString('#73c9ff').withAlpha(0.55);
    previous.point.pixelSize = previousCity?.major ? 8 : 6;
    previous.point.color = Cesium.Color.fromCssColorString('#8dd8ff').withAlpha(0.9);
    if (previous.label) previous.label.show = Boolean(previousCity?.major);
  }

  picker.selectedIndex = index;
  const city = ONTARIO_CITIES[index];
  const entity = picker.cityEntities[index];
  if (entity?.ellipse) {
    entity.ellipse.material = Cesium.Color.fromCssColorString('#58dcff').withAlpha(0.34);
    entity.ellipse.outlineColor = Cesium.Color.fromCssColorString('#d8f8ff').withAlpha(0.98);
    entity.point.pixelSize = 14;
    entity.point.color = Cesium.Color.WHITE;
    if (entity.label) entity.label.show = true;
  }
  dom.cityPickerName.textContent = city.name;
  dom.cityPickerStart.textContent = 'Start in ' + city.name;
  dom.cityPickerHint.textContent = pickerIsMobile()
    ? 'Move the map under the centre circle · pinch to zoom'
    : (source === 'hover' ? 'City highlighted · click Start when ready' : 'Hover a city area or move around the map');
}

function destroyOntarioPicker() {
  picker.launching = false;
  if (picker.handler && !picker.handler.isDestroyed?.()) picker.handler.destroy();
  picker.handler = null;
  picker.cityEntities = [];
  if (picker.viewer && !picker.viewer.isDestroyed()) picker.viewer.destroy();
  picker.viewer = null;
}

function closeOntarioPicker() {
  destroyOntarioPicker();
  document.body.classList.remove('city-picker-active', 'city-picker-launching');
  dom.cityPickerOverlay.hidden = true;
  dom.setupOverlay.hidden = false;
  dom.resumeButton.hidden = !state.demoRunning;
}

function createOntarioPickerViewer() {
  const viewer = new Cesium.Viewer(dom.container, {
    animation: false,
    timeline: false,
    baseLayerPicker: false,
    geocoder: false,
    homeButton: false,
    sceneModePicker: false,
    navigationHelpButton: false,
    fullscreenButton: false,
    infoBox: false,
    selectionIndicator: false,
    scene3DOnly: true,
    requestRenderMode: false,
    baseLayer: false,
    shadows: false,
  });
  viewer.scene.backgroundColor = Cesium.Color.fromCssColorString('#06111a');
  viewer.scene.globe.baseColor = Cesium.Color.fromCssColorString('#13252f');
  viewer.scene.globe.enableLighting = false;
  viewer.scene.globe.depthTestAgainstTerrain = false;
  viewer.scene.fog.enabled = false;
  viewer.scene.skyAtmosphere.show = true;

  try {
    const provider = new Cesium.OpenStreetMapImageryProvider({ url: 'https://tile.openstreetmap.org/' });
    const layer = viewer.imageryLayers.addImageryProvider(provider);
    layer.brightness = 0.48;
    layer.contrast = 1.18;
    layer.saturation = 0.28;
    layer.gamma = 0.9;
  } catch (error) {
    console.debug('Ontario picker basemap unavailable; using globe fallback.', error);
  }

  const controls = viewer.scene.screenSpaceCameraController;
  controls.enableRotate = true;
  controls.enableTranslate = true;
  controls.enableZoom = true;
  controls.enableTilt = false;
  controls.enableLook = false;
  controls.minimumZoomDistance = 5000;
  controls.maximumZoomDistance = 6500000;

  picker.cityEntities = ONTARIO_CITIES.map((city, index) => viewer.entities.add({
    id: 'ontario-city-' + index,
    position: Cesium.Cartesian3.fromDegrees(city.lon, city.lat, 60),
    properties: { cityIndex: index },
    ellipse: {
      semiMajorAxis: city.radiusKm * 1000,
      semiMinorAxis: city.radiusKm * 1000,
      height: 45,
      material: Cesium.Color.fromCssColorString('#49b9ff').withAlpha(0.10),
      outline: true,
      outlineColor: Cesium.Color.fromCssColorString('#73c9ff').withAlpha(0.55),
      outlineWidth: 2,
    },
    point: {
      pixelSize: city.major ? 8 : 6,
      color: Cesium.Color.fromCssColorString('#8dd8ff').withAlpha(0.9),
      outlineColor: Cesium.Color.fromCssColorString('#071019'),
      outlineWidth: 2,
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
    },
    label: {
      text: city.name,
      show: Boolean(city.major),
      font: city.major ? '700 13px system-ui' : '700 12px system-ui',
      fillColor: Cesium.Color.WHITE,
      outlineColor: Cesium.Color.fromCssColorString('#06111a'),
      outlineWidth: 4,
      style: Cesium.LabelStyle.FILL_AND_OUTLINE,
      pixelOffset: new Cesium.Cartesian2(0, -18),
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
      scaleByDistance: new Cesium.NearFarScalar(150000, 1.05, 3200000, 0.55),
    },
  }));

  viewer.camera.setView({
    destination: Cesium.Cartesian3.fromDegrees(-84.3, 48.6, 4200000),
    orientation: { heading: 0, pitch: -1.52, roll: 0 },
  });
  viewer.camera.flyTo({ destination: ONTARIO_VIEW, duration: 1.55 });

  picker.handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
  picker.handler.setInputAction(movement => {
    if (pickerIsMobile() || picker.launching) return;
    const geo = pickerGeoFromScreen(movement.endPosition);
    if (!geo) return;
    const nearest = pickerNearestCity(geo.lat, geo.lon);
    if (nearest.distance <= Math.max(18000, nearest.city.radiusKm * 1600)) setPickerCity(nearest.index, 'hover');
  }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

  picker.handler.setInputAction(click => {
    if (pickerIsMobile() || picker.launching) return;
    const geo = pickerGeoFromScreen(click.position);
    if (!geo) return;
    setPickerCity(pickerNearestCity(geo.lat, geo.lon).index, 'click');
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

  viewer.scene.postRender.addEventListener(() => {
    if (!pickerIsMobile() || picker.launching || !picker.viewer) return;
    const now = performance.now();
    if (now - picker.centerCheckAt < 120) return;
    picker.centerCheckAt = now;
    const canvas = picker.viewer.scene.canvas;
    const geo = pickerGeoFromScreen(new Cesium.Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 2));
    if (!geo) return;
    setPickerCity(pickerNearestCity(geo.lat, geo.lon).index, 'center');
  });
  return viewer;
}

async function openOntarioPicker(apiKey, quality, cameraPreset) {
  if (!Cesium) throw new Error('CesiumJS did not load. Check your internet connection and reload.');
  clearDriveInput();
  state.demoRunning = false;
  state.viewerAbort?.abort();
  if (state.viewer && !state.viewer.isDestroyed()) state.viewer.destroy();
  state.viewer = null;
  state.tileset = null;
  state.truckEntity = null;
  destroyOntarioPicker();

  picker.apiKey = apiKey;
  picker.quality = QUALITY_SSE[quality] ? quality : 'balanced';
  picker.cameraPreset = CAMERA_PRESETS[cameraPreset] ? cameraPreset : 'chase';
  picker.launching = false;
  saveSetting('google3d.demoKey', apiKey);
  saveSetting('google3d.quality', picker.quality);
  saveSetting('google3d.cameraPreset', picker.cameraPreset);

  dom.setupOverlay.hidden = true;
  dom.cityPickerOverlay.hidden = false;
  document.body.classList.add('city-picker-active');
  picker.viewer = createOntarioPickerViewer();
  setPickerCity(picker.selectedIndex, 'open');
}

async function launchSelectedCity() {
  if (!picker.viewer || picker.launching) return;
  const city = ONTARIO_CITIES[picker.selectedIndex];
  picker.launching = true;
  document.body.classList.add('city-picker-launching');
  dom.cityPickerStart.disabled = true;
  dom.cityPickerBack.disabled = true;
  dom.cityPickerHint.textContent = 'Zooming into ' + city.name + '…';

  await new Promise(resolve => {
    picker.viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(city.lon, city.lat, 14000),
      orientation: { heading: 0, pitch: -1.48, roll: 0 },
      duration: 1.65,
      complete: resolve,
      cancel: resolve,
    });
  });

  destroyOntarioPicker();
  dom.cityPickerStart.disabled = false;
  dom.cityPickerBack.disabled = false;
  try {
    await startDemo(picker.apiKey, { ...city, headingDeg: 0 }, picker.quality, picker.cameraPreset);
  } catch (error) {
    document.body.classList.remove('city-picker-active', 'city-picker-launching');
    dom.cityPickerOverlay.hidden = true;
    dom.setupOverlay.hidden = false;
    showSetupError('Could not load ' + city.name + ' in Google 3D. Check the Map Tiles API, billing, quota and key restrictions.');
    setStatus(dom.tilesStatus, '3D world: failed to load', 'bad');
  }
}

async function startDemo(apiKey, spawn, quality, cameraPreset) {
  if (!Cesium) throw new Error('CesiumJS did not load. Check your internet connection and reload.');
  state.station = { ...spawn, id: 'city', address: spawn.name + ', Ontario', headingDeg: Number(spawn.headingDeg) || 0 };
  state.quality = QUALITY_SSE[quality] ? quality : 'balanced';
  state.trainingRoadsEnabled = distanceMeters(spawn.lat, spawn.lon, PETERBOROUGH_CENTER.lat, PETERBOROUGH_CENTER.lon) < 30000;
  saveSetting('google3d.demoKey', apiKey);
  saveSetting('google3d.quality', state.quality);
  saveSetting('google3d.selectedCity', spawn.name);
  state.demoRunning = false;
  dom.resumeButton.hidden = true;
  state.viewerAbort?.abort();
  if (state.viewer && !state.viewer.isDestroyed()) state.viewer.destroy();
  state.viewer = null;
  state.tileset = null;
  state.truckEntity = null;
  applyCameraPreset(cameraPreset, { announce: false });
  resetVehicle({ forceSurface: true });
  dom.station.textContent = spawn.name;

  state.viewer = createViewer();
  installViewerInput();
  state.viewer.camera.setView({
    destination: Cesium.Cartesian3.fromDegrees(spawn.lon, spawn.lat, 2600),
    orientation: { heading: state.vehicle.heading, pitch: -1.18, roll: 0 },
  });

  await loadGoogleWorld(apiKey);
  createTruck();
  await roadDataPromise;
  if (state.trainingRoadsEnabled && !state.roadMatcher) await loadRoadData();
  updateRoadMatch();

  state.camera.range = Math.max(220, currentPreset().range);
  state.camera.pitch = -1.12;
  state.camera.mode = 'RETURNING';
  state.demoRunning = true;
  state.lastFrame = performance.now();
  dom.cityPickerOverlay.hidden = true;
  document.body.classList.remove('city-picker-active', 'city-picker-launching');
  setStatus(dom.surfaceStatus, 'Surface: seeking 3D road', 'warn');
  refreshSurfaceHeight();
  updateHud(getDriveInput());
  window.dispatchEvent(new CustomEvent('city-camera-mode', { detail: 'RETURNING' }));
}

function setupGlobalInput() {
  window.addEventListener('keydown', event => {
    if (isTypingTarget(event.target) || !state.demoRunning || !dom.setupOverlay.hidden) return;
    if (['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(event.code)) { event.preventDefault(); input.keys.add(event.code); }
    if (event.code === 'KeyC' && !event.repeat) recenterCamera(); if (event.code === 'KeyV' && !event.repeat) cycleCameraPreset(); if (event.code === 'KeyR' && !event.repeat) resetVehicle();
  });
  window.addEventListener('keyup', event => input.keys.delete(event.code)); window.addEventListener('blur', clearDriveInput);
  document.addEventListener('visibilitychange', () => { clearDriveInput(); state.lastFrame = performance.now(); });
}
function setupJoystick() {
  let activePointer = null;
  const reset = () => { activePointer = null; input.joystickX = 0; input.joystickY = 0; dom.joystickKnob.style.transform = 'translate(-50%, -50%)'; };
  const update = event => {
    const ring = dom.joystick.querySelector('.joystick-ring'), rect = ring.getBoundingClientRect(), radius = rect.width * 0.36;
    let dx = event.clientX - (rect.left + rect.width / 2), dy = event.clientY - (rect.top + rect.height / 2); const length = Math.hypot(dx, dy);
    if (length > radius) { dx *= radius / length; dy *= radius / length; }
    let x = dx / radius, y = dy / radius; if (Math.abs(x) < 0.08) x = 0; if (Math.abs(y) < 0.08) y = 0;
    input.joystickX = x; input.joystickY = y; dom.joystickKnob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
  };
  dom.joystick.addEventListener('pointerdown', event => { if (activePointer !== null || !state.demoRunning || !dom.setupOverlay.hidden) return; activePointer = event.pointerId; dom.joystick.setPointerCapture?.(activePointer); update(event); });
  dom.joystick.addEventListener('pointermove', event => { if (event.pointerId === activePointer) update(event); }); dom.joystick.addEventListener('pointerup', event => { if (event.pointerId === activePointer) reset(); });
  dom.joystick.addEventListener('pointercancel', reset); dom.joystick.addEventListener('lostpointercapture', reset); window.addEventListener('city-input-reset', reset);
  const brakeDown = event => { event.preventDefault(); dom.mobileBrake.setPointerCapture?.(event.pointerId); input.mobileBrake = true; dom.mobileBrake.classList.add('is-down'); };
  const brakeUp = () => { input.mobileBrake = false; dom.mobileBrake.classList.remove('is-down'); };
  dom.mobileBrake.addEventListener('pointerdown', brakeDown); dom.mobileBrake.addEventListener('pointerup', brakeUp); dom.mobileBrake.addEventListener('pointercancel', brakeUp); dom.mobileBrake.addEventListener('lostpointercapture', brakeUp); dom.mobileBrake.addEventListener('pointerleave', brakeUp);
  dom.mobileRecenter.addEventListener('click', recenterCamera); dom.mobileRecenter.addEventListener('pointerup', event => { if (event.pointerType === 'touch') recenterCamera(); });
  dom.mobileCamera?.addEventListener('click', cycleCameraPreset); dom.mobileCamera?.addEventListener('pointerup', event => { if (event.pointerType === 'touch') cycleCameraPreset(); });
}
function setupUi() {
  const savedKey = readSetting('google3d.demoKey'); if (savedKey) dom.apiKey.value = savedKey;
  const savedQuality = readSetting('google3d.quality'); if (savedQuality && QUALITY_SSE[savedQuality]) dom.qualitySelect.value = savedQuality;
  const savedCamera = readSetting('google3d.cameraPreset'); if (savedCamera && CAMERA_PRESETS[savedCamera]) { dom.cameraSelect.value = savedCamera; applyCameraPreset(savedCamera, { announce: false }); }
  const savedCity = readSetting('google3d.selectedCity');
  if (savedCity) {
    const index = ONTARIO_CITIES.findIndex(city => city.name === savedCity);
    if (index >= 0) picker.selectedIndex = index;
  }

  dom.cameraSelect.addEventListener('change', () => applyCameraPreset(dom.cameraSelect.value));
  dom.cameraCycle?.addEventListener('click', cycleCameraPreset);
  dom.setupForm.addEventListener('submit', async event => {
    event.preventDefault();
    hideSetupError();
    const apiKey = dom.apiKey.value.trim();
    if (!apiKey) return showSetupError('Paste a Google Maps Platform key with the Map Tiles API enabled.');
    dom.launchButton.disabled = true;
    dom.launchButton.textContent = 'Opening Ontario map…';
    try {
      await openOntarioPicker(apiKey, dom.qualitySelect.value, dom.cameraSelect.value);
    } catch (error) {
      showSetupError(String(error?.message || 'Could not open the Ontario city picker.'));
    } finally {
      dom.launchButton.disabled = false;
      dom.launchButton.textContent = 'Launch 3D Demo';
    }
  });

  dom.cityPickerBack?.addEventListener('click', closeOntarioPicker);
  dom.cityPickerStart?.addEventListener('click', launchSelectedCity);
  dom.setupButton.addEventListener('click', () => {
    if (document.body.classList.contains('city-picker-active')) {
      closeOntarioPicker();
      return;
    }
    dom.setupOverlay.hidden = false;
    clearDriveInput();
    dom.resumeButton.hidden = !state.demoRunning;
  });
  dom.resumeButton.addEventListener('click', () => { clearDriveInput(); dom.setupOverlay.hidden = true; state.lastFrame = performance.now(); });
  dom.diagnosticsToggle.addEventListener('click', () => { dom.diagnosticsPanel.hidden = !dom.diagnosticsPanel.hidden; });
  dom.diagnosticsClose.addEventListener('click', () => { dom.diagnosticsPanel.hidden = true; });
  dom.flipModel.addEventListener('click', () => { state.modelYawOffset = wrapAngle(state.modelYawOffset + Math.PI); });
  dom.resetTruck.addEventListener('click', () => resetVehicle());
}

setupGlobalInput(); setupJoystick(); setupUi(); requestAnimationFrame(tick);
window.__CITY_DEMO_RUNTIME__ = Object.freeze({ snapshot: () => ({
  version: VERSION, running: state.demoRunning && dom.setupOverlay.hidden && !document.hidden, cameraMode: state.camera.mode, cameraPreset: state.camera.preset, cameraRange: state.camera.range,
  vehicle: { ...state.vehicle }, distanceDriven: state.distanceDriven, tilesConnected: Boolean(state.tileset) && !state.tileFailure,
  roadsReady: Boolean(state.roadMatcher?.segmentCount), roadDataRequired: state.trainingRoadsEnabled, surfaceLocked: state.surface.locked && performance.now() - state.surface.lastAcceptedAt < 2000,
  fps: state.fps, input: getDriveInput(), locationName: state.station.name, surfaceHeight: state.surface.displayHeight, pickerActive: Boolean(picker.viewer), selectedCity: ONTARIO_CITIES[picker.selectedIndex]?.name || null,
}) });
