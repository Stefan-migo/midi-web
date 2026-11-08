import {placeLabels} from './label-layout.mjs';
import {renderPosition, regions, playBetween} from './site-motion.mjs';

const world = document.querySelector('#world');
const svg = document.querySelector('#pieces');
const reveal = document.querySelector('#reveal');
const body = document.querySelector('#reveal-body');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const names = ['inicio', 'portafolio', 'nosotros', 'contacto', 'exploraciones'];
const titles = ['MIDI', 'Archivo de formas', 'Entre una mirada y otra', 'Una señal, un encuentro', 'Exploraciones'];
const art = document.querySelector('#motion-art');
const routes = names;
let scene = 0;
let position = 0;
let targetPosition = 0;
let selected = 0;
let paused = reduced.matches;
let stopPlayback;
let returnFocus;

function showFrame(next) {
 position = next;
 art.innerHTML = renderPosition(next);
}

function mountPieces() {
 svg.replaceChildren();
 regions[targetPosition].forEach(([x, y, right, bottom], index) => {
  const piece = document.createElementNS(svg.namespaceURI, 'rect');
  piece.setAttribute('class', 'piece');
  piece.setAttribute('role', 'button');
  piece.setAttribute('tabindex', '0');
  piece.setAttribute('aria-label', scene === 0
   ? 'Desplegar universo MIDI, fragmento ' + (index + 1)
   : 'Abrir ' + names[scene] + ', fragmento ' + (index + 1));
  for (const [key, value] of Object.entries({x, y, width: right - x, height: bottom - y})) {
   piece.setAttribute(key, value);
  }
  const activate = () => scene === 0 ? go(1) : openContent(index);
  piece.addEventListener('click', activate);
  piece.addEventListener('keydown', event => {
   if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    activate();
   }
  });
  svg.append(piece);
 });
}

function go(index) { location.hash = routes[index]; }

function setScene(animate = true) {
 const route = location.hash.slice(1) === 'contacto-final' ? 'exploraciones' : location.hash.slice(1);
 targetPosition = Math.max(0, routes.indexOf(route));
 scene = targetPosition;
 closeContent();
 stopPlayback?.();
 world.dataset.scene = scene;
 document.querySelector('#scene-title').textContent = titles[scene];
 document.querySelector('#scene-subtitle').textContent = ['materia en movimiento','exploraciones / identidad MIDI','MIDI / colectivo artístico','holamidi.info@gmail.com', 'archivo / identidad en proceso'][scene];
 document.querySelector('#advance').innerHTML = '0' + scene + ' / 04 <span>↗</span>';
 document.querySelectorAll('.scene-map a').forEach((a,i) => {
  if (i === scene) a.setAttribute('aria-current','page');
  else a.removeAttribute('aria-current');
 });
 const shouldAnimate = animate && !paused && !reduced.matches && position !== targetPosition;
 placeLabels(scene, shouldAnimate);
 if (!shouldAnimate) {
  showFrame(targetPosition);
  mountPieces();
  stopPlayback = undefined;
  return;
 }
 svg.replaceChildren();
 stopPlayback = playBetween(position, targetPosition, showFrame, () => {
  stopPlayback = undefined;
  mountPieces();
 });
}
function openContent(index) {
 returnFocus = document.activeElement;
 selected = index%4;
 if(scene===1 || scene===4) {
  body.innerHTML = '<h2 id="reveal-title">' + (scene === 4 ? 'Exploración' : 'Archivo') + ' / 0'+(selected+1)+'</h2><img id="art" src="assets/estudio-'+(selected+7)+'.png" alt="Exploración gráfica de la identidad MIDI"><div class="work-switch"><button id="previous" aria-label="Pieza anterior">←</button><button id="next" aria-label="Pieza siguiente">→</button></div>';
  document.querySelector('#previous').onclick=()=>changeArt(-1);
  document.querySelector('#next').onclick=()=>changeArt(1);
 } else if(scene===2) {
  body.innerHTML = '<h2 id="reveal-title">MIDI.<br>En colectivo.</h2><p>Un punto de encuentro para imaginar, experimentar y dar forma a nuevas ideas.</p><p>Entre una mirada y otra aparecen otras posibilidades. Nos interesa ese espacio compartido.</p><p>/ Colectivo Artístico</p>';
 } else {
  body.innerHTML = '<h2 id="reveal-title">Abrir un diálogo.</h2><a href="mailto:holamidi.info@gmail.com">holamidi.info@gmail.com ↗</a><a href="https://www.instagram.com/midi4all/" target="_blank" rel="noopener noreferrer">Instagram / midi4all ↗</a><a href="https://www.tiktok.com/@midi4all" target="_blank" rel="noopener noreferrer">TikTok / midi4all ↗</a>';
 }
 reveal.hidden=false;
 reveal.setAttribute('role','dialog');reveal.setAttribute('aria-modal','true');
 document.querySelector('#close').focus();
}
function changeArt(step) {
 selected=(selected+step+4)%4;
 document.querySelector('#art').src='assets/estudio-'+(selected+7)+'.png';
 document.querySelector('#reveal-title').textContent=(scene === 4 ? 'Exploración' : 'Archivo') + ' / 0'+(selected+1);
}
function closeContent() {
 const wasOpen=!reveal.hidden;
 reveal.hidden=true;
 if(wasOpen && returnFocus) returnFocus.focus();
}
document.querySelector('#close').onclick=closeContent;
function advance(direction) {
 if (stopPlayback || !reveal.hidden) return;
 const next = targetPosition + direction;
 if (next < 0 || next >= routes.length) {
  location.hash = routes[(next + routes.length) % routes.length];
  setScene(false);
 } else go(next);
}

