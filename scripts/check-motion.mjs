import assert from 'node:assert/strict';
import { renderPosition, playBetween, transitionDurationMs, regions } from '../src/motion/site-motion.mjs';
import { pieces } from '../src/motion/transition.mjs';

const positions = [0, 0.3, 0.5, 0.78, 0.79, 1, 1.5, 2, 2.5, 3, 3.5, 4];
for (const position of positions) {
  const svg = renderPosition(position);
  const opening = svg.match(/<svg\b[^>]*>/)?.[0];
  assert.ok(opening, `position ${position}: missing svg opening tag`);
  assert.match(opening, /preserveAspectRatio="xMidYMid slice"/, `position ${position}: wrong preserveAspectRatio`);
  assert.match(opening, /width:100%/, `position ${position}: missing width:100%`);
  assert.match(opening, /height:100%/, `position ${position}: missing height:100%`);
}

let now = 0;
let nextId = 0;
const pending = new Map();
globalThis.performance = { now: () => now };
globalThis.requestAnimationFrame = (callback) => {
  const id = ++nextId;
  pending.set(id, callback);
  return id;
};
globalThis.cancelAnimationFrame = (id) => pending.delete(id);

function drive(from, to) {
  const rendered = [];
  let completions = 0;
  playBetween(from, to, (position) => rendered.push(position), () => completions++);
  let steps = 0;
  while (pending.size) {
    assert.ok(++steps < 1000, `${from}→${to}: animation did not terminate`);
    const [id, callback] = pending.entries().next().value;
    pending.delete(id);
    now += 1000 / 30;
    callback(now);
  }
  assert.equal(completions, 1, `${from}→${to}: done must be called exactly once`);
  assert.equal(rendered.at(-1), to, `${from}→${to}: final render must equal target`);
}

for (const [from, to] of [[0, 1], [1, 2], [2, 3], [3, 4], [1, 0], [2, 1], [3, 2], [4, 3]]) drive(from, to);

// A real browser can hand the callback a timestamp that PRECEDES the moment the
// frame was scheduled, which makes the first `t` slightly negative. From
// position 0 that produced a negative position, an invalid segment index and a
// throw that killed the loop. This case is the regression.
assert.doesNotThrow(
  () => renderPosition(-0.006),
  'renderPosition must not throw on a negative position',
);
assert.doesNotThrow(
  () => renderPosition(4.2),
  'renderPosition must not throw above the last segment',
);

function driveWithEarlyTimestamp(from, to) {
  const rendered = [];
  let completions = 0;
  playBetween(from, to, (position) => rendered.push(position), () => completions++);
  let steps = 0;
  while (pending.size) {
    assert.ok(++steps < 1000, `${from}→${to}: animation did not terminate with an early timestamp`);
    const [id, callback] = pending.entries().next().value;
    pending.delete(id);
    now += 1000 / 30;
    callback(steps === 1 ? now - 60 : now);
  }
  assert.equal(completions, 1, `${from}→${to} (early): done must be called exactly once`);
  assert.equal(rendered.at(-1), to, `${from}→${to} (early): final render must equal target`);
  for (const position of rendered) {
    assert.ok(position >= 0, `${from}→${to} (early): rendered a negative position ${position}`);
  }
}

for (const [from, to] of [[0, 1], [1, 2], [2, 3], [3, 4]]) driveWithEarlyTimestamp(from, to);

// The wrap from the last scene back to the first used to chain four segment
// transitions, about twelve seconds to get home. It must play as one compressed
// gesture instead.
function driveWrap(from, to, timeScale) {
  const rendered = [];
  let completions = 0;
  playBetween(from, to, (position) => rendered.push(position), () => completions++, timeScale);
  let steps = 0;
  while (pending.size) {
    assert.ok(++steps < 5000, `${from}→${to} wrap: animation did not terminate`);
    const [id, callback] = pending.entries().next().value;
    pending.delete(id);
    now += 1000 / 30;
    callback(now);
  }
  assert.equal(completions, 1, `${from}→${to} wrap: done must be called exactly once`);
  assert.equal(rendered.at(-1), to, `${from}→${to} wrap: final render must equal target`);
  for (const position of rendered) {
    assert.ok(
      position >= 0 && position <= 4,
      `${from}→${to} wrap: rendered ${position}, outside 0-4`,
    );
  }
  return steps;
}

const WRAP_SCALE = 2400 / (4 * 3000);
const wrapForward = driveWrap(0, 4, WRAP_SCALE);
const wrapBack = driveWrap(4, 0, WRAP_SCALE);
assert.ok(
  wrapForward < 90 && wrapBack < 90,
  `a wrap must finish in under 90 frames, got ${wrapForward} and ${wrapBack}`,
);

// The signature and the scene copy read their transition duration from this same
// number. If the two drift apart, the labels arrive before the artwork, which is
// exactly what the owner saw.
// The archive components in `src/main.ts` read their names from the motion
// engine's piece table and their boxes from `regions[1]`, in order. Those two
// lists must not drift apart, or a component would carry another piece's name.
assert.equal(
  regions[1].length,
  pieces.length,
  `portafolio has ${regions[1].length} hit regions but ${pieces.length} named pieces`,
);
assert.equal(
  new Set(pieces.map((piece) => piece.name)).size,
  pieces.length,
  'piece names must be unique',
);

const frameMs = 1000 / 30;
const tolerance = 3 * frameMs;
for (const [from, to, scale] of [
  [0, 1, 1],
  [1, 2, 1],
  [3, 4, 1],
  [0, 4, WRAP_SCALE],
  [4, 0, WRAP_SCALE],
]) {
  const frames = driveWrap(from, to, scale);
  const actual = frames * frameMs;
  const declared = transitionDurationMs(from, to, scale);
  assert.ok(
    Math.abs(actual - declared) <= tolerance,
    `${from}→${to}: labels would run ${Math.round(declared)}ms but the artwork takes ${Math.round(actual)}ms`,
  );
}
console.log(
  `check-motion: 12 renders, 8 directed transitions, 4 early-timestamp transitions, ` +
    `2 compressed wraps and 5 duration-parity checks OK`,
);
