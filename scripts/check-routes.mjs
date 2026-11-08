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
  { file: 'index.html', path: '/', order: 0, type: 'WebPage' },
  { file: 'portafolio/index.html', path: '/portafolio/', order: 1, type: 'CollectionPage' },
  { file: 'nosotros/index.html', path: '/nosotros/', order: 2, type: 'AboutPage' },
  { file: 'contacto/index.html', path: '/contacto/', order: 3, type: 'ContactPage' },
  { file: 'exploraciones/index.html', path: '/exploraciones/', order: 4, type: 'CollectionPage' },
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

  expect('JSON-LD graph', () => {
    const scripts = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g) ?? [];
    assert.equal(scripts.length, 1, `${where}: expected exactly one JSON-LD script`);
    const data = JSON.parse(scripts[0].replace(/^<script[^>]*>|<\/script>$/g, ''));
    const graph = data['@graph'];
    assert.ok(graph.some((node) => node['@type'] === 'Organization'), `${where}: missing Organization`);
    assert.ok(graph.some((node) => node['@type'] === 'WebSite'), `${where}: missing WebSite`);
    assert.ok(graph.some((node) => node['@type'] === route.type), `${where}: expected page type ${route.type}`);
    const canonical = extract(html, /rel="canonical" href="([^"]+)"/i, 'canonical');
    const origin = new URL(canonical).origin;
    for (const node of graph) {
      if (typeof node['@id'] === 'string') assert.equal(new URL(node['@id']).origin, origin, `${where}: @id must use canonical origin`);
      for (const item of node.itemListElement ?? []) assert.equal(new URL(item.item).origin, origin, `${where}: breadcrumb item must use canonical origin`);
    }
    const breadcrumb = graph.find((node) => node['@type'] === 'BreadcrumbList');
    if (route.order === 0) assert.equal(breadcrumb, undefined, `${where}: home breadcrumb must be absent`);
    else assert.deepEqual(breadcrumb.itemListElement.map((item) => item.position), [1, 2], `${where}: breadcrumb positions must be 1 and 2`);
  });

  expect('prerendered reveal body', () => {
    const body = extract(html, /<div id="reveal-body">([\s\S]*?)<\/div>/i, '#reveal-body');
    assert.match(body, /<h2 id="reveal-title">/i, `${where}: missing semantic reveal heading`);
    if (route.path === '/nosotros/') assert.ok((body.match(/<p>/g) ?? []).length > 0, `${where}: expected paragraph in #reveal-body`);
  });

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

  for (const [label, pattern] of [
    ['og:title', /<meta property="og:title" content="([^"]*)">/i],
    ['og:description', /<meta property="og:description" content="([^"]*)">/i],
    ['og:type', /<meta property="og:type" content="([^"]*)">/i],
    ['og:site_name', /<meta property="og:site_name" content="([^"]*)">/i],
    ['twitter:card', /<meta name="twitter:card" content="([^"]*)">/i],
    ['twitter:title', /<meta name="twitter:title" content="([^"]*)">/i],
  ]) {
    expect(label, () => {
      const value = extract(html, pattern, label).trim();
      assert.ok(value.length > 0, `${label} is empty`);
      if (label === 'og:title') {
        const title = extract(html, /<title>([\s\S]*?)<\/title>/i, '<title>').trim();
        assert.equal(value, title, 'og:title does not equal <title>');
      }
    });
  }

  expect('canonical', () => {
    const href = extract(html, /rel="canonical" href="([^"]+)"/i, 'rel="canonical"');
    assert.match(href, /^https?:\/\//, `canonical is not absolute: ${href}`);
    assert.ok(href.endsWith(route.path), `canonical ${href} does not end with ${route.path}`);
    const ogUrl = extract(html, /property="og:url" content="([^"]+)"/i, 'og:url');
    assert.equal(ogUrl, href, 'og:url does not equal the canonical URL');
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

try {
  const llms = await readFile(join('dist', 'llms.txt'), 'utf8');
  assert.ok(llms.startsWith('# '), 'dist/llms.txt: expected # heading');
  const lines = llms.split('\n').filter((line) => line.startsWith('- ['));
  assert.equal(lines.length, ROUTES.length, `dist/llms.txt: expected one line per route`);
  for (const line of lines) {
    const match = line.match(/\]\((https?:\/\/[^)\s]+)\)/);
    assert.ok(match, `dist/llms.txt: line has no absolute URL: ${line}`);
  }
} catch (error) { failures.push(`dist/llms.txt: ${error.message}`); }

const robotsPath = join('dist', 'robots.txt');
try {
  const robots = await readFile(robotsPath, 'utf8');
  assert.ok(robots.startsWith('User-agent: *'), 'expected robots.txt to start with User-agent: *');
  assert.match(
    robots,
    /^Sitemap: https?:\/\/\S+$/m,
    'expected an absolute Sitemap: line in robots.txt',
  );
} catch (error) {
  failures.push(`dist/robots.txt: expected file with User-agent: * (${error.message})`);
}

try {
  const sitemap = await readFile(join('dist', 'sitemap.xml'), 'utf8');
  const locs = sitemap.match(/<loc>[^<]+<\/loc>/g) ?? [];
  assert.equal(
    locs.length,
    ROUTES.length,
    `expected ${ROUTES.length} <loc> entries in the sitemap, found ${locs.length}`,
  );
  for (const loc of locs) {
    assert.match(loc, /^<loc>https?:\/\/[^<]+<\/loc>$/, `not an absolute loc: ${loc}`);
  }
} catch (error) {
  failures.push(`dist/sitemap.xml: ${error.message}`);
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
