import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TRUCK,
  VERSION,
  moveLatLon,
  roadHeadingDifference,
  stepTruckKinematics,
  wrapAngle,
} from '../logic.js';

const idle = () => ({ speed: 0, steering: 0, heading: 0 });

function simulate(seconds, hz, input, onRoad = true, initial = idle()) {
  let state = { ...initial };
  const dt = 1 / hz;
  for (let t = 0; t < seconds - 1e-9; t += dt) state = stepTruckKinematics(state, input, dt, onRoad);
  return state;
}

test('version is current validation demo release', () => {
  assert.equal(VERSION, '0.0.7');
});

test('forward throttle accelerates but respects apparatus top speed', () => {
  const state = simulate(20, 60, { throttle: 1, steer: 0, brake: 0 });
  assert.ok(state.speed > 20);
  assert.ok(state.speed <= TRUCK.maxForwardSpeed + 1e-9);
});

test('reverse throttle respects reverse cap', () => {
  const state = simulate(20, 60, { throttle: -1, steer: 0, brake: 0 });
  assert.ok(state.speed < -5);
  assert.ok(state.speed >= -TRUCK.maxReverseSpeed - 1e-9);
});

test('service brake stops a moving truck quickly without reversing it', () => {
  const braking = simulate(3, 60, { throttle: 0, steer: 0, brake: 1 }, true, { speed: 15, steering: 0, heading: 0 });
  assert.ok(Math.abs(braking.speed) < 0.01);
});

test('off-road surface materially limits maximum speed', () => {
  const road = simulate(12, 60, { throttle: 1, steer: 0, brake: 0 }, true);
  const offroad = simulate(12, 60, { throttle: 1, steer: 0, brake: 0 }, false);
  assert.ok(road.speed > offroad.speed + 10);
  assert.ok(offroad.speed <= TRUCK.offroadForwardSpeed + 1e-9);
});

test('right steering increases clockwise geographic heading while moving forward', () => {
  const state = simulate(2, 60, { throttle: 1, steer: 1, brake: 0 });
  assert.ok(state.heading > 0);
});

test('physics is stable across 60 Hz and 120 Hz simulation rates', () => {
  const a = simulate(5, 60, { throttle: 0.82, steer: 0.42, brake: 0 });
  const b = simulate(5, 120, { throttle: 0.82, steer: 0.42, brake: 0 });
  assert.ok(Math.abs(a.speed - b.speed) < 0.08, `${a.speed} vs ${b.speed}`);
  assert.ok(Math.abs(wrapAngle(a.heading - b.heading)) < 0.05, `${a.heading} vs ${b.heading}`);
});

test('geographic movement follows heading convention: 0 north, pi/2 east', () => {
  const north = moveLatLon(44.3, -78.32, 0, 10, 1);
  assert.ok(north.lat > 44.3);
  assert.ok(Math.abs(north.lon + 78.32) < 1e-8);
  const east = moveLatLon(44.3, -78.32, Math.PI / 2, 10, 1);
  assert.ok(east.lon > -78.32);
  assert.ok(Math.abs(east.lat - 44.3) < 1e-8);
});

test('road heading matching treats opposite travel directions as the same road', () => {
  assert.ok(roadHeadingDifference(0, Math.PI) < 1e-10);
  assert.ok(roadHeadingDifference(Math.PI / 2, -Math.PI / 2) < 1e-10);
});
