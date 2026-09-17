import test from 'node:test';
import assert from 'node:assert/strict';
import { advanceVehicle, roadAllowsFullSpeed } from '../logic.js';
import { SurfaceAlignmentService } from '../surface.js';

test('driving covers the same distance and turn at 10, 20, 60 and 120 FPS', () => {
  const states = [10, 20, 60, 120].map(hz => {
    let vehicle = { lat: 44.3, lon: -78.32, speed: 0, steering: 0, heading: 0 };
    for (let i = 0; i < hz * 6; i++) vehicle = advanceVehicle(vehicle, { throttle: 1, steer: 0.3 }, 1 / hz, true);
    return vehicle;
  });
  for (const value of states) for (const key of ['lat', 'lon', 'speed', 'heading']) {
    assert.ok(Math.abs(value[key] - states[0][key]) < 1e-8, key);
  }
});

test('long background stalls are capped and braking never crosses zero', () => {
  const v = { lat: 44.3, lon: -78.32, speed: 1, steering: 0, heading: 0 };
  assert.deepEqual(advanceVehicle(v, { brake: 1 }, 60, true), advanceVehicle(v, { brake: 1 }, 0.25, true));
  assert.equal(advanceVehicle(v, { brake: 1 }, 60, true).speed, 0);
});

test('unknown geography never enables normal road speed', () => {
  assert.equal(roadAllowsFullSpeed(false, null, 0), false);
  assert.equal(roadAllowsFullSpeed(true, null, 500), false);
  assert.equal(roadAllowsFullSpeed(true, { distance: 30 }, 500), false);
  assert.equal(roadAllowsFullSpeed(true, { distance: 10 }, 500), true);
  assert.equal(roadAllowsFullSpeed(true, null, 10), true);
});

test('surface requires corroboration, follows slope and rejects spikes without poisoning lock', () => {
  const surface = new SurfaceAlignmentService();
  const p = { lat: 44.3, lon: -78.32 };
  assert.equal(surface.accept(undefined, p), false);
  assert.equal(surface.accept(190, p), false);
  assert.equal(surface.accept(190.1, p), true);
  assert.equal(surface.accept(195, p), false);
  assert.equal(surface.height, 190.1);
  assert.equal(surface.accept(190.2, p), true);
  assert.equal(surface.accept(191, { ...p, lat: p.lat + 0.00005 }), true);
  surface.reset();
  assert.equal(surface.height, null);
  assert.equal(surface.accept(200, p), false);
  assert.equal(surface.accept(200.1, p), true);
});
