import {
  VERSION,
  TRUCK,
  clamp,
  expStep,
  moveLatLon,
  roadHeadingDifference,
  stepTruckKinematics,
  wrapAngle,
} from './logic.js';

const Cesium = window.Cesium;

const TRUCK_MODEL_URL = 'https://raw.githubusercontent.com/edmondsonedits/Peterborough-Map-Game/main/city-explorer/assets/vehicles/generic-pumper.glb';
const ROAD_DATA_URL = 'https://raw.githubusercontent.com/edmondsonedits/Peterborough-Map-Game/main/city-explorer/data/osm-public-roads.geojson';

const STATIONS = Object.freeze({
  station1: {
    id: 'station1', name: 'Station 1', address: '210 Sherbrooke St.',
    lat: 44.30109, lon: -78.32342, headingDeg: 177,
  },
  station2: {
    id: 'station2', name: 'Station 2', address: '100 Marina Blvd.',
    lat: 44.32834, lon: -78.32090, headingDeg: 99,
  },
  station3: {
    id: 'station3', name: 'Station 3', address: '1359 Clonsilla Ave.',
    lat: 44.29079, lon: -78.33747, headingDeg: 87,
  },
});

const QUALITY_SSE = Object.freeze({ performance: 24, balanced: 14, high: 8 });
const FALLBACK_HEIGHT_M = 190;
const SURFACE_SAMPLE_INTERVAL = 0.28;
const ROAD_MATCH_INTERVAL = 0.18;
const ROAD_ON_THRESHOLD_M = 16;
const CAMERA_BASE_PITCH = TRUCK.chasePitch;

const dom = {
  container: document.querySelector('#cesium-container'),
  setupOverlay: document.querySelector('#setup-overlay'),
  setupForm: document.querySelector('#setup-form'),
  setupButton: document.querySelector('#setup-button'),
  apiKey: document.querySelector('#api-key'),
  stationSelect: document.querySelector('#station-select'),
  qualitySelect: document.querySelector('#quality-select'),
  launchButton: document.querySelector('#launch-button'),
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
  version: document.querySelector('#version-pill'),
};

dom.version.textContent = `v${VERSION}`;

const state = {
  viewer: null,
  tileset: null,
  truckEntity: null,
  station: STATIONS.station1,
  quality: 'balanced',
  vehicle: {
    lat: STATIONS.station1.lat,
    lon: STATIONS.station1.lon,
    heading: STATIONS.station1.headingDeg * Math.PI / 180,
    speed: 0,
    steering: 0,
  },
  surface: {
    targetHeight: FALLBACK_HEIGHT_M,
    displayHeight: FALLBACK_HEIGHT_M,
    locked: false,
    pending: false,
    elapsed: 999,
    mostDetailedTried: false,
    lastAcceptedAt: 0,
  },
  roadMatcher: null,
  roadMatch: null,
  roadElapsed: 999,
  roadDataStatus: 'Loading',
  camera: {
    mode: 'FOLLOW',
    yawOffset: 0,
    pitch: CAMERA_BASE_PITCH,
    range: TRUCK.chaseDistance,
  },
  modelYawOffset: Math.PI,
  demoRunning: false,
  viewerAbort: null,
  lastFrame: performance.now(),
  fpsFrames: 0,
  fpsElapsed: 0,
  fps: 0,
  hudElapsed: 0,
};

const input = {
  keys: new Set(),
  joystickX: 0,
  joystickY: 0,
  mobileBrake: false,
};

function setStatus(element, text, kind = '') {
  element.textContent = text;
  element.classList.remove('good', 'warn', 'bad');
  if (kind) element.classList.add(kind);
}

function showSetupError(message) {
  dom.setupError.textContent = message;
  dom.setupError.hidden = false;
}

function hideSetupError() {
  dom.setupError.hidden = true;
  dom.setupError.textContent = '';
}

function isTypingTarget(target) {
  return target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement;
}

