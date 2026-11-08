import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve('dist');
const documents = [
  ['dist/midi-links/index.html', 'midi-links/index.html'],
  ['dist/midi-links/add/index.html', 'midi-links/add/index.html'],
];

async function fail(file, message) {
  console.error(`${file}: ${message}`);
  process.exitCode = 1;
}

const content = new Map();
for (const [display, relative] of documents) {
  try {
    content.set(relative, await readFile(path.join(root, relative), 'utf8'));
  } catch {
    await fail(display, 'built document is missing');
  }
}
for (const [display, relative] of documents) {
  const html = content.get(relative);
  if (html && !html.includes('noindex, nofollow')) await fail(display, 'missing noindex, nofollow');
}
const add = content.get('midi-links/add/index.html');
if (add && !add.includes('Esta página no guarda nada.')) await fail(documents[1][0], 'missing the explicit no-save sentence');
for (const relative of ['sitemap.xml', 'llms.txt']) {
  const file = `dist/${relative}`;
  try {
    const text = await readFile(path.join(root, relative), 'utf8');
    if (text.includes('/midi-links')) await fail(file, 'contains a hidden MIDI links path');
  } catch {
    await fail(file, 'required site index is missing');
  }
}
async function scan(dir) {
  let entries;
  try { entries = await readdir(dir, { withFileTypes: true }); } catch { return; }
  for (const entry of entries) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) await scan(file);
    else if (entry.name.endsWith('.html') && !documents.some(([, rel]) => path.resolve(root, rel) === file)) {
      const html = await readFile(file, 'utf8');
      if (/<nav\b[^>]*>[\s\S]*?\/midi-links(?:\/|\b)/i.test(html)) await fail(path.relative(process.cwd(), file), 'nav contains a hidden MIDI links path');
    }
  }
}
await scan(root);
if (!process.exitCode) console.log('check-links: all assertions passed');
