import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const index = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const app = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');
const runtime = fs.readFileSync(new URL('../app-v0.0.7.js', import.meta.url), 'utf8');

test('release metadata is aligned to v0.0.7', () => {
  assert.equal(pkg.version, '0.0.7');
  assert.match(index, /3D City Response Simulator — v0\.0\.6/);
  assert.match(index, /validation\.js\?v=0\.0\.6/);
  assert.match(index, /app\.js\?v=0\.0\.6/);
  assert.match(app, /app-v0\.0\.6\.js\?v=0\.0\.6/);
});

test('Google Photorealistic 3D tiles are configured to show required on-screen credits', () => {
  assert.match(index, /showCreditsOnScreen:\s*true/);
  assert.match(runtime, /createGooglePhotorealistic3DTileset\([\s\S]*?showCreditsOnScreen:\s*true/);
  assert.doesNotMatch(index, /Cesium\.createGooglePhotorealistic3DTileset\s*=/);
});

test('Google recommended tile request concurrency optimization is present', () => {
  assert.match(index, /tile\.googleapis\.com:443/);
  assert.match(index, /=\s*18/);
});

test('Ontario location picker and camera presets are present', () => {
  assert.match(index, /id="ontario-city-input"/);
  assert.match(index, /value="ontario"/);
  assert.match(index, /id="camera-select"/);
  assert.match(index, /id="camera-cycle-button"/);
  assert.match(runtime, /componentRestrictions:[\s\S]*administrativeArea:\s*'ON'/);
  assert.match(runtime, /CAMERA_PRESETS/);
});

test('validation report UI is present for Codex handoff testing', () => {
  assert.match(index, /id="copy-validation-report"/);
  assert.match(index, /id="diag-readiness"/);
  assert.match(index, /id="diag-drive-test"/);
  assert.match(index, /id="diag-camera-test"/);
});


test('mobile driving HUD keeps the road-ahead view open', () => {
  assert.match(index, /class="topbar compact-topbar"/);
  assert.match(index, /class="brand-chip glass"/);
  assert.doesNotMatch(index, /id="mobile-camera"/);
  assert.match(index, /id="mobile-brake"/);
  assert.match(index, /id="mobile-recenter"[^>]*>CENTER<\/button>/);
  assert.match(index, /features-v0\.0\.7\.css\?v=0\.0\.7/);
});


test('mobile long-press copy gestures are disabled only on driving surfaces', () => {
  const css = fs.readFileSync(new URL('../features-v0.0.7.css', import.meta.url), 'utf8');
  assert.match(css, /-webkit-touch-callout:\s*none/);
  assert.match(css, /user-select:\s*none/);
  assert.match(css, /touch-action:\s*none/);
  assert.match(runtime, /contextmenu[\s\S]*preventDefault/);
  assert.match(runtime, /selectstart[\s\S]*preventDefault/);
  assert.doesNotMatch(css, /#setup-overlay[^\{]*\{[^\}]*user-select:\s*none/);
});


test('v0.0.7 adds tactical and GTA bird-eye cameras', () => {
  assert.match(index, /value="tactical">Tactical overhead/);
  assert.match(index, /value="birdsEye">Bird’s-eye · GTA/);
  assert.match(runtime, /birdsEye:[^\n]*range:\s*95[^\n]*pitch:\s*-1\.24/);
  assert.match(runtime, /CAMERA_ORDER[^\n]*'tactical'[^\n]*'birdsEye'/);
  assert.match(runtime, /state\.camera\.range = clamp\([^\n]*150/);
});

test('v0.0.7 exposes Ontario address spawn and surface recovery tools', () => {
  assert.match(index, /id="spawn-tools"/);
  assert.match(index, /id="spawn-address"/);
  assert.match(index, /id="spawn-address-button"/);
  assert.match(index, /id="recover-surface-button"/);
  assert.match(runtime, /async function geocodeOntarioAddress/);
  assert.match(runtime, /administrativeArea:\s*'ON'/);
  assert.match(runtime, /async function spawnAtAddress/);
  assert.match(runtime, /async function recoverTruckToSurface/);
  assert.match(runtime, /sampleHeightMostDetailed/);
  assert.match(runtime, /Truck placed back on top of the rendered surface/);
});
