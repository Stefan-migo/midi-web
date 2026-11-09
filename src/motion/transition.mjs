import {draw, smooth, stretchLogos} from './motion.mjs';

const width = 1200;
const height = 900;
const assemblyFrame = 91;
const ink = '#111111';
const paper = '#f4f4f4';
const mix = (a, b, t) => a + (b - a) * t;

const targetSolid = `<path d="M80 166.5H271V593.5H346.5V166.5H537.5V593H576.5V785H116.5V593.5H80Z"/>
<path d="M76 0H268V130H76Z M346 0H537.5V130H346Z"/>`;
const targetOutline = `<path fill-rule="evenodd" d="M562 398H965.5V566.5H997.5V940.5H829.5V566.5H764V940.5H596V566.5H562Z
M581.5 418H946V585.5H978V921H849V546.5H744V921H615.5V546.5H581.5Z
M596 972.5H764V1090H596Z M615.5 992H744V1090H615.5Z
M833 972.5H1000.5V1090H833Z M852.5 992H981V1090H852.5Z"/>`;

// Each row maps an independently clipped piece from Scene 1 to the reference artwork.
// Bounds are [left, top, right, bottom]; arcs add a small offset during travel.
export const pieces = [
  {name: 'solid-cap', from: [127, 115, 372, 209.825], to: [116, 593, 577, 786], delay: 9, arc: -65},
  {name: 'solid-left', from: [127, 209.825, 222, 420], to: [76, 166, 272, 594.5], delay: 2, arc: -40},
  {name: 'solid-right', from: [258, 209.825, 373, 420], to: [346, 166, 538, 594.5], delay: 5, arc: 50},
  {name: 'solid-dot', from: [389, 115, 1200, 210], to: [76, 0, 268, 130], delay: 0, arc: -78},
  {name: 'solid-stem', from: [389, 226, 1200, 420], to: [346, 0, 538, 130], delay: 5, arc: -20},
  {name: 'outline-cap', from: [802, 506, 1048, 600.55], to: [561, 398, 998, 566.5], delay: 13, arc: -70},
  {name: 'outline-left', from: [802, 600.55, 917, 811], to: [596, 565, 764, 941], delay: 9, arc: -40},
  {name: 'outline-right', from: [953, 600.55, 1048, 811], to: [829.5, 566.5, 998, 941], delay: 15, arc: 32},
  {name: 'outline-dot', from: [0, 506, 786, 601], to: [595, 972, 765, 1068], delay: 13, arc: 44},
  {name: 'outline-stem', from: [0, 618, 786, 811], to: [832, 972, 1001, 1068], delay: 18, arc: 63},
];

function crop(bounds, art) {
  const [x, y, right, bottom] = bounds;
  return `<svg width="1" height="1" viewBox="${x} ${y} ${right - x} ${bottom - y}" preserveAspectRatio="none" overflow="hidden">${art}</svg>`;
}

const sourceArt = stretchLogos(1).replaceAll(paper, '#fff').replaceAll(ink, '#000');
const targetArt = `<g fill="#fff">${targetSolid}${targetOutline}</g>`;
const pieceMasks = pieces.map(({name, from, to}) => `
  <mask id="source-${name}" x="0" y="0" width="1" height="1" maskUnits="userSpaceOnUse">${crop(from, sourceArt)}</mask>
  <mask id="target-${name}" x="0" y="0" width="1" height="1" maskUnits="userSpaceOnUse">${crop(to, targetArt)}</mask>`).join('');

/**
 * Masks painting only the paper of one piece at rest. The hit boxes are
 * partitions of the artwork, so a highlight shaped like the box reads as a
 * frame around the piece; one masked by these grows from the piece's own
 * silhouette instead. Coordinates are the composition's, and the mask sits on
 * the piece bounds so scaling the element scales the silhouette with it.
 */
export function silhouetteMasks(names) {
  return pieces
    .filter(({name}) => names.includes(name))
    .map(({name, from}) => {
      const [left, top, right, bottom] = from;
      const width = right - left;
      const height = bottom - top;
      return `<mask id="silhouette-${name}" maskUnits="userSpaceOnUse" x="${left}" y="${top}" width="${width}" height="${height}"><g transform="translate(${left} ${top}) scale(${width} ${height})">${crop(from, sourceArt)}</g></mask>`;
    })
    .join('');
}

function animatePiece(piece, frame, sourceScaleX = 1, sourceScaleY = 1) {
  const {name, from, to, delay, arc} = piece;
  const start = 5 + delay;
  const t = smooth((frame - start) / (assemblyFrame - start));
  const startBounds = from.map((value, i) => value * (i % 2 ? sourceScaleY : sourceScaleX));
  const [left, top, right, bottom] = startBounds.map((value, i) => mix(value, to[i] * (i % 2 ? height / 1068 : width / 1065), t));
  // Bound the arc so the top and bottom edges can approach their targets without overshooting.
  const topTravel = to[1] * height / 1068 - startBounds[1];
  const bottomTravel = to[3] * height / 1068 - startBounds[3];
  const maxArc = Math.min(Math.abs(topTravel), Math.abs(bottomTravel)) / Math.PI;
  const curveOffset = Math.max(-maxArc, Math.min(arc, maxArc)) * Math.sin(Math.PI * t);
  const edge = smooth((t - 0.18) / 0.64);
  return `<g transform="translate(${left} ${top + curveOffset}) scale(${right - left} ${bottom - top})">
    <rect x="0" y="0" width="${edge}" height="1" mask="url(#target-${name})"/>
    <rect x="${edge}" y="0" width="${1 - edge}" height="1" mask="url(#source-${name})"/>
  </g>`;
}