document.querySelector('#advance').onclick = () => advance(1);
function syncMotionButton() {
 const button = document.querySelector('#motion');
 button.textContent = paused ? '▷' : 'Ⅱ';
 button.setAttribute('aria-label', paused ? 'Activar movimiento' : 'Pausar movimiento');
}
document.querySelector('#motion').onclick = () => {
 paused = !paused;
 syncMotionButton();
 if (paused && stopPlayback) setScene(false);
};
world.addEventListener('pointermove', e => {
 document.querySelector('#coordinate').textContent = String(Math.round(e.clientX)).padStart(3,'0') + ' : ' + String(Math.round(e.clientY)).padStart(3,'0');
});
let lastWheel = -Infinity;
world.addEventListener('wheel', e => {
 if (!reveal.hidden || Math.abs(e.deltaY) < 20) return;
 e.preventDefault();
 const now = performance.now();
 const isNewGesture = now - lastWheel > 180;
 lastWheel = now;
 if (isNewGesture) advance(Math.sign(e.deltaY));
},{passive:false});
let touchOrigin;
const composition = document.querySelector('#composition');
composition.addEventListener('touchstart', e => {
 if (e.touches.length === 1) touchOrigin = e.touches[0].clientY;
},{passive:true});
composition.addEventListener('touchend', e => {
 if (touchOrigin === undefined) return;
 const distance = touchOrigin - e.changedTouches[0].clientY;
 touchOrigin = undefined;
 if (Math.abs(distance) > 55) advance(Math.sign(distance));
},{passive:true});
composition.addEventListener('touchcancel', () => { touchOrigin = undefined; });
document.addEventListener('keydown',e=>{
 if(e.key==='Escape')closeContent();
 if(!reveal.hidden && e.key==='Tab') {
  const elements=[...reveal.querySelectorAll('button,a')];
  const first=elements[0],end=elements[elements.length-1];
  if(e.shiftKey&&document.activeElement===first){e.preventDefault();end.focus();}
  else if(!e.shiftKey&&document.activeElement===end){e.preventDefault();first.focus();}
 }
});
reduced.addEventListener('change', () => {
 paused = reduced.matches;
 syncMotionButton();
 if (paused && stopPlayback) setScene(false);
});
addEventListener('hashchange', () => setScene());
addEventListener('resize', () => placeLabels(scene));
document.fonts.ready.then(() => { if (!stopPlayback) placeLabels(scene); });
syncMotionButton();
setScene(false);
