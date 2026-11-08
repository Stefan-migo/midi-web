import {regions} from './site-motion.mjs';

const signature = document.querySelector('.signature');
const copy = document.querySelector('.scene-copy');
const viewport = document.querySelector('#world');
const hitLayer = document.querySelector('#hit-regions');
const signatureAnchors = [
  [.02, .03], [.78, .03], [.63, .08], [.02, .22], [.40, .42],
];

function overlaps(a, b, gap = 12) {
  return a.x < b.right + gap && a.right > b.x - gap &&
    a.y < b.bottom + gap && a.bottom > b.y - gap;
}

function screenBounds([x, y, right, bottom], matrix) {
  const leftTop = new DOMPoint(x, y).matrixTransform(matrix);
  const rightBottom = new DOMPoint(right, bottom).matrixTransform(matrix);
  return {x: leftTop.x, y: leftTop.y, right: rightBottom.x, bottom: rightBottom.y};
}

function graphicBounds(scene) {
  const matrix = hitLayer.getScreenCTM();
  return matrix ? regions[scene].map(bounds => screenBounds(bounds, matrix)) : [];
}

function rectangle(x, y, width, height) {
  return {x, y, right: x + width, bottom: y + height};
}

function findSpace(element, obstacles, preferred) {
  const {width, height} = element.getBoundingClientRect();
  const area = viewport.getBoundingClientRect();
  const margin = innerWidth <= 650 ? 18 : 26;
  let best;
  let bestScore = Infinity;
  for (let y = margin; y <= area.height - height - margin; y += 12) {
    for (let x = margin; x <= area.width - width - margin; x += 12) {
      const box = rectangle(x, y, width, height);
      const collisions = obstacles.filter(other => overlaps(box, other));
      const score = collisions.reduce((sum, other) => sum +
        Math.max(0, Math.min(box.right + 12, other.right) - Math.max(box.x - 12, other.x)) *
        Math.max(0, Math.min(box.bottom + 12, other.bottom) - Math.max(box.y - 12, other.y)), 0);
      const distance = Math.hypot(x - preferred.x, y - preferred.y) / 100000;
      if (score + distance < bestScore) {
        bestScore = score + distance;
        best = box;
      }
    }
  }
  return best ?? rectangle(margin, margin, width, height);
}

export function placeLabels(scene, animate = false) {
  const obstacles = graphicBounds(scene);
  const hud = [...document.querySelectorAll('.coordinates, .scene-map, #advance, #motion, #whisper')]
    .map(node => node.getBoundingClientRect()).map(box => rectangle(box.x, box.y, box.width, box.height));
  const [anchorX, anchorY] = signatureAnchors[scene];
  const placedSignature = findSpace(signature, [...obstacles, ...hud],
    {x: innerWidth * anchorX, y: innerHeight * anchorY});
  const placedCopy = findSpace(copy, [...obstacles, ...hud, placedSignature],
    {x: innerWidth * .05, y: innerHeight * .76});

  viewport.toggleAttribute('data-label-motion', animate);
  signature.style.transform = `translate(${placedSignature.x}px, ${placedSignature.y}px)`;
  copy.style.transform = `translate(${placedCopy.x}px, ${placedCopy.y}px)`;
}
