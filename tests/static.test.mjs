import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const index = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const app = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');
const runtime = fs.readFileSync(new URL('../app-v0.0.8.js', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../features-v0.0.8.css', import.meta.url), 'utf8');

test('release metadata is aligned to v0.0.8', () => {
  assert.equal(pkg.version, '0.0.8');
  assert.match(index, /3D City Response Simulator — v0\.0\.8/);
  assert.match(index, /validation\.js\?v=0\.0\.8/);
  assert.match(index, /app\.js\?v=0\.0\.8/);
  assert.match(index, /features-v0\.0\.8\.css\?v=0\.0\.8/);
  assert.match(app, /app-v0\.0\.8\.js\?v=0\.0\.8/);
});

test('Google Photorealistic 3D tiles retain required credits and request tuning', () => {
  assert.match(index, /showCreditsOnScreen:\s*true/);
  assert.match(index, /tile\.googleapis\.com:443/);
  assert.match(index, /=\s*18/);
  assert.match(runtime, /createGooglePhotorealistic3DTileset\([\s\S]*?showCreditsOnScreen:\s*true/);
  assert.doesNotMatch(index, /Cesium\.createGooglePhotorealistic3DTileset\s*=/);
});

test('setup is simplified to API key, camera and quality only', () => {
  assert.match(index, /id="api-key"/);
  assert.match(index, /id="camera-select"/);
  assert.match(index, /id="quality-select"/);
  assert.doesNotMatch(index, /id="station-select"/);
  assert.doesNotMatch(index, /id="ontario-city-input"/);
  assert.doesNotMatch(index, /id="spawn-tools"/);
  assert.doesNotMatch(index, /id="spawn-address"/);
  assert.doesNotMatch(index, /id="recover-surface-button"/);
});

test('Ontario God-eye picker supports desktop hover and mobile centre-cursor selection', () => {
  assert.match(index, /id="city-picker-overlay"/);
  assert.match(index, /class="city-picker-crosshair"/);
  assert.match(index, /id="city-picker-name"/);
  assert.match(index, /id="city-picker-start"/);
  assert.match(index, /id="city-picker-back"/);
  assert.match(runtime, /const ONTARIO_CITIES = Object\.freeze\(\[/);
  const cityBlock = runtime.slice(runtime.indexOf('const ONTARIO_CITIES'), runtime.indexOf('const dom ='));
  assert.equal((cityBlock.match(/\{ name:/g) || []).length, 52);
  assert.match(runtime, /ScreenSpaceEventType\.MOUSE_MOVE/);
  assert.match(runtime, /pickerIsMobile\(\)/);
  assert.match(runtime, /clientWidth \/ 2/);
  assert.match(runtime, /clientHeight \/ 2/);
  assert.match(runtime, /setPickerCity\(pickerNearestCity/);
});

test('city selection animates smoothly into the selected city before driving', () => {
  assert.match(runtime, /camera\.flyTo\(\{[\s\S]*?duration:\s*1\.65/);
  assert.match(runtime, /Cartesian3\.fromDegrees\(city\.lon, city\.lat, 14000\)/);
  assert.match(runtime, /state\.camera\.range = Math\.max\(220/);
  assert.match(runtime, /state\.camera\.range = expStep\(state\.camera\.range, preset\.range/);
  assert.match(css, /city-picker-launching/);
});

test('camera options still include tactical and GTA bird-eye views', () => {
  assert.match(index, /value="tactical">Tactical overhead/);
  assert.match(index, /value="birdsEye">Bird’s-eye · GTA/);
  assert.match(runtime, /birdsEye:[^\n]*range:\s*95[^\n]*pitch:\s*-1\.24/);
  assert.match(runtime, /CAMERA_ORDER[^\n]*'tactical'[^\n]*'birdsEye'/);
});

test('mobile driving HUD and long-press protections remain intact', () => {
  assert.match(index, /class="topbar compact-topbar"/);
  assert.doesNotMatch(index, /id="mobile-camera"/);
  assert.match(index, /id="mobile-brake"/);
  assert.match(index, /id="mobile-recenter"[^>]*>CENTER<\/button>/);
  assert.match(css, /-webkit-touch-callout:\s*none/);
  assert.match(css, /user-select:\s*none/);
  assert.match(css, /touch-action:\s*none/);
  assert.match(runtime, /contextmenu[\s\S]*preventDefault/);
  assert.match(runtime, /selectstart[\s\S]*preventDefault/);
});

test('validation report UI remains available for simulator handoff testing', () => {
  assert.match(index, /id="copy-validation-report"/);
  assert.match(index, /id="diag-readiness"/);
  assert.match(index, /id="diag-drive-test"/);
  assert.match(index, /id="diag-camera-test"/);
});