function getDriveInput() {
  let throttle = 0;
  let steer = 0;
  if (input.keys.has('KeyW') || input.keys.has('ArrowUp')) throttle += 1;
  if (input.keys.has('KeyS') || input.keys.has('ArrowDown')) throttle -= 1;
  if (input.keys.has('KeyD') || input.keys.has('ArrowRight')) steer += 1;
  if (input.keys.has('KeyA') || input.keys.has('ArrowLeft')) steer -= 1;

  if (Math.abs(input.joystickY) > Math.abs(throttle)) throttle = -input.joystickY;
  if (Math.abs(input.joystickX) > Math.abs(steer)) steer = input.joystickX;

  return {
    throttle: clamp(throttle, -1, 1),
    steer: clamp(steer, -1, 1),
    brake: input.mobileBrake || input.keys.has('Space') ? 1 : 0,
  };
}

function gearForSpeed(speed, driveInput) {
  if (speed > 0.25) return 'D';
  if (speed < -0.25) return 'R';
  if (driveInput.throttle > 0.05) return 'D';
  if (driveInput.throttle < -0.05) return 'R';
  return 'N';
}

function distanceMeters(lat1, lon1, lat2, lon2) {
  const meanLat = ((lat1 + lat2) * 0.5) * Math.PI / 180;
  const north = (lat2 - lat1) * 111_320;
  const east = (lon2 - lon1) * 111_320 * Math.cos(meanLat);
  return Math.hypot(north, east);
}

function pointToSegmentMeters(lat, lon, aLat, aLon, bLat, bLon) {
  const cosLat = Math.cos(lat * Math.PI / 180);
  const ax = (aLon - lon) * 111_320 * cosLat;
  const ay = (aLat - lat) * 111_320;
  const bx = (bLon - lon) * 111_320 * cosLat;
  const by = (bLat - lat) * 111_320;
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  const t = lenSq > 0 ? clamp(-(ax * dx + ay * dy) / lenSq, 0, 1) : 0;
  return Math.hypot(ax + dx * t, ay + dy * t);
}

function segmentHeading(aLat, aLon, bLat, bLon) {
  const meanLat = ((aLat + bLat) * 0.5) * Math.PI / 180;
  const north = (bLat - aLat) * 111_320;
  const east = (bLon - aLon) * 111_320 * Math.cos(meanLat);
  return Math.atan2(east, north);
}

function streetName(properties = {}) {
  return String(
    properties.name || properties.NAME || properties.full_name || properties.FULL_NAME ||
    properties.street || properties.STREET || properties.road || properties.ROAD ||
    properties.ref || properties.REF || 'Unnamed road'
  ).trim() || 'Unnamed road';
}

function buildRoadMatcher(geojson) {
  const cellSize = 0.002;
  const grid = new Map();
  let segmentCount = 0;

  const addToCell = (key, segment) => {
    let list = grid.get(key);
    if (!list) grid.set(key, (list = []));
    list.push(segment);
  };

  const addLine = (coordinates, name) => {
    if (!Array.isArray(coordinates) || coordinates.length < 2) return;
    for (let i = 1; i < coordinates.length; i += 1) {
      const a = coordinates[i - 1];
      const b = coordinates[i];
      if (!Array.isArray(a) || !Array.isArray(b)) continue;
      const aLon = Number(a[0]); const aLat = Number(a[1]);
      const bLon = Number(b[0]); const bLat = Number(b[1]);
      if (![aLon, aLat, bLon, bLat].every(Number.isFinite)) continue;
      const segment = { aLat, aLon, bLat, bLon, name, heading: segmentHeading(aLat, aLon, bLat, bLon) };
      segmentCount += 1;
      const minLatCell = Math.floor(Math.min(aLat, bLat) / cellSize);
      const maxLatCell = Math.floor(Math.max(aLat, bLat) / cellSize);
      const minLonCell = Math.floor(Math.min(aLon, bLon) / cellSize);
      const maxLonCell = Math.floor(Math.max(aLon, bLon) / cellSize);
      for (let y = minLatCell; y <= maxLatCell; y += 1) {
        for (let x = minLonCell; x <= maxLonCell; x += 1) addToCell(`${y}:${x}`, segment);
      }
    }
  };

  for (const feature of geojson?.features || []) {
    const geometry = feature?.geometry;
    if (!geometry) continue;
    const name = streetName(feature.properties);
    if (geometry.type === 'LineString') addLine(geometry.coordinates, name);
    else if (geometry.type === 'MultiLineString') {
      for (const line of geometry.coordinates || []) addLine(line, name);
    }
  }

  let stickyName = null;
  return {
    segmentCount,
    match(lat, lon, heading, speed) {
      const cy = Math.floor(lat / cellSize);
      const cx = Math.floor(lon / cellSize);
      const candidates = new Set();
      for (let oy = -1; oy <= 1; oy += 1) {
        for (let ox = -1; ox <= 1; ox += 1) {
          for (const segment of grid.get(`${cy + oy}:${cx + ox}`) || []) candidates.add(segment);
        }
      }
      let best = null;
      for (const segment of candidates) {
        const distance = pointToSegmentMeters(lat, lon, segment.aLat, segment.aLon, segment.bLat, segment.bLon);
        if (distance > 70) continue;
        const headingPenalty = Math.abs(speed) > 1.5 ? roadHeadingDifference(heading, segment.heading) * 6 : 0;
        const stickyBonus = stickyName && segment.name === stickyName ? -3.5 : 0;
        const score = distance + headingPenalty + stickyBonus;
        if (!best || score < best.score) best = { ...segment, distance, score };
      }
      if (best) stickyName = best.name;
      return best;
    },
  };
}

