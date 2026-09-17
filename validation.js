const VERSION = '0.0.2';
const MOVE_PASS_METERS = 50;
const FPS_PASS = 25;

const el = {
  setupOverlay: document.querySelector('#setup-overlay'),
  container: document.querySelector('#cesium-container'),
  station: document.querySelector('#station-value'),
  quality: document.querySelector('#quality-select'),
  street: document.querySelector('#street-name'),
  fps: document.querySelector('#diag-fps'),
  tiles: document.querySelector('#diag-tiles'),
  roads: document.querySelector('#diag-roads'),
  height: document.querySelector('#diag-height'),
  position: document.querySelector('#diag-position'),
  drive: document.querySelector('#diag-drive-test'),
  camera: document.querySelector('#diag-camera-test'),
  performance: document.querySelector('#diag-performance-test'),
  readiness: document.querySelector('#diag-readiness'),
  copy: document.querySelector('#copy-validation-report'),
  recenter: document.querySelector('#mobile-recenter'),
};

const session = {
  startedAt: 0,
  startPosition: null,
  maxDistanceMeters: 0,
  freeLookSeen: false,
  recenterAfterFreeLook: false,
  tilesConnected: false,
  roadsReady: false,
  surfaceLocked: false,
  fpsSamples: [],
};

function parsePosition(text) {
  const match = String(text || '').match(/(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/);
  if (!match) return null;
  const lat = Number(match[1]);
  const lon = Number(match[2]);
  return Number.isFinite(lat) && Number.isFinite(lon) ? { lat, lon } : null;
}

function distanceMeters(a, b) {
  if (!a || !b) return 0;
  const meanLat = ((a.lat + b.lat) * 0.5) * Math.PI / 180;
  const north = (b.lat - a.lat) * 111_320;
  const east = (b.lon - a.lon) * 111_320 * Math.cos(meanLat);
  return Math.hypot(north, east);
}

function parseFps(text) {
  const value = Number.parseFloat(String(text || ''));
  return Number.isFinite(value) && value > 0 ? value : null;
}

function resetSession() {
  session.startedAt = Date.now();
  session.startPosition = null;
  session.maxDistanceMeters = 0;
  session.freeLookSeen = false;
  session.recenterAfterFreeLook = false;
  session.tilesConnected = false;
  session.roadsReady = false;
  session.surfaceLocked = false;
  session.fpsSamples = [];
  update();
}

function averageFps() {
  if (!session.fpsSamples.length) return null;
  return session.fpsSamples.reduce((sum, value) => sum + value, 0) / session.fpsSamples.length;
}

function snapshot() {
  const avgFps = averageFps();
  const drivePassed = session.maxDistanceMeters >= MOVE_PASS_METERS;
  const cameraPassed = session.freeLookSeen && session.recenterAfterFreeLook;
  const performancePassed = avgFps !== null && avgFps >= FPS_PASS;
  const automaticPassed = session.tilesConnected && session.roadsReady && session.surfaceLocked && drivePassed && cameraPassed && performancePassed;
  return {
    version: VERSION,
    station: el.station?.textContent?.trim() || 'Unknown',
    quality: el.quality?.value || 'Unknown',
    currentStreet: el.street?.textContent?.trim() || 'Unknown',
    tilesConnected: session.tilesConnected,
    roadsReady: session.roadsReady,
    surfaceLocked: session.surfaceLocked,
    drivePassed,
    cameraPassed,
    performancePassed,
    averageFps: avgFps,
    maxDistanceMeters: session.maxDistanceMeters,
    automaticPassed,
    elapsedSeconds: session.startedAt ? Math.round((Date.now() - session.startedAt) / 1000) : 0,
    userAgent: navigator.userAgent,
  };
}

function update() {
  const position = parsePosition(el.position?.textContent);
  if (position) {
    if (!session.startPosition) session.startPosition = position;
    session.maxDistanceMeters = Math.max(session.maxDistanceMeters, distanceMeters(session.startPosition, position));
  }

  const tileText = el.tiles?.textContent || '';
  if (/connected|settled|streaming detail/i.test(tileText) && !/not loaded|failed/i.test(tileText)) session.tilesConnected = true;

  const roadText = el.roads?.textContent || '';
  if (/\d[\d,]*\s+segments/i.test(roadText)) session.roadsReady = true;

  const heightText = el.height?.textContent || '';
  if (/\bm\b/i.test(heightText) && !/fallback/i.test(heightText)) session.surfaceLocked = true;

  const fps = parseFps(el.fps?.textContent);
  if (fps !== null) {
    session.fpsSamples.push(fps);
    if (session.fpsSamples.length > 30) session.fpsSamples.shift();
  }

  const result = snapshot();
  if (el.drive) el.drive.textContent = result.drivePassed ? `✓ PASS · ${result.maxDistanceMeters.toFixed(0)} m` : `○ drive ${MOVE_PASS_METERS} m · ${result.maxDistanceMeters.toFixed(0)} m`;
  if (el.camera) el.camera.textContent = result.cameraPassed ? '✓ PASS · free-look + recenter' : session.freeLookSeen ? '○ press C / Recenter' : '○ drag view, then recenter';
  if (el.performance) el.performance.textContent = result.averageFps === null ? '○ collecting FPS' : `${result.performancePassed ? '✓ PASS' : '△ CHECK'} · ${result.averageFps.toFixed(0)} avg fps`;
  if (el.readiness) {
    const coreCount = [result.tilesConnected, result.roadsReady, result.surfaceLocked, result.drivePassed, result.cameraPassed, result.performancePassed].filter(Boolean).length;
    el.readiness.textContent = result.automaticPassed ? '✓ AUTO PASS · complete visual checks' : `${coreCount}/6 automatic checks passed`;
  }
}

function validationReport() {
  const result = snapshot();
  const line = (ok, name, detail = '') => `${ok ? '[PASS]' : '[CHECK]'} ${name}${detail ? ` — ${detail}` : ''}`;
  return [
    `3D City Google Simulator validation report — v${result.version}`,
    `Station: ${result.station}`,
    `Quality: ${result.quality}`,
    `Current street: ${result.currentStreet}`,
    `Test time: ${result.elapsedSeconds}s`,
    '',
    'Automatic checks',
    line(result.tilesConnected, 'Google Photorealistic 3D Tiles connected'),
    line(result.roadsReady, 'Independent Peterborough road graph loaded'),
    line(result.surfaceLocked, 'Truck obtained a rendered-surface height lock'),
    line(result.drivePassed, 'Vehicle movement test', `${result.maxDistanceMeters.toFixed(0)} m from start`),
    line(result.cameraPassed, 'Free-look followed by recenter'),
    line(result.performancePassed, 'Performance', result.averageFps === null ? 'no FPS sample' : `${result.averageFps.toFixed(0)} average FPS`),
    '',
    'Manual checks — fill these in before giving this report to Codex',
    '[ ] Peterborough looks recognizable and detailed enough at street level.',
    '[ ] Fire truck scale and orientation look believable beside roads/buildings.',
    '[ ] Truck grounding is stable while moving; note any sinking, floating, rooftop/tree jumps, or bridge problems.',
    '[ ] Steering, acceleration, braking, and reverse feel acceptable for a heavy apparatus.',
    '[ ] Current-street label is generally correct and does not flicker badly at intersections/parallel roads.',
    '[ ] Chase camera remains useful while driving and stays in FOLLOW after recenter.',
    '[ ] Mobile joystick/brake/recenter are usable (if tested on mobile).',
    '[ ] Google attribution remains visibly rendered in the viewer.',
    '',
    'Problems / observations:',
    '- ',
    '',
    `Browser: ${result.userAgent}`,
  ].join('\n');
}

async function copyReport() {
  const text = validationReport();
  try {
    await navigator.clipboard.writeText(text);
    if (el.copy) {
      const old = el.copy.textContent;
      el.copy.textContent = 'Copied report ✓';
      setTimeout(() => { el.copy.textContent = old; }, 1800);
    }
  } catch (error) {
    console.warn('Could not copy validation report:', error);
    window.prompt('Copy this validation report:', text);
  }
}

el.container?.addEventListener('pointerdown', (event) => {
  if (!el.setupOverlay?.hidden) return;
  if (event.pointerType === 'mouse' && event.button !== 0) return;
  session.freeLookSeen = true;
}, true);

window.addEventListener('keydown', (event) => {
  if (event.code === 'KeyC' && session.freeLookSeen) session.recenterAfterFreeLook = true;
});

el.recenter?.addEventListener('click', () => {
  if (session.freeLookSeen) session.recenterAfterFreeLook = true;
});

el.copy?.addEventListener('click', copyReport);

if (el.setupOverlay) {
  new MutationObserver(() => {
    if (el.setupOverlay.hidden) resetSession();
  }).observe(el.setupOverlay, { attributes: true, attributeFilter: ['hidden'] });
}

setInterval(update, 1000);
update();

window.__CITY_DEMO_VALIDATION__ = Object.freeze({
  version: VERSION,
  snapshot,
  report: validationReport,
  reset: resetSession,
});
