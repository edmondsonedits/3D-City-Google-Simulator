import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const index = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

test('release metadata is aligned to v0.0.2', () => {
  assert.equal(pkg.version, '0.0.2');
  assert.match(index, /3D City Response Simulator — v0\.0\.2/);
  assert.match(index, /validation\.js\?v=0\.0\.2/);
  assert.match(index, /app\.js\?v=0\.0\.2/);
});

test('Google Photorealistic 3D tiles are configured to show required on-screen credits', () => {
  assert.match(index, /showCreditsOnScreen:\s*true/);
});

test('Google recommended tile request concurrency optimization is present', () => {
  assert.match(index, /tile\.googleapis\.com:443/);
  assert.match(index, /=\s*18/);
});

test('validation report UI is present for Codex handoff testing', () => {
  assert.match(index, /id="copy-validation-report"/);
  assert.match(index, /id="diag-readiness"/);
  assert.match(index, /id="diag-drive-test"/);
  assert.match(index, /id="diag-camera-test"/);
});
