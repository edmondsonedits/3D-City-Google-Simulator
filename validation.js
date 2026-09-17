const VERSION = '0.0.5';
const MOVE_PASS_METERS = 50;
const FPS_PASS = 25;
const el = {
  station: document.querySelector('#station-value'), quality: document.querySelector('#quality-select'), street: document.querySelector('#street-name'),
  drive: document.querySelector('#diag-drive-test'), camera: document.querySelector('#diag-camera-test'), performance: document.querySelector('#diag-performance-test'),
  readiness: document.querySelector('#diag-readiness'), copy: document.querySelector('#copy-validation-report'),
};
const session = { startedAt: 0, maxDistanceMeters: 0, freeLookSeen: false, returningSeen: false, recenterAfterFreeLook: false, tilesConnected: false, roadsReady: false, roadDataRequired: true, surfaceLocked: false, fpsSamples: [] };
function resetSession() {
  Object.assign(session, { startedAt: Date.now(), maxDistanceMeters: 0, freeLookSeen: false, returningSeen: false, recenterAfterFreeLook: false, tilesConnected: false, roadsReady: false, roadDataRequired: true, surfaceLocked: false, fpsSamples: [] });
  update();
}
function averageFps() { return session.fpsSamples.length ? session.fpsSamples.reduce((a,b) => a+b, 0) / session.fpsSamples.length : null; }
function snapshot() {
  const avgFps = averageFps();
  const drivePassed = session.maxDistanceMeters >= MOVE_PASS_METERS;
  const cameraPassed = session.freeLookSeen && session.recenterAfterFreeLook;
  const performancePassed = session.fpsSamples.length >= 10 && avgFps !== null && avgFps >= FPS_PASS;
  const roadsPassed = !session.roadDataRequired || session.roadsReady;
  return {
    version: VERSION, station: el.station?.textContent?.trim() || 'Unknown', quality: el.quality?.value || 'Unknown', currentStreet: el.street?.textContent?.trim() || 'Unknown',
    tilesConnected: session.tilesConnected, roadsReady: session.roadsReady, roadDataRequired: session.roadDataRequired, roadsPassed, surfaceLocked: session.surfaceLocked,
    drivePassed, cameraPassed, performancePassed, averageFps: avgFps, maxDistanceMeters: session.maxDistanceMeters,
    automaticPassed: session.tilesConnected && roadsPassed && session.surfaceLocked && drivePassed && cameraPassed && performancePassed,
    elapsedSeconds: session.startedAt ? Math.round((Date.now() - session.startedAt) / 1000) : 0, userAgent: navigator.userAgent,
  };
}
function update() {
  const runtime = window.__CITY_DEMO_RUNTIME__?.snapshot();
  session.tilesConnected = Boolean(runtime?.tilesConnected);
  session.roadsReady = Boolean(runtime?.roadsReady);
  session.roadDataRequired = runtime?.roadDataRequired !== false;
  session.surfaceLocked = Boolean(runtime?.surfaceLocked);
  if (runtime?.running) {
    session.maxDistanceMeters = runtime.distanceDriven;
    if (runtime.cameraMode === 'FREE_LOOK') session.freeLookSeen = true;
    if (session.freeLookSeen && runtime.cameraMode === 'RETURNING') session.returningSeen = true;
    if (session.returningSeen && runtime.cameraMode === 'FOLLOW') session.recenterAfterFreeLook = true;
    if (runtime.fps > 0) { session.fpsSamples.push(runtime.fps); if (session.fpsSamples.length > 30) session.fpsSamples.shift(); }
  }
  const result = snapshot();
  if (el.drive) el.drive.textContent = result.drivePassed ? `✓ PASS · ${result.maxDistanceMeters.toFixed(0)} m` : `○ drive ${MOVE_PASS_METERS} m · ${result.maxDistanceMeters.toFixed(0)} m`;
  if (el.camera) el.camera.textContent = result.cameraPassed ? '✓ PASS · free-look + recenter' : session.freeLookSeen ? '○ press C / Recenter' : '○ drag view, then recenter';
  if (el.performance) el.performance.textContent = result.averageFps === null ? '○ collecting FPS' : `${result.performancePassed ? '✓ PASS' : '△ CHECK'} · ${result.averageFps.toFixed(0)} avg fps`;
  if (el.readiness) {
    const checks = [result.tilesConnected, result.roadsPassed, result.surfaceLocked, result.drivePassed, result.cameraPassed, result.performancePassed];
    el.readiness.textContent = result.automaticPassed ? '✓ AUTO PASS · complete visual checks' : `${checks.filter(Boolean).length}/6 automatic checks passed`;
  }
}
function validationReport() {
  const result = snapshot(); const runtime = window.__CITY_DEMO_RUNTIME__?.snapshot();
  const line = (ok, name, detail = '') => `${ok ? '[PASS]' : '[CHECK]'} ${name}${detail ? ` — ${detail}` : ''}`;
  return [
    `3D City Google Simulator validation report — v${result.version}`,
    `Location: ${result.station}`, `Quality: ${result.quality}`, `Camera preset: ${runtime?.cameraPreset || 'Unknown'}`, `Current street/area: ${result.currentStreet}`, `Test time: ${result.elapsedSeconds}s`, '',
    'Automatic checks', line(result.tilesConnected, 'Google Photorealistic 3D Tiles connected'),
    result.roadDataRequired ? line(result.roadsReady, 'Independent Peterborough road graph loaded') : '[PASS] Peterborough road graph not required for Ontario free drive',
    line(result.surfaceLocked, 'Truck obtained a rendered-surface height lock'), line(result.drivePassed, 'Vehicle movement test', `${result.maxDistanceMeters.toFixed(0)} m driven since reset`),
    line(result.cameraPassed, 'Free-look followed by recenter'), line(result.performancePassed, 'Performance', result.averageFps === null ? 'no FPS sample' : `${result.averageFps.toFixed(0)} average FPS`), '',
    'Manual checks', '[ ] The selected Ontario location looks recognizable at street level.', '[ ] Fire truck scale and orientation look believable.', '[ ] Truck grounding remains stable while moving.', '[ ] Camera presets and free-look/recenter are useful.', '[ ] Google attribution remains visible.',
    result.roadDataRequired ? '[ ] Current-street label is generally correct.' : '[ ] Ontario free-drive mode correctly avoids claiming Peterborough street data.', '', 'Problems / observations:', '- ', '', `Browser: ${result.userAgent}`,
  ].join('\n');
}
async function copyReport() {
  const text = validationReport();
  try { await navigator.clipboard.writeText(text); if (el.copy) { const old = el.copy.textContent; el.copy.textContent = 'Copied report ✓'; setTimeout(() => { el.copy.textContent = old; }, 1800); } }
  catch { window.prompt('Copy this validation report:', text); }
}
window.addEventListener('city-session-reset', resetSession);
window.addEventListener('city-camera-mode', event => {
  if (event.detail === 'FREE_LOOK') session.freeLookSeen = true;
  if (event.detail === 'RETURNING' && session.freeLookSeen) session.returningSeen = true;
  if (event.detail === 'FOLLOW' && session.returningSeen) session.recenterAfterFreeLook = true;
});
el.copy?.addEventListener('click', copyReport);
setInterval(update, 1000); update();
window.__CITY_DEMO_VALIDATION__ = Object.freeze({ version: VERSION, snapshot, report: validationReport, reset: resetSession });