export function drawTransition(frame) {
  if (frame <= 5) return draw(1);

  // Once assembled, draw the continuous paths to avoid antialiasing seams between tiles.
  if (frame >= assemblyFrame) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid slice"
      style="display:block;width:100%;height:100%;background:${paper}" aria-hidden="true">
      <rect width="${width}" height="${height}" fill="${paper}"/>
      <g fill="${ink}" transform="scale(${width / 1065} ${height / 1068})">${targetSolid}${targetOutline}</g>
    </svg>`;
  }

  const split = width * smooth((frame - 30) / 46);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid slice"
    style="display:block;width:100%;height:100%;background:${ink}" aria-hidden="true">
    <defs>
      ${pieceMasks}
      <g id="transition-pieces">${pieces.map((piece) => animatePiece(piece, frame)).join('')}</g>
      <clipPath id="light-field"><rect width="${split}" height="${height}"/></clipPath>
      <clipPath id="dark-field"><rect x="${split}" width="${width - split}" height="${height}"/></clipPath>
    </defs>
    <rect width="${width}" height="${height}" fill="${ink}"/>
    <use href="#transition-pieces" fill="${paper}" clip-path="url(#dark-field)"/>
    <g clip-path="url(#light-field)">
      <rect width="${width}" height="${height}" fill="${paper}"/>
      <use href="#transition-pieces" fill="${ink}"/>
    </g>
  </svg>`;
}

const thirdArtwork = [
  // Long ring, lower lintel, three uprights, and the right-hand i.
  {from: 'outline-cap', bounds: [132, 533, 901, 645], shape: '<path fill-rule="evenodd" d="M132 533H901V645H132Z M152 553H881V625H152Z"/>', delay: 7, arc: -44},
  {from: 'solid-cap', bounds: [132, 666, 901, 686], shape: rectShape(132, 666, 769, 20), delay: 11, arc: 32},
  {from: 'solid-left', bounds: [132, 686, 152, 1068], shape: rectShape(132, 686, 20, 382), delay: 2, arc: -50},
  {from: 'outline-left', bounds: [696, 686, 716, 1068], shape: rectShape(696, 686, 20, 382), delay: 13, arc: 25},
  {from: 'outline-right', bounds: [881, 686, 901, 1068], shape: rectShape(881, 686, 20, 382), delay: 15, arc: 35},
  {from: 'solid-right', bounds: [958, 0, 1044, 498], shape: '<path fill-rule="evenodd" d="M958 0H1044V498H958Z M978 0H1024V478H978Z"/>', delay: 4, arc: -75},
  {from: 'solid-stem', bounds: [958, 536, 1044, 617], shape: '<path fill-rule="evenodd" d="M958 536H1044V617H958Z M978 556H1024V597H978Z"/>', delay: 8, arc: -60},
];

function rectShape(x, y, width, height) {
  return `<rect x="${x}" y="${y}" width="${width}" height="${height}"/>`;
}

const thirdExits = [
  {from: 'solid-dot', bounds: [-240, -155, -35, -25], delay: 2, arc: -38},
  {from: 'outline-dot', bounds: [550, 1085, 720, 1180], delay: 4, arc: 18},
  {from: 'outline-stem', bounds: [1085, 1020, 1250, 1115], delay: 6, arc: 25},
];

const thirdPieces = [...thirdArtwork, ...thirdExits].map(({from, bounds, shape, delay, arc}) => ({
  name: `third-${from}`,
  from: pieces.find((piece) => piece.name === from).to,
  to: bounds,
  shape,
  delay,
  arc,
}));

const thirdMasks = thirdPieces.map(({name, from, to, shape}) => {
  const source = crop(from, targetArt);
  const destination = shape ? crop(to, `<g fill="#fff">${shape}</g>`) : source;
  return `<mask id="source-${name}" x="0" y="0" width="1" height="1" maskUnits="userSpaceOnUse">${source}</mask>
    <mask id="target-${name}" x="0" y="0" width="1" height="1" maskUnits="userSpaceOnUse">${destination}</mask>`;
}).join('');