async function loadRoadData() {
  try {
    const response = await fetch(ROAD_DATA_URL, { cache: 'force-cache' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const geojson = await response.json();
    state.roadMatcher = buildRoadMatcher(geojson);
    state.roadDataStatus = `${state.roadMatcher.segmentCount.toLocaleString()} segments`;
    dom.diagRoads.textContent = state.roadDataStatus;
    return state.roadMatcher;
  } catch (error) {
    console.warn('Road data unavailable:', error);
    state.roadDataStatus = 'Unavailable';
    dom.diagRoads.textContent = 'Unavailable — driving still works';
    dom.streetName.textContent = 'Road data unavailable';
    dom.roadStatus.textContent = 'Visual driving remains available';
    return null;
  }
}

const roadDataPromise = loadRoadData();

function resetVehicle({ forceSurface = true } = {}) {
  const station = state.station;
  state.vehicle = {
    lat: station.lat,
    lon: station.lon,
    heading: station.headingDeg * Math.PI / 180,
    speed: 0,
    steering: 0,
  };
  state.roadMatch = null;
  state.camera.mode = 'RETURNING';
  state.camera.yawOffset = 0;
  state.camera.pitch = CAMERA_BASE_PITCH;
  if (forceSurface) {
    state.surface.locked = false;
    state.surface.mostDetailedTried = false;
    state.surface.targetHeight = FALLBACK_HEIGHT_M;
    state.surface.displayHeight = FALLBACK_HEIGHT_M;
    state.surface.elapsed = 999;
  }
}

function updateRoadMatch() {
  if (!state.roadMatcher) return;
  const v = state.vehicle;
  state.roadMatch = state.roadMatcher.match(v.lat, v.lon, v.heading, v.speed);
}

function isOnRoad() {
  if (!state.roadMatcher || !state.roadMatch) return true;
  const nearSpawn = distanceMeters(state.vehicle.lat, state.vehicle.lon, state.station.lat, state.station.lon) < 65;
  return nearSpawn || state.roadMatch.distance <= ROAD_ON_THRESHOLD_M;
}

function acceptSurfaceHeight(height) {
  if (!Number.isFinite(height) || height < -100 || height > 1000) return false;
  if (state.surface.locked && Math.abs(height - state.surface.targetHeight) > 7.5) return false;
  state.surface.targetHeight = height + 0.15;
  state.surface.locked = true;
  state.surface.lastAcceptedAt = performance.now();
  return true;
}

async function refreshSurfaceHeight() {
  if (!state.viewer || state.surface.pending) return;
  const scene = state.viewer.scene;
  if (!scene?.sampleHeightSupported) return;

  state.surface.pending = true;
  const cartographic = Cesium.Cartographic.fromDegrees(state.vehicle.lon, state.vehicle.lat, 0);
  try {
    let height = scene.sampleHeight(cartographic);
    if (Number.isFinite(height)) {
      acceptSurfaceHeight(height);
    } else if (!state.surface.mostDetailedTried && typeof scene.sampleHeightMostDetailed === 'function') {
      state.surface.mostDetailedTried = true;
      const sampled = await scene.sampleHeightMostDetailed([cartographic]);
      height = sampled?.[0]?.height;
      acceptSurfaceHeight(height);
    }
  } catch (error) {
    console.debug('Surface sample deferred:', error);
  } finally {
    state.surface.pending = false;
  }
}

function vehicleCartesian(height = state.surface.displayHeight) {
  return Cesium.Cartesian3.fromDegrees(state.vehicle.lon, state.vehicle.lat, height);
}

function updateTruckEntity() {
  if (!state.truckEntity) return;
  const position = vehicleCartesian();
  state.truckEntity.position = position;
  const hpr = new Cesium.HeadingPitchRoll(
    wrapAngle(state.vehicle.heading + state.modelYawOffset),
    0,
    0,
  );
  state.truckEntity.orientation = Cesium.Transforms.headingPitchRollQuaternion(position, hpr);
}

function updateCamera(dt) {
  if (!state.viewer || !state.demoRunning) return;
  if (state.camera.mode === 'RETURNING') {
    state.camera.yawOffset = expStep(state.camera.yawOffset, 0, 5.8, dt);
    state.camera.pitch = expStep(state.camera.pitch, CAMERA_BASE_PITCH, 5.8, dt);
    if (Math.abs(state.camera.yawOffset) < 0.008 && Math.abs(state.camera.pitch - CAMERA_BASE_PITCH) < 0.008) {
      state.camera.yawOffset = 0;
      state.camera.pitch = CAMERA_BASE_PITCH;
      state.camera.mode = 'FOLLOW';
    }
  }

  const speedRatio = clamp(Math.abs(state.vehicle.speed) / TRUCK.maxForwardSpeed, 0, 1);
  const lookAhead = 1.8 + speedRatio * 5.2;
  const forwardNorth = Math.cos(state.vehicle.heading) * lookAhead;
  const forwardEast = Math.sin(state.vehicle.heading) * lookAhead;
  const lat = state.vehicle.lat + forwardNorth / 111_320;
  const lon = state.vehicle.lon + forwardEast / (111_320 * Math.cos(state.vehicle.lat * Math.PI / 180));
  const target = Cesium.Cartesian3.fromDegrees(lon, lat, state.surface.displayHeight + 1.9);
  const frame = Cesium.Transforms.eastNorthUpToFixedFrame(target);
  const orbitHeading = wrapAngle(state.vehicle.heading + Math.PI + state.camera.yawOffset);
  const range = state.camera.range + speedRatio * 2.5;
  state.viewer.camera.lookAtTransform(frame, new Cesium.HeadingPitchRange(orbitHeading, state.camera.pitch, range));
}

function updateHud(driveInput) {
  const onRoad = isOnRoad();
  dom.speed.textContent = Math.round(Math.abs(state.vehicle.speed) * 3.6);
  dom.gear.textContent = gearForSpeed(state.vehicle.speed, driveInput);
  dom.camera.textContent = state.camera.mode;
  dom.station.textContent = state.station.name;

  if (state.roadMatch) {
    dom.streetName.textContent = state.roadMatch.name;
    dom.roadStatus.textContent = onRoad ? `${state.roadMatch.distance.toFixed(1)} m from mapped road` : `Off road · ${state.roadMatch.distance.toFixed(1)} m from road`;
    dom.roadStatus.className = `road-state ${onRoad ? 'on-road' : 'off-road'}`;
  } else if (state.roadMatcher) {
    dom.streetName.textContent = 'No nearby mapped street';
    dom.roadStatus.textContent = 'Off road';
    dom.roadStatus.className = 'road-state off-road';
  }

  if (state.tileset) {
    const settled = Boolean(state.tileset.tilesLoaded);
    setStatus(dom.tilesStatus, settled ? '3D world: ready nearby' : '3D world: streaming', settled ? 'good' : 'warn');
    dom.diagTiles.textContent = settled ? 'Nearby tiles settled' : 'Streaming detail';
  }

  const surfaceAge = (performance.now() - state.surface.lastAcceptedAt) / 1000;
  if (state.surface.locked) {
    setStatus(dom.surfaceStatus, `Surface: locked ${state.surface.targetHeight.toFixed(1)} m`, surfaceAge < 2 ? 'good' : 'warn');
  } else {
    setStatus(dom.surfaceStatus, 'Surface: seeking 3D road', 'warn');
  }

  dom.diagFps.textContent = state.fps ? `${state.fps.toFixed(0)} fps` : '—';
  dom.diagHeight.textContent = state.surface.locked ? `${state.surface.displayHeight.toFixed(2)} m` : `fallback ${state.surface.displayHeight.toFixed(1)} m`;
  dom.diagRoadDistance.textContent = state.roadMatch ? `${state.roadMatch.distance.toFixed(1)} m` : '—';
  dom.diagPosition.textContent = `${state.vehicle.lat.toFixed(6)}, ${state.vehicle.lon.toFixed(6)}`;
}

function tick(now) {
  const rawDt = Math.max(0, (now - state.lastFrame) / 1000);
  const dt = Math.min(rawDt, 0.04);
  state.lastFrame = now;

  state.fpsFrames += 1;
  state.fpsElapsed += rawDt;
  if (state.fpsElapsed >= 0.75) {
    state.fps = state.fpsFrames / state.fpsElapsed;
    state.fpsFrames = 0;
    state.fpsElapsed = 0;
  }

  if (state.demoRunning && state.viewer && !dom.setupOverlay.hidden === false) {
    // Kept intentionally empty: opening setup pauses driving without destroying the streamed world.
  }

  if (state.demoRunning && state.viewer && dom.setupOverlay.hidden) {
    const driveInput = getDriveInput();
    const onRoad = isOnRoad();
    const next = stepTruckKinematics(state.vehicle, driveInput, dt, onRoad);
    state.vehicle.speed = next.speed;
    state.vehicle.steering = next.steering;
    state.vehicle.heading = next.heading;
    const moved = moveLatLon(state.vehicle.lat, state.vehicle.lon, state.vehicle.heading, state.vehicle.speed, dt);
    state.vehicle.lat = moved.lat;
    state.vehicle.lon = moved.lon;

    state.roadElapsed += dt;
    if (state.roadElapsed >= ROAD_MATCH_INTERVAL) {
      state.roadElapsed = 0;
      updateRoadMatch();
    }

    state.surface.elapsed += dt;
    if (state.surface.elapsed >= SURFACE_SAMPLE_INTERVAL) {
      state.surface.elapsed = 0;
      refreshSurfaceHeight();
    }
    state.surface.displayHeight = expStep(state.surface.displayHeight, state.surface.targetHeight, state.surface.locked ? 7.5 : 2.5, dt);

    updateTruckEntity();
    updateCamera(dt);

    state.hudElapsed += dt;
    if (state.hudElapsed >= 0.08) {
      state.hudElapsed = 0;
      updateHud(driveInput);
    }
  }

  requestAnimationFrame(tick);
}

function createViewer() {
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
    globe: false,
    shadows: false,
  });
  viewer.scene.backgroundColor = Cesium.Color.fromCssColorString('#071019');
  viewer.scene.fog.enabled = false;
  viewer.scene.highDynamicRange = true;
  const controls = viewer.scene.screenSpaceCameraController;
  controls.enableRotate = false;
  controls.enableTranslate = false;
  controls.enableZoom = false;
  controls.enableTilt = false;
  controls.enableLook = false;
  return viewer;
}

