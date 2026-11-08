/**
 * Structural check for the prerendered route documents.
 *
 * It asserts invariants, not copy: the copy lives in `src/content/` and is
 * allowed to change. What must hold is that each route ships its own complete
 * document with the right ordinal, heading, nav state and counter, because
 * that is what makes a section a real URL for crawlers and answer engines.
 *
 * Run after `npm run build`.
 */

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const ROUTES = [
  { file: 'index.html', path: '/', order: 0 },
  { file: 'portafolio/index.html', path: '/portafolio/', order: 1 },
  { file: 'nosotros/index.html', path: '/nosotros/', order: 2 },
  { file: 'contacto/index.html', path: '/contacto/', order: 3 },
  { file: 'exploraciones/index.html', path: '/exploraciones/', order: 4 },
];

const failures = [];
const titles = new Map();
const headings = new Map();

function extract(html, pattern, label) {
  const match = html.match(pattern);
  assert.ok(match, `missing ${label}`);
  return match[1] ?? '';
}

for (const route of ROUTES) {
  const where = `dist/${route.file}`;
  let html;
  try {
    html = await readFile(join('dist', route.file), 'utf8');
  } catch {
    failures.push(`${where}: file does not exist (did the build run?)`);
    continue;
  }

  const expect = (label, fn) => {
    try {
      fn();
    } catch (error) {
      failures.push(`${where}: ${error.message}`);
    }
  };

  expect('title', () => {
    const title = extract(html, /<title>([\s\S]*?)<\/title>/i, '<title>').trim();
    assert.ok(title.length > 0, 'title is empty');
    titles.set(route.path, title);
  });

  expect('description', () => {
    const content = extract(
      html,
      /<meta name="description" content="([^"]*)">/i,
      'description meta tag',
    );
    assert.ok(content.trim().length >= 20, `description is too short: "${content}"`);
  });

  expect('heading', () => {
    const heading = extract(
      html,
      /<h1\b[^>]*id="scene-title"[^>]*>([\s\S]*?)<\/h1>/i,
      '#scene-title',
    ).trim();
    assert.ok(heading.length > 0, 'scene heading is empty');
    headings.set(route.path, heading);
  });

  expect('scene ordinal', () => {
    assert.match(
      html,
      new RegExp(`<main id="world" data-scene="${route.order}"`),
      `expected data-scene="${route.order}"`,
    );
  });

  expect('counter', () => {
    const last = ROUTES.length - 1;
    const counter = `0${route.order} / 0${last} <span>`;
    assert.ok(html.includes(counter), `expected the counter "${counter.trim()}"`);
  });

  expect('nav links', () => {
    for (const other of ROUTES) {
      assert.ok(
        html.includes(`href="${other.path}"`),
        `missing a nav link to ${other.path}`,
      );
    }
  });

  expect('aria-current', () => {
    const current = html.match(/<a\b[^>]*aria-current="page"[^>]*>/g) ?? [];
    assert.equal(current.length, 1, `expected exactly one aria-current, found ${current.length}`);
    const href = extract(current[0], /href="([^"]*)"/, 'href on the current link');
    assert.equal(href, route.path, `aria-current is on ${href} instead of ${route.path}`);
  });

  expect('no hash navigation', () => {
    const hashes = html.match(/href="#[^"]*"/g) ?? [];
    assert.equal(hashes.length, 0, `hash links still present: ${hashes.join(', ')}`);
  });
}

function checkUnique(label, map) {
  if (map.size < 2) return;
  const values = [...map.values()];
  assert.equal(
    new Set(values).size,
    values.length,
    `${label} are not unique across routes: ${JSON.stringify([...map])}`,
  );
}

if (titles.size === ROUTES.length) {
  try {
    checkUnique('titles', titles);
  } catch (error) {
    failures.push(error.message);
  }
  try {
    checkUnique('headings', headings);
  } catch (error) {
    failures.push(error.message);
  }
}

if (failures.length > 0) {
  console.error(`check-routes: ${failures.length} failure(s)`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log(`check-routes: ${ROUTES.length} route documents OK`);
for (const [path, title] of titles) console.log(`  ${path.padEnd(18)} ${title}`);