export function drawTransitionThree(frame) {
  if (frame <= 5) return drawTransition(119);

  const split = 608 * width / 1065 * smooth((frame - 16) / 65);
  const assembled = frame >= assemblyFrame;
  // Join the lintel and uprights into one contour for the settled frame.
  const lowerFrame = '<path d="M132 1068V666H901V1068H881V686H716V1068H696V686H152V1068Z"/>';
  const art = assembled
    ? `<g transform="scale(${width / 1065} ${height / 1068})">${thirdArtwork[0].shape}${lowerFrame}${thirdArtwork.slice(5).map(({shape}) => shape).join('')}</g>`
    : thirdPieces.map((piece) => animatePiece(piece, frame, width / 1065, height / 1068)).join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid slice"
    style="display:block;width:100%;height:100%;background:${paper}" aria-hidden="true">
    <defs>
      ${assembled ? '' : thirdMasks}
      <g id="third-pieces">${art}</g>
      <clipPath id="third-dark"><rect width="${split}" height="${height}"/></clipPath>
      <clipPath id="third-light"><rect x="${split}" width="${width - split}" height="${height}"/></clipPath>
    </defs>
    <rect width="${width}" height="${height}" fill="${paper}"/>
    <use href="#third-pieces" fill="${ink}" clip-path="url(#third-light)"/>
    <g clip-path="url(#third-dark)">
      <rect width="${width}" height="${height}" fill="${ink}"/>
      <use href="#third-pieces" fill="${paper}"/>
    </g>
  </svg>`;
}

function openFrame(x, y, right, bottom, openEdge) {
  const stroke = 19.5;
  const innerRight = openEdge === 'right' ? right : right - stroke;
  const innerBottom = openEdge === 'bottom' ? bottom : bottom - stroke;
  return `<path fill-rule="evenodd" d="M${x} ${y}H${right}V${bottom}H${x}Z
    M${x + stroke} ${y + stroke}H${innerRight}V${innerBottom}H${x + stroke}Z"/>`;
}

const fourthArtwork = [
  // Each column of the lower frame travels independently, and its lintel splits in three.
  {from: [132, 533, 901, 645], box: [83.5, 66.5, 1031, 146], edge: 'right', delay: 2, arc: -65},
  {from: [132, 686, 152, 1068], box: [111.5, 257.5, 196.5, 919.5], delay: 6, arc: -42},
  {from: [132, 666, 430, 686], box: [215.5, 316.5, 529, 396], delay: 7, arc: -30},
  {from: [430, 666, 690, 686], box: [443.5, 218, 528.5, 298], delay: 11, arc: -46},
  {from: [958, 536, 1044, 617], box: [621, 188.5, 797, 351.5], delay: 9, arc: -60},
  {from: [958, 0, 1044, 498], box: [621, 370, 691, 640], delay: 13, arc: 56},
  {from: [696, 686, 716, 1068], box: [215.5, 443.5, 389, 1066], edge: 'bottom', delay: 10, arc: -18},
  {from: [881, 686, 901, 1068], box: [744, 370, 1003.5, 1066], edge: 'bottom', delay: 15, arc: 35},
  {from: [690, 666, 901, 686], box: [628.5, 965.5, 698.5, 1066], edge: 'bottom', delay: 17, arc: 47},
];

const fourthPieces = fourthArtwork.map(({from, box, edge, delay, arc}, index) => ({
  name: `fourth-${index}`,
  from,
  to: box.map((value, i) => value * (i % 2 ? 1068 / 1066 : 1065 / 1031)),
  shape: openFrame(...box, edge),
  box,
  delay,
  arc,
}));

const fourthSource = `<g fill="#fff">${thirdArtwork.map(({shape}) => shape).join('')}</g>`;
const fourthMasks = fourthPieces.map(({name, from, box, shape}) => `
  <mask id="source-${name}" x="0" y="0" width="1" height="1" maskUnits="userSpaceOnUse">${crop(from, fourthSource)}</mask>
  <mask id="target-${name}" x="0" y="0" width="1" height="1" maskUnits="userSpaceOnUse">${crop(box, `<g fill="#fff">${shape}</g>`)}</mask>`).join('');

export function drawTransitionFour(frame) {
  if (frame <= 5) return drawTransitionThree(119);

  const split = mix(608 * width / 1065, width, smooth((frame - 17) / 66));
  const assembled = frame >= assemblyFrame;
  const art = assembled
    ? `<g transform="scale(${width / 1031} ${height / 1066})">${fourthPieces.map(({shape}) => shape).join('')}</g>`
    : fourthPieces.map((piece) => animatePiece(piece, frame, width / 1065, height / 1068)).join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid slice"
    style="display:block;width:100%;height:100%;background:${ink}" aria-hidden="true">
    <defs>
      ${assembled ? '' : fourthMasks}
      <g id="fourth-pieces">${art}</g>
      <clipPath id="fourth-light"><rect x="${split}" width="${width - split}" height="${height}"/></clipPath>
      <clipPath id="fourth-dark"><rect width="${split}" height="${height}"/></clipPath>
    </defs>
    <rect width="${width}" height="${height}" fill="${ink}"/>
    <use href="#fourth-pieces" fill="${paper}" clip-path="url(#fourth-dark)"/>
    <g clip-path="url(#fourth-light)">
      <rect x="${split}" width="${width - split}" height="${height}" fill="${paper}"/>
      <use href="#fourth-pieces" fill="${ink}"/>
    </g>
  </svg>`;
}