async function loadGoogleWorld(apiKey) {
  setStatus(dom.tilesStatus, '3D world: connecting to Google…', 'warn');
  const tileset = await Cesium.createGooglePhotorealistic3DTileset({
    key: apiKey,
    onlyUsingWithGoogleGeocoder: true,
  });
  tileset.maximumScreenSpaceError = QUALITY_SSE[state.quality] || QUALITY_SSE.balanced;
  tileset.enableCollision = true;
  state.viewer.scene.primitives.add(tileset);
  state.tileset = tileset;
  dom.diagTiles.textContent = 'Connected · streaming';
  if (tileset.tileFailed?.addEventListener) {
    tileset.tileFailed.addEventListener((event) => {
      console.warn('Google 3D tile failed', event);
      if (!state.tileset?.tilesLoaded) setStatus(dom.tilesStatus, '3D world: tile request issue', 'bad');
    });
  }
  return tileset;
}

function createTruck() {
  const position = vehicleCartesian();
  state.truckEntity = state.viewer.entities.add({
    id: 'demo-fire-truck',
    name: 'Generic Rescue Pumper',
    position,
    orientation: Cesium.Transforms.headingPitchRollQuaternion(position, new Cesium.HeadingPitchRoll(state.vehicle.heading + state.modelYawOffset, 0, 0)),
    model: {
      uri: TRUCK_MODEL_URL,
      scale: 1,
      minimumPixelSize: 24,
      maximumScale: 1.4,
      runAnimations: false,
      shadows: Cesium.ShadowMode.DISABLED,
    },
  });
}

