import {draw, progressAt} from './motion.mjs';
import {drawTransition, drawTransitionThree, drawTransitionFour} from './transition.mjs';

const renders = [
  frame => draw(progressAt(frame)),
  drawTransition,
  drawTransitionThree,
  drawTransitionFour,
];
const lastFrames = [74, 119, 119, 119];
const settledFrames = [58, 91, 91, 91];
const frameRate = 30;

export function renderPosition(position) {
  const segment = Math.min(3, Math.floor(position));
  return renders[segment]((position - segment) * lastFrames[segment]);
}

// Click targets follow the independently moving parts at each resting composition.
const heroX = (1200 - 729 * .49) / 2;
const heroY = (900 - 622 * .49) / 2;
const logo = [[37,0,500,193],[0,193,193,622],[268,193,461,622],[536,0,729,193],[536,229,729,622]];
const scale = (boxes, width, height) => boxes.map(box => box.map((n,i) => n * (i % 2 ? 900 / height : 1200 / width)));
export const regions = [
  logo.map(box => box.map((n,i) => n * .49 + (i % 2 ? heroY : heroX))),
  [[145,115,372,210],[127,210,222,420],[258,210,353,420],[390,115,1200,210],[390,227,1200,420],
   [803,506,1048,601],[804,601,917,811],[953,601,1048,811],[0,506,786,601],[0,618,786,811]],
  scale([[116,593,577,785],[80,166,271,593],[346,166,538,593],[76,0,268,130],[346,0,538,130],
    [562,398,966,566],[596,566,764,941],[829,566,998,941],[596,972,764,1068],[833,972,1001,1068]],1065,1068),
  scale([[132,533,901,645],[132,666,901,686],[132,686,152,1068],[696,686,716,1068],
    [881,686,901,1068],[958,0,1044,498],[958,536,1044,617]],1065,1068),
  scale([[83,66,1031,146],[111,257,196,919],[215,316,529,396],[443,218,529,298],[621,188,797,351],
    [621,370,691,640],[215,443,389,1066],[744,370,1004,1066],[628,965,699,1066]],1031,1066),
];

export function playBetween(from, to, update, done) {
  if (from === to) { update(to); done(); return () => {}; }
  const forward = from < to;
  const segment = forward ? Math.floor(from) : Math.ceil(from) - 1;
  const boundary = forward ? Math.min(to, segment + 1) : Math.max(to, segment);
  const end = settledFrames[segment] / lastFrames[segment];
  const startPosition = forward ? from : Math.min(from, segment + end);
  const endPosition = forward ? Math.min(boundary, segment + end) : boundary;
  const duration = Math.abs(endPosition - startPosition) * lastFrames[segment] * 1000 / frameRate;
  const startTime = performance.now();
  let nextFrame;
  let stopNext;
  function tick(now) {
    const t = duration ? Math.min(1, (now - startTime) / duration) : 1;
    if (t < 1) {
      update(startPosition + (endPosition - startPosition) * t);
      nextFrame = requestAnimationFrame(tick);
    } else {
      update(boundary);
      if (boundary === to) done();
      else stopNext = playBetween(boundary, to, update, done);
    }
  }
  nextFrame = requestAnimationFrame(tick);
  return () => { cancelAnimationFrame(nextFrame); stopNext?.(); };
}
