import assert from 'node:assert/strict';
import { renderPosition, playBetween } from '../src/motion/site-motion.mjs';

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
console.log(`check-motion: ${positions.length} renders and 8 directed transitions OK`);