function installViewerInput() {
  state.viewerAbort?.abort();
  const controller = new AbortController();
  state.viewerAbort = controller;
  const { signal } = controller;
  const canvas = state.viewer.canvas;
  let pointerId = null;
  let lastX = 0;
  let lastY = 0;

  canvas.addEventListener('pointerdown', (event) => {
    if (!state.demoRunning || !dom.setupOverlay.hidden) return;
    if (event.button !== 0 && event.pointerType === 'mouse') return;
    pointerId = event.pointerId;
    lastX = event.clientX;
    lastY = event.clientY;
    state.camera.mode = 'FREE_LOOK';
    canvas.setPointerCapture?.(pointerId);
  }, { signal });

  canvas.addEventListener('pointermove', (event) => {
    if (event.pointerId !== pointerId) return;
    const dx = event.clientX - lastX;
    const dy = event.clientY - lastY;
    lastX = event.clientX;
    lastY = event.clientY;
    state.camera.yawOffset = wrapAngle(state.camera.yawOffset - dx * 0.0052);
    state.camera.pitch = clamp(state.camera.pitch + dy * 0.0034, -0.9, -0.08);
  }, { signal });

  const release = (event) => {
    if (event.pointerId === pointerId) pointerId = null;
  };
  canvas.addEventListener('pointerup', release, { signal });
  canvas.addEventListener('pointercancel', release, { signal });

  canvas.addEventListener('wheel', (event) => {
    if (!dom.setupOverlay.hidden) return;
    event.preventDefault();
    state.camera.range = clamp(state.camera.range + Math.sign(event.deltaY) * 1.25, 8.5, 28);
  }, { passive: false, signal });
}

