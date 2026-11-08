const ink = '#111111';
const paper = '#f4f4f4';

export const studies = [
  {id: 'Escena-1', frames: 75},
  {id: 'Transicion-2', frames: 120},
  {id: 'Transicion-3', frames: 120},
  {id: 'Transicion-4', frames: 120},
];

const clamp = (n) => Math.max(0, Math.min(1, n));
export const smooth = (n) => clamp(n) ** 2 * (3 - 2 * clamp(n));

export function progressAt(frame) {
  return smooth((frame - 10) / 48);
}

function rect(x, y, w, h) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}"/>`;
}

// The M paths come from the solid and outline SVGs in the MIDI logo pack.
const solidM = 'M37.50,1.05L498.50,0.83L499.50,1.50L499.50,192.50L460.50,193.50L460.50,620.50L459.50,621.17L269.50,621.17L268.16,620.50L268.16,193.50L267.50,193.00L193.50,193.00L192.84,193.50L192.84,620.50L191.50,621.17L1.50,621.17L0.50,620.50L0.50,193.50L1.50,192.83L36.50,192.83L37.16,191.50Z';
const outlinedM = 'M33.50,0.50L436.50,0.50L437.17,1.50L437.17,167.50L436.50,168.84L404.50,168.84L403.17,169.50L403.17,542.50L402.50,543.50L235.50,543.50L234.83,542.50L234.83,169.50L233.50,168.84L169.50,168.84L169.00,169.50L169.00,542.50L168.50,543.50L1.50,543.50L0.50,542.51L0.50,169.50L1.50,168.50L31.50,168.50L32.83,167.50L32.83,1.50Z M52.50,19.84L417.50,19.84L418.00,20.50L418.00,148.50L417.50,149.50L384.50,149.50L384.00,150.50L384.00,523.50L383.50,524.16L254.50,524.16L254.00,523.50L254.00,150.50L253.50,149.50L150.50,149.50L149.83,150.50L149.83,523.50L148.50,524.16L20.50,524.16L19.84,523.50L19.84,188.50L20.50,187.84L51.84,187.50L52.00,20.50Z';

export function stretchLogos(t) {
  const solidWidth = 192.17 + 1800 * t;
  const outlinedWidth = 168.5 + 1580 * t;
  const stroke = 19.3;

  // Grow both parts of each i from the edge next to the M.
  const whiteI = rect(536, 0.83, solidWidth, 192.17) + rect(536, 229.5, solidWidth, 391.67);
  const outlinedI = [[0.5, 168], [200.83, 342.67]].map(([y, height]) =>
    rect(469, y, outlinedWidth, height) +
    `<g fill="${ink}">${rect(469 + stroke, y + stroke, outlinedWidth - 2 * stroke, height - 2 * stroke)}</g>`
  ).join('');

  const solidStartX = (1200 - 729 * 0.49) / 2;
  const solidStartY = (900 - 622 * 0.49) / 2;
  const outlinedStartX = (1200 + 638 * 0.56) / 2;
  const outlinedStartY = (900 - 544 * 0.56) / 2;
  const solidX = solidStartX + (127 - solidStartX) * t;
  const solidY = solidStartY + (115 - solidStartY) * t;
  const outlinedX = outlinedStartX + (1048 - outlinedStartX) * t;
  const outlinedY = outlinedStartY + (506 - outlinedStartY) * t;

  // Cover the rear logo inside the foreground bounds, including the spaces between letters.
  const cover = rect(-2, -2, 536 + solidWidth + 4, 626);
  return `<g fill="${paper}" transform="translate(${outlinedX} ${outlinedY}) scale(-0.56 0.56)">
    <path fill-rule="evenodd" d="${outlinedM}"/>${outlinedI}
  </g><g fill="${paper}" transform="translate(${solidX} ${solidY}) scale(0.49)">
    <g fill="${ink}">${cover}</g>
    <path d="${solidM}"/>${whiteI}
  </g>`;
}

export function draw(value) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 900" preserveAspectRatio="xMidYMid meet" overflow="hidden" style="display:block;width:100%;height:100%;background:${ink}" aria-hidden="true">${stretchLogos(clamp(value))}</svg>`;
}
