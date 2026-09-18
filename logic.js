export const VERSION = '0.0.8';

export const TRUCK = Object.freeze({
  length: 10.4,
  width: 2.55,
  wheelBase: 5.65,
  maxForwardSpeed: 27.5,
  maxReverseSpeed: 7.2,
  forwardAccel: 3.85,
  reverseAccel: 2.65,
  serviceBrake: 8.8,
  rollingDrag: 0.52,
  maxSteeringLowSpeed: 0.54,
  maxSteeringHighSpeed: 0.15,
  steeringResponse: 3.55,
  steeringReturnResponse: 4.35,
  offroadForwardSpeed: 11.5,
  offroadReverseSpeed: 4.85,
  offroadAccelMultiplier: 0.7,
  offroadDrag: 1.2,
  chaseDistance: 22,
  chasePitch: -0.34,
});

export function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
export function wrapAngle(angle) {
  const twoPi = Math.PI * 2;
  let result = (angle + Math.PI) % twoPi;
  if (result < 0) result += twoPi;
  return result - Math.PI;
}
export function approach(current, target, maxDelta) {
  if (current < target) return Math.min(target, current + maxDelta);
  if (current > target) return Math.max(target, current - maxDelta);
  return current;
}
export function expStep(current, target, response, dt) {
  if (response <= 0 || dt <= 0) return current;
  const alpha = 1 - Math.exp(-response * dt);
  return current + (target - current) * alpha;
}
export function stepTruckKinematics(state, input, rawDt, onRoad = true) {
  const dt = clamp(Number(rawDt) || 0, 0, 0.04);
  if (!dt) return { ...state };
  const throttle = clamp(Number(input?.throttle) || 0, -1, 1);
  const steerInput = clamp(Number(input?.steer) || 0, -1, 1);
  const brake = clamp(Number(input?.brake) || 0, 0, 1);
  const forwardCap = onRoad ? TRUCK.maxForwardSpeed : TRUCK.offroadForwardSpeed;
  const reverseCap = onRoad ? TRUCK.maxReverseSpeed : TRUCK.offroadReverseSpeed;
  const accelMultiplier = onRoad ? 1 : TRUCK.offroadAccelMultiplier;
  const drag = onRoad ? TRUCK.rollingDrag : TRUCK.offroadDrag;
  let speed = Number(state?.speed) || 0;
  let steering = Number(state?.steering) || 0;
  let heading = Number(state?.heading) || 0;
  const throttleStrength = Math.pow(Math.abs(throttle), 0.82);
  if (brake > 0.01) speed = approach(speed, 0, TRUCK.serviceBrake * brake * dt);
  else if (throttle > 0.01) {
    if (speed < -0.2) speed = approach(speed, 0, TRUCK.serviceBrake * 0.72 * dt);
    else speed += TRUCK.forwardAccel * accelMultiplier * throttleStrength * dt;
  } else if (throttle < -0.01) {
    if (speed > 0.2) speed = approach(speed, 0, TRUCK.serviceBrake * 0.72 * dt);
    else speed -= TRUCK.reverseAccel * accelMultiplier * throttleStrength * dt;
  } else speed = approach(speed, 0, drag * dt);
  speed = clamp(speed, -reverseCap, forwardCap);
  const speedRatio = clamp(Math.abs(speed) / Math.max(TRUCK.maxForwardSpeed, 0.001), 0, 1);
  const maxSteer = TRUCK.maxSteeringLowSpeed + (TRUCK.maxSteeringHighSpeed - TRUCK.maxSteeringLowSpeed) * speedRatio;
  const targetSteering = Math.sign(steerInput) * Math.pow(Math.abs(steerInput), 1.08) * maxSteer;
  const steeringResponse = Math.abs(steerInput) > 0.02 ? TRUCK.steeringResponse : TRUCK.steeringReturnResponse;
  steering = expStep(steering, targetSteering, steeringResponse, dt);
  if (Math.abs(speed) > 0.03) heading = wrapAngle(heading + (speed / TRUCK.wheelBase) * Math.tan(steering) * dt);
  return { speed, steering, heading };
}
export function moveLatLon(lat, lon, heading, speed, dt) {
  const distance = speed * dt;
  const north = Math.cos(heading) * distance;
  const east = Math.sin(heading) * distance;
  const metersPerDegLat = 111_320;
  const metersPerDegLon = Math.max(10_000, metersPerDegLat * Math.cos(lat * Math.PI / 180));
  return { lat: lat + north / metersPerDegLat, lon: lon + east / metersPerDegLon };
}
export function angleDifference(a, b) { return Math.abs(wrapAngle(a - b)); }
export function roadHeadingDifference(vehicleHeading, segmentHeading) {
  const direct = angleDifference(vehicleHeading, segmentHeading);
  return Math.min(direct, Math.abs(Math.PI - direct));
}
export function advanceVehicle(vehicle, input, elapsed, onRoad) {
  let remaining = clamp(Number(elapsed) || 0, 0, 0.25);
  let next = { ...vehicle };
  while (remaining > 1e-9) {
    const dt = Math.min(remaining, 1 / 120);
    next = { ...next, ...stepTruckKinematics(next, input, dt, onRoad) };
    Object.assign(next, moveLatLon(next.lat, next.lon, next.heading, next.speed, dt));
    remaining -= dt;
  }
  return next;
}
export function roadAllowsFullSpeed(hasRoadData, match, distanceFromSpawn) {
  return Boolean(hasRoadData && (distanceFromSpawn < 65 || (match && match.distance <= 16)));
}