function recenterCamera() {
  state.camera.mode = 'RETURNING';
}

async function startDemo(apiKey, stationId, quality) {
  if (!Cesium) throw new Error('CesiumJS did not load. Check your internet connection and reload.');
  const station = STATIONS[stationId] || STATIONS.station1;
  state.station = station;
  state.quality = QUALITY_SSE[quality] ? quality : 'balanced';
  sessionStorage.setItem('google3d.demoKey', apiKey);
  sessionStorage.setItem('google3d.station', station.id);
  sessionStorage.setItem('google3d.quality', state.quality);

  state.demoRunning = false;
  state.viewerAbort?.abort();
  if (state.viewer && !state.viewer.isDestroyed()) state.viewer.destroy();
  state.viewer = null;
  state.tileset = null;
  state.truckEntity = null;
  resetVehicle({ forceSurface: true });
  dom.station.textContent = station.name;

  state.viewer = createViewer();
  installViewerInput();

  state.viewer.camera.setView({
    destination: Cesium.Cartesian3.fromDegrees(station.lon, station.lat, 340),
    orientation: {
      heading: station.headingDeg * Math.PI / 180,
      pitch: -1.12,
      roll: 0,
    },
  });

  await loadGoogleWorld(apiKey);
  createTruck();
  await roadDataPromise;
  updateRoadMatch();
  state.demoRunning = true;
  state.lastFrame = performance.now();
  dom.setupOverlay.hidden = true;
  setStatus(dom.surfaceStatus, 'Surface: seeking 3D road', 'warn');
  refreshSurfaceHeight();
  updateHud(getDriveInput());
}

