#!/usr/bin/env node
/**
 * Contract check for the contact hub: the hidden `/midi-links/` page and the
 * `/contacto/` panel mount one component, so they must show the same thing.
 *
 * They stopped matching once — the page gained a card the panel filtered out —
 * and nothing failed, because the divergence lived in a per-surface flag. The
 * HTML of built output cannot show it either: the hub is rendered at runtime.
 * So the rule is pinned here, at the source: one list, no per-surface filter,
 * both callers on the same contract.
 */
import { readFile } from 'node:fs/promises';

const failures = [];
let checks = 0;

async function read(path) {
  return readFile(new URL(`../${path}`, import.meta.url), 'utf8');
}

async function check(name, run) {
  checks += 1;
  try {
    await run();
  } catch (error) {
    failures.push(`${name}: ${error.message}`);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const content = await read('src/content/midi-links.ts');
const hub = await read('src/links/hub.ts');
const pageCall = await read('src/links/index.ts');
const panelCall = await read('src/main.ts');
const viewerContent = await read('src/content/noche-museos.ts');
const viewer = await read('src/links/viewer.ts');

await check('the same cards are declared once, in reading order', () => {
  const event = content.indexOf('Noche de los museos 2026');
  const home = content.indexOf('Sitio principal');
  assert(event !== -1, 'the event card is missing from the hub content');
  assert(home !== -1, 'the card back to the site is missing from the hub content');
  assert(event < home, 'the event card must come before the site card');
});

await check('nothing filters the cards per surface', () => {
  assert(!/onlyOnPage/.test(content), 'the content still marks a card as page-only');
  assert(!/placement/.test(hub), 'the renderer still takes a placement');
  assert(!/placement/.test(pageCall), 'the hidden page still passes a placement');
  assert(!/placement/.test(panelCall), 'the contact panel still passes a placement');
});

await check('the renderer draws the whole list', () => {
  assert(
    /for \(const entry of midiHub\.cards\)/.test(hub),
    'the renderer no longer walks every card of the hub',
  );
});

await check('both surfaces mount the same component', () => {
  assert(
    /renderMidiHub\(\{[\s\S]*?surface: 'ink'/.test(pageCall),
    'the hidden page does not mount the hub on ink',
  );
  assert(
    /renderMidiHub\(\{[\s\S]*?surface: 'paper'/.test(panelCall),
    'the contact panel does not mount the hub on paper',
  );
});

await check('the networks include the official YouTube channel', () => {
  assert(
    /href: 'https:\/\/www\.youtube\.com\/@holamidi'/.test(content),
    'the hub has no link to https://www.youtube.com/@holamidi',
  );
  assert(/icon: 'youtube'/.test(content), 'the YouTube link has no icon');
});

await check('the viewer offers the way back through its mark', () => {
  assert(
    /home: \{ label: 'Sitio principal', href: '\/' \}/.test(viewerContent),
    'the viewer content does not declare the way back to the site',
  );
  assert(/midi-viewer-brand/.test(viewer), 'the viewer renders no brand link');
  assert(
    /withBase\(liveViewer\.home\.href/.test(viewer),
    'the brand link does not point at the declared home',
  );
});

if (failures.length) {
  console.error(`check-hub: ${failures.length} of ${checks} checks failed`);
  for (const failure of failures) console.error(`  ✗ ${failure}`);
  process.exit(1);
}

console.log(`check-hub: ${checks} checks passed`);
