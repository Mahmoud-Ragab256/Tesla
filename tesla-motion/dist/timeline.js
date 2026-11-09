// Shot timings observed from the user's 45.63 second reference film.
// Each cut has its own camera. Vehicle motion is shared across replay angles.
export const DURATION = 45.63;
export const INTRO_DURATION = 20;
export const PLAYBACK_RATE = DURATION / INTRO_DURATION;
export const RAMP = { x: 3, radius: 13, angle: 1.85, width: 3.6 };
export const SHOTS = [
  [0, 2.12713, 'Rear reveal'], [2.12713, 6.5, 'The climb'], [6.5, 9.55, 'Up the wall'],
  [9.55, 12.1, 'The launch'], [12.1, 15.4, 'First impact'], [15.4, 17.4758, 'Ground pass'],
  [17.4758, 20.3537, 'The climb · replay'], [20.3537, 23.6, 'Airborne · front view'],
  [23.6, 27.3607, 'Through the smoke'], [27.3607, 30.9893, 'Overhead drift'],
  [30.9893, 35.2, 'The full picture'], [35.2, 38.5, 'The leap · wide view'],
  [38.5, 44.6, 'The runout'], [44.6, DURATION, 'Fade to black']
];
const clamp = value => Math.max(0, Math.min(1, value));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = value => { const t = clamp(value); return t * t * (3 - 2 * t); };
const mix = (a, b, t) => a.map((value, i) => lerp(value, b[i], t));
export function rampPose(theta) {
  return { position: [RAMP.x + RAMP.radius * Math.sin(theta) - .12 * Math.sin(theta), RAMP.radius * (1 - Math.cos(theta)) + .12 * Math.cos(theta), 0], rotation: [0, 0, theta] };
}
export function jumpPose(u) {
  const t = clamp(u), launch = rampPose(RAMP.angle).position;
  return {
    position: [lerp(launch[0], -7, t), Math.max(0, launch[1] * (1 - t) + 28 * t * (1 - t)), Math.sin(t * Math.PI) * .6],
    rotation: [Math.sin(t * Math.PI) * .08, Math.PI * smooth(t / .75), RAMP.angle * (1 - smooth(t / .45))]
  };
}
export function sampleTimeline(seconds) {
  const time = Math.max(0, Math.min(DURATION, seconds));
  let shot = SHOTS.findIndex(([start, end]) => time >= start && time < end);
  if (shot < 0) shot = SHOTS.length - 1;
  const [start, end, name] = SHOTS[shot], u = clamp((time - start) / (end - start));
  let pose = { position: [0, 0, 0], rotation: [0, 0, 0] };
  let eye = [0, 4, 10], target = [0, 1, 0], fov = 42;
  let impact = 0, impactAge = -1, smokeOrigin = [-7, 0, 0], trail = 0, second = false;
  if (shot === 0) {
    pose.position = [lerp(-2, .7, smooth(u)), 0, 0];
    eye = [pose.position[0] - 7.5, 1.45, 1.1]; target = [pose.position[0] + 1.1, 1.1, 0]; fov = 44;
  } else if (shot === 1) {
    pose = rampPose(lerp(0, 1.06, u));
  } else if (shot === 2) {
    pose = rampPose(lerp(1.06, RAMP.angle, u)); eye = [pose.position[0] - 7, pose.position[1] + 1.7, 9]; target = mix(pose.position, [8, 7.5, 0], .15); fov = 45;
  } else if (shot === 3) {
    pose = jumpPose(u * .76); eye = [2, 12, 38]; target = [4, 9, 0]; fov = 45; trail = .3;
  } else if (shot === 4) {
    const landing = clamp(u / .28); pose = jumpPose(.76 + landing * .24);
    if (u > .28) { pose.position = [lerp(-7, -12, (u - .28) / .72), 0, 0]; pose.rotation = [0, Math.PI, 0]; }
    impactAge = time - 13.024; impact = 1;
  } else if (shot === 5) {
    pose.position = [lerp(-12, -18, u), 0, 0]; pose.rotation = [0, Math.PI, 0]; trail = .25;
  } else if (shot === 6) {
    pose = u < .7 ? rampPose(lerp(.6, RAMP.angle, u / .7)) : jumpPose((u - .7) / .3 * .33); eye = [pose.position[0] - 6.5, pose.position[1] + .8, 7.5]; target = [pose.position[0], pose.position[1] + .8, 0]; fov = 46;
  } else if (shot === 7) {
    pose = jumpPose(.33 + u * .51); eye = [pose.position[0] + Math.cos(pose.rotation[1]) * 8, pose.position[1] + .2, pose.position[2] - Math.sin(pose.rotation[1]) * 8 + 1]; target = [pose.position[0], pose.position[1] + .6, pose.position[2]]; fov = 48; trail = .4;
  } else if (shot === 8) {
    const landing = clamp(u / .45); pose = jumpPose(.84 + landing * .16);
    if (u > .45) { pose.position = [lerp(-7, -11, (u - .45) / .55), 0, 0]; pose.rotation = [0, Math.PI, 0]; }
    eye = [pose.position[0] + Math.cos(pose.rotation[1]) * 8, pose.position[1] + .2, pose.position[2] - Math.sin(pose.rotation[1]) * 8 + 1]; target = [pose.position[0], pose.position[1] + .6, pose.position[2]]; fov = 48; impactAge = time - 25.2923; impact = 1;
  } else if (shot === 9) {
    pose.position = [lerp(-11, -4, u), 0, Math.sin(u * Math.PI) * 3]; pose.rotation = [0, -.7 + u * 2.7, 0];
    eye = [-7, 22, 1.6]; target = [-7, 0, 0]; fov = 42; trail = 1; impactAge = time - 25.2923; impact = 1;
  } else if (shot === 10) {
    pose = rampPose(lerp(0, RAMP.angle, smooth(u))); eye = [-20, 24, 40]; target = [3, 6, 1]; fov = 43; second = true;
  } else if (shot === 11) {
    pose = jumpPose(u); eye = [-20, 24, 40]; target = [3, 6, 1]; fov = 43; second = true;
  } else {
    const run = clamp((time - 38.5) / (DURATION - 38.5)); pose.position = [lerp(-7, -29, run), 0, 0]; pose.rotation = [0, Math.PI, 0];
    eye = [lerp(-20, -30, run), 24, 40]; target = [lerp(3, -7, run), 6, 1]; fov = 43; impactAge = time - 38.5; impact = 1; trail = .8; second = true;
  }
  if (shot >= 1 && shot <= 5) { eye = [-18, 10, 32]; target = [7, 7, 0]; fov = 42; }
  // Continuous dolly/orbit movement within each take; preserve the reference cuts.
  const take = shot === 0 ? [0, 2.12713] : shot <= 5 ? [2.12713, 17.4758] : shot === 6 ? [17.4758, 20.3537] : shot <= 8 ? [20.3537, 27.3607] : shot === 9 ? [27.3607, 30.9893] : [30.9893, DURATION];
  const drift = smooth((time - take[0]) / (take[1] - take[0]));
  const angle = shot === 0 || shot === 6 ? 0 : -.045 + drift * .09;
  const push = shot === 9 ? 1 - drift * .055 : 1.04 - drift * .12;
  const dx = eye[0] - target[0], dy = eye[1] - target[1], dz = eye[2] - target[2];
  eye = [target[0] + (dx * Math.cos(angle) - dz * Math.sin(angle)) * push, target[1] + dy * push, target[2] + (dx * Math.sin(angle) + dz * Math.cos(angle)) * push];
  fov -= Math.sin(drift * Math.PI) * 1.4;
  return { time, shot, name, position: pose.position, rotation: pose.rotation, eye, target, fov, impact, impactAge, smokeOrigin, trail,
    second: { visible: second, position: [lerp(-6, 5, clamp((time - 30.9893) / 14.64)), 0, 7], rotation: [0, 0, 0] },
    blackout: shot === 13 ? smooth(u) : 0 };
}