function setupGlobalInput() {
  window.addEventListener('keydown', (event) => {
    if (isTypingTarget(event.target)) return;
    if (['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(event.code)) {
      event.preventDefault();
      input.keys.add(event.code);
    }
    if (event.code === 'KeyC' && !event.repeat) recenterCamera();
    if (event.code === 'KeyR' && !event.repeat) resetVehicle();
  });
  window.addEventListener('keyup', (event) => input.keys.delete(event.code));
  window.addEventListener('blur', () => { input.keys.clear(); input.mobileBrake = false; });
}

function setupJoystick() {
  let activePointer = null;
  const reset = () => {
    activePointer = null;
    input.joystickX = 0;
    input.joystickY = 0;
    dom.joystickKnob.style.transform = 'translate(-50%, -50%)';
  };
  const update = (event) => {
    const ring = dom.joystick.querySelector('.joystick-ring');
    const rect = ring.getBoundingClientRect();
    const radius = rect.width * 0.36;
    let dx = event.clientX - (rect.left + rect.width / 2);
    let dy = event.clientY - (rect.top + rect.height / 2);
    const length = Math.hypot(dx, dy);
    if (length > radius) { dx *= radius / length; dy *= radius / length; }
    let x = dx / radius;
    let y = dy / radius;
    if (Math.abs(x) < 0.08) x = 0;
    if (Math.abs(y) < 0.08) y = 0;
    input.joystickX = x;
    input.joystickY = y;
    dom.joystickKnob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
  };
  dom.joystick.addEventListener('pointerdown', (event) => {
    activePointer = event.pointerId;
    dom.joystick.setPointerCapture?.(activePointer);
    update(event);
  });
  dom.joystick.addEventListener('pointermove', (event) => { if (event.pointerId === activePointer) update(event); });
  dom.joystick.addEventListener('pointerup', (event) => { if (event.pointerId === activePointer) reset(); });
  dom.joystick.addEventListener('pointercancel', reset);

  const brakeDown = (event) => {
    event.preventDefault();
    input.mobileBrake = true;
    dom.mobileBrake.classList.add('is-down');
  };
  const brakeUp = () => {
    input.mobileBrake = false;
    dom.mobileBrake.classList.remove('is-down');
  };
  dom.mobileBrake.addEventListener('pointerdown', brakeDown);
  dom.mobileBrake.addEventListener('pointerup', brakeUp);
  dom.mobileBrake.addEventListener('pointercancel', brakeUp);
  dom.mobileBrake.addEventListener('pointerleave', brakeUp);
  dom.mobileRecenter.addEventListener('click', recenterCamera);
}

function setupUi() {
  const savedKey = sessionStorage.getItem('google3d.demoKey');
  if (savedKey) dom.apiKey.value = savedKey;
  const savedStation = sessionStorage.getItem('google3d.station');
  if (savedStation && STATIONS[savedStation]) dom.stationSelect.value = savedStation;
  const savedQuality = sessionStorage.getItem('google3d.quality');
  if (savedQuality && QUALITY_SSE[savedQuality]) dom.qualitySelect.value = savedQuality;

  dom.setupForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    hideSetupError();
    const apiKey = dom.apiKey.value.trim();
    if (!apiKey) return showSetupError('Paste a Google Maps Platform key with the Map Tiles API enabled.');
    dom.launchButton.disabled = true;
    dom.launchButton.textContent = 'Loading Google 3D…';
    try {
      await startDemo(apiKey, dom.stationSelect.value, dom.qualitySelect.value);
    } catch (error) {
      console.error(error);
      const message = String(error?.message || error || 'Unknown error');
      showSetupError(`Google 3D could not start. Confirm billing is enabled, the Map Tiles API is enabled, and the key is allowed to use it. ${message}`);
      setStatus(dom.tilesStatus, '3D world: failed to load', 'bad');
    } finally {
      dom.launchButton.disabled = false;
      dom.launchButton.textContent = 'Launch 3D Demo';
    }
  });

  dom.setupButton.addEventListener('click', () => {
    dom.setupOverlay.hidden = false;
    input.keys.clear();
    input.mobileBrake = false;
  });
  dom.diagnosticsToggle.addEventListener('click', () => { dom.diagnosticsPanel.hidden = !dom.diagnosticsPanel.hidden; });
  dom.diagnosticsClose.addEventListener('click', () => { dom.diagnosticsPanel.hidden = true; });
  dom.flipModel.addEventListener('click', () => { state.modelYawOffset = wrapAngle(state.modelYawOffset + Math.PI); });
  dom.resetTruck.addEventListener('click', () => resetVehicle());
}

setupGlobalInput();
setupJoystick();
setupUi();
requestAnimationFrame(tick);
