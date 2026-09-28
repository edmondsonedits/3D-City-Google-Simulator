import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const entry = await fs.readFile(new URL('../app-dispatch-v0.0.46.js', import.meta.url), 'utf8');
const mode = await fs.readFile(new URL('../app-dispatch-mode-v0.0.46.js', import.meta.url), 'utf8');
const runtime = await fs.readFile(new URL('../app-dispatch-runtime-v0.0.46.js', import.meta.url), 'utf8');
const dispatchData = await fs.readFile(new URL('../dispatch/vendor/dispatch-data-v1.4.20.js', import.meta.url), 'utf8');

test('core road runtime starts before optional Dispatch data', () => {
  const runtimeAt = entry.indexOf('app-dispatch-runtime-v0.0.46.js');
  const modeAt = entry.indexOf('app-dispatch-mode-v0.0.46.js');
  assert.ok(runtimeAt >= 0 && modeAt >= 0 && runtimeAt < modeAt);
  assert.equal(mode.includes('app-dispatch-runtime-v0.0.46.js'), false);
});

test('Dispatch database has a fallback without DecompressionStream', () => {
  assert.match(dispatchData, /fflate@0\.8\.2/);
  assert.match(dispatchData, /gunzipSync/);
  assert.doesNotMatch(dispatchData, /This browser does not support the compressed dispatch database/);
});

test('road loader has a distinct mirror fallback and never hangs silently', () => {
  assert.match(runtime, /ROAD_DATA_FALLBACK_URL/);
  assert.match(runtime, /raw\.githubusercontent\.com/);
  assert.match(runtime, /Street matching unavailable · driving still works/);
  assert.match(runtime, /ROAD DATA unavailable after retry/);
});
