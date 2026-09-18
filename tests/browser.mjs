// Real Cesium renderer + real GLB/OSM. Google and height samples are TEST FIXTURES.
// This never certifies real Google city coverage, grounding, or performance.
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const artifacts = path.join(root, 'artifacts');
await fs.mkdir(artifacts, { recursive: true });
const server = http.createServer(async (req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  const file = path.resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`);
  if (!file.startsWith(root)) return res.writeHead(403).end();
  try {
    const body = await fs.readFile(file);
    res.setHeader('Content-Type', ({ '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.geojson': 'application/geo+json', '.glb': 'model/gltf-binary' })[path.extname(file)] || 'application/octet-stream');
    res.end(body);
  } catch { res.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const url = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ ...(process.env.BROWSER_CHANNEL ? { channel: process.env.BROWSER_CHANNEL } : {}), headless: true });
const evidence = { googleValidated: false, surface: 'synthetic 190m test fixture', cases: [] };

function fixture() {
  const C = window.Cesium = { ...window.Cesium };
  const Original = C.Viewer;
  C.Viewer = function (...args) {
    const viewer = window.testViewer = new Original(...args);
    viewer.scene.sampleHeight = (_point, excluded) => {
      if (excluded?.[0]?.id !== 'demo-fire-truck') throw new Error('Truck must be excluded');
      window.sampleExcludesTruck = true;
      return 190;
    };
    // Synthetic test ground is never part of the shipped simulator.
    viewer.entities.add({ rectangle: { coordinates: C.Rectangle.fromDegrees(-78.34, 44.29, -78.30, 44.32), height: 190, material: C.Color.DARKSLATEGRAY } });
    return viewer;
  };
  C.createGooglePhotorealistic3DTileset = async (_key, options) => {
    if (!options?.showCreditsOnScreen) throw new Error('Missing Google attribution');
    window.testCreditsEnabled = options.showCreditsOnScreen;
    if (window.failStartup) throw new Error('Simulated root request failure');
    const tiles = window.testTiles = new C.PrimitiveCollection();
    tiles.tilesLoaded = true;
    tiles.tileFailed = new C.Event();
    tiles.allTilesLoaded = new C.Event();
    return tiles;
  };
}

async function launch(page) {
  await page.locator('#api-key').fill('browser-fixture-not-a-key');
  await page.locator('#launch-button').click();
  await page.waitForFunction(() => window.__CITY_DEMO_RUNTIME__?.snapshot().pickerActive);
  assert.equal(await page.locator('#city-picker-overlay').isVisible(), true);
  const selectedCity = (await page.locator('#city-picker-name').innerText()).trim();
  assert.ok(selectedCity.length > 0);
  assert.equal((await page.locator('#city-picker-start').innerText()).trim(), `Start in ${selectedCity}`);
  await page.locator('#city-picker-start').click();
  await page.waitForFunction(() => window.__CITY_DEMO_RUNTIME__?.snapshot().running);
  await page.waitForFunction(() => window.testViewer.scene.primitives._primitives.some(p => p.ready === true));
  await page.waitForFunction(() => window.__CITY_DEMO_RUNTIME__.snapshot().surfaceLocked);
  await page.waitForFunction(() => window.__CITY_DEMO_RUNTIME__.snapshot().cameraMode === 'FOLLOW', {}, { timeout: 10000 });
}
const runtime = page => page.evaluate(() => window.__CITY_DEMO_RUNTIME__.snapshot());

try {
  for (const [width, height] of [[390, 844], [768, 1024], [1440, 900]]) {
    const context = await browser.newContext({ viewport: { width, height }, hasTouch: width < 900 });
    const page = await context.newPage();
    const errors = [], failed = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('requestfailed', request => failed.push(request.url().split('?')[0]));
    await page.route('**/app.js?*', async route => {
      const response = await route.fetch();
      await route.fulfill({ response, body: `(${fixture.toString()})();\n${await response.text()}` });
    });
    await page.route('https://tile.openstreetmap.org/**', route => route.fulfill({
      status: 200,
      contentType: 'image/png',
      body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2nXQAAAAASUVORK5CYII=', 'base64'),
    }));
    await page.goto(url);
    await page.waitForFunction(() => window.__CITY_DEMO_RUNTIME__);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.screenshot({ path: path.join(artifacts, `setup-${width}.png`) });
    await launch(page);
    assert.equal(await page.evaluate(() => window.testCreditsEnabled && window.sampleExcludesTruck), true);
    assert.equal((await runtime(page)).roadsReady, true);
    assert.equal((await runtime(page)).cameraMode, 'FOLLOW');

    // Camera must sit behind the geographic travel direction (real Cesium coordinates).
    assert.ok(await page.evaluate(() => {
      const h = window.__CITY_DEMO_RUNTIME__.snapshot().vehicle.heading;
      const p = window.testViewer.camera.position;
      return p.x * Math.sin(h) + p.y * Math.cos(h) < -10;
    }));
    await page.screenshot({ path: path.join(artifacts, `fixture-${width}.png`) });

    if (width === 1440) {
      await page.keyboard.down('w');
      await page.waitForFunction(() => window.__CITY_DEMO_RUNTIME__.snapshot().distanceDriven > 50, { }, { timeout: 25000 });
      await page.keyboard.up('w');
      const driven = await runtime(page);
      assert.ok(driven.vehicle.speed > 0);
      await page.keyboard.down('d');
      await page.waitForTimeout(700);
      await page.keyboard.up('d');
      assert.notEqual((await runtime(page)).vehicle.heading, driven.vehicle.heading);
      await page.keyboard.down('Space');
      await page.waitForFunction(() => window.__CITY_DEMO_RUNTIME__.snapshot().vehicle.speed === 0);
      await page.keyboard.up('Space');
      await page.keyboard.down('s');
      await page.waitForFunction(() => window.__CITY_DEMO_RUNTIME__.snapshot().vehicle.speed < -1);
      await page.keyboard.up('s');
      await page.mouse.move(700, 280);
      await page.mouse.down();
      await page.mouse.move(950, 340, { steps: 8 });
      await page.mouse.up();
      assert.equal((await runtime(page)).cameraMode, 'FREE_LOOK');
      await page.waitForTimeout(1200);
      assert.equal((await runtime(page)).cameraMode, 'FREE_LOOK');
      await page.keyboard.press('c');
      assert.equal((await runtime(page)).cameraMode, 'RETURNING');
      await page.waitForFunction(() => window.__CITY_DEMO_RUNTIME__.snapshot().cameraMode === 'FOLLOW');
      await page.waitForTimeout(1200);
      assert.equal((await runtime(page)).cameraMode, 'FOLLOW');
      assert.equal(await page.evaluate(() => window.__CITY_DEMO_VALIDATION__.snapshot().cameraPassed), true);
      await page.locator('#setup-button').click();
      const paused = (await runtime(page)).vehicle;
      await page.waitForTimeout(300);
      assert.deepEqual((await runtime(page)).vehicle, paused);
      await page.locator('#resume-button').click();
      await page.keyboard.press('r');
      assert.equal((await runtime(page)).distanceDriven, 0);
      assert.equal(await page.evaluate(() => window.__CITY_DEMO_VALIDATION__.snapshot().drivePassed), false);
      assert.equal(await page.evaluate(() => window.__CITY_DEMO_VALIDATION__.snapshot().cameraPassed), false);
      await page.evaluate(() => window.testTiles.tileFailed.raiseEvent({}));
      await page.waitForTimeout(1100);
      assert.equal(await page.evaluate(() => window.__CITY_DEMO_VALIDATION__.snapshot().tilesConnected), false);
      await page.evaluate(() => window.testTiles.allTilesLoaded.raiseEvent());
      await page.locator('#setup-button').click();
      await page.evaluate(() => { window.failStartup = true; });
      await page.locator('#launch-button').click();
      await page.waitForFunction(() => window.__CITY_DEMO_RUNTIME__?.snapshot().pickerActive);
      await page.locator('#city-picker-start').click();
      await page.waitForFunction(() => !document.querySelector('#setup-error').hidden);
      assert.equal((await runtime(page)).running, false);
      await page.evaluate(() => { window.failStartup = false; });
      await launch(page);
      evidence.cases.push({ name: 'desktop driving', distanceMeters: driven.distanceDriven, turn: true, brake: true, reverse: true, persistentFollow: true, pauseResume: true, reset: true, tileFailure: true, startupRetry: true });
    }
    if (width === 390) {
      const cdp = await context.newCDPSession(page);
      const box = await page.locator('.joystick-ring').boundingBox();
      const x = box.x + box.width / 2, y = box.y + box.height / 2;
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1 }] });
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + 12, y: y - 38, id: 1 }] });
      await page.waitForFunction(() => window.__CITY_DEMO_RUNTIME__.snapshot().vehicle.speed > 1);
      assert.ok((await runtime(page)).input.steer > 0);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
      assert.deepEqual((await runtime(page)).input, { throttle: 0, steer: 0, brake: 0 });
      const brake = await page.locator('#mobile-brake').boundingBox();
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: brake.x + 20, y: brake.y + 20, id: 2 }] });
      assert.equal((await runtime(page)).input.brake, 1);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      assert.equal((await runtime(page)).input.brake, 0);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 200, y: 300, id: 3 }] });
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 290, y: 330, id: 3 }] });
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      assert.equal((await runtime(page)).cameraMode, 'FREE_LOOK');
      await page.locator('#mobile-recenter').tap();
      await page.waitForFunction(() => window.__CITY_DEMO_RUNTIME__.snapshot().cameraMode === 'FOLLOW');
      evidence.cases.push({ name: 'mobile touch', joystick: true, steering: true, cancelRelease: true, brake: true, cameraDrag: true, recenter: true });
    }
    assert.deepEqual(errors, []);
    assert.deepEqual(failed, []);
    evidence.cases.push({ name: `${width}x${height}`, errors, failed, horizontalOverflow: false, realModelRendered: true });
    await context.close();
  }
  // Exercise the actual unmodified API boundary with a rejected Google request.
  const errorPage = await browser.newPage();
  await errorPage.route('https://tile.openstreetmap.org/**', route => route.fulfill({
    status: 200,
    contentType: 'image/png',
    body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2nXQAAAAASUVORK5CYII=', 'base64'),
  }));
  const errorMessages = [];
  errorPage.on('pageerror', error => errorMessages.push(error.message));
  await errorPage.route('https://tile.googleapis.com/**', route => route.fulfill({
    status: 403, contentType: 'application/json', body: JSON.stringify({ error: { message: 'API key rejected by test fixture' } }),
  }));
  await errorPage.goto(url);
  await errorPage.locator('#api-key').fill('rejected-test-key');
  await errorPage.locator('#launch-button').click();
  await errorPage.waitForFunction(() => window.__CITY_DEMO_RUNTIME__?.snapshot().pickerActive);
  await errorPage.locator('#city-picker-start').click();
  await errorPage.waitForFunction(() => !document.querySelector('#setup-error').hidden);
  assert.equal(await errorPage.locator('#launch-button').isEnabled(), true);
  assert.equal(await errorPage.locator('#setup-error').innerText().then(text => text.includes('rejected-test-key')), false);
  assert.equal((await runtime(errorPage)).running, false);
  assert.deepEqual(errorMessages, []);
  await errorPage.close();
  evidence.cases.push({ name: 'actual Cesium API, rejected Google request fixture', recoverableError: true, keyNotEchoed: true });

  const storagePage = await browser.newPage();
  await storagePage.addInitScript(() => {
    Storage.prototype.getItem = Storage.prototype.setItem = () => { throw new DOMException('Blocked', 'SecurityError'); };
  });
  await storagePage.goto(url);
  await storagePage.waitForFunction(() => window.__CITY_DEMO_RUNTIME__);
  assert.equal(await storagePage.locator('#launch-button').isEnabled(), true);
  await storagePage.close();
  evidence.cases.push({ name: 'blocked sessionStorage', setupUsable: true });
  console.log(JSON.stringify(evidence, null, 2));
} finally {
  await fs.writeFile(path.join(artifacts, 'browser-results.json'), JSON.stringify(evidence, null, 2));
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
