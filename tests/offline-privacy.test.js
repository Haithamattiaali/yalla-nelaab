import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const root = fileURLToPath(new URL('..', import.meta.url));
const walk = dir => readdirSync(join(root, dir), { withFileTypes: true }).flatMap(d => d.isDirectory() ? walk(join(dir, d.name)) : [join(dir, d.name)]);

test('the offline copy holds every file the game needs, and only files that exist', () => {
  const sw = readFileSync(join(root, 'sw.js'), 'utf8');
  const files = JSON.parse(sw.match(/const FILES = (\[[\s\S]*?\]);/)[1].replace(/'/g, '"').replace(/,\s*\]/, ']'));
  const needed = ['index.html', 'manifest.webmanifest', ...walk('src'), ...walk('icons')];
  for (const f of needed) assert.ok(files.includes(f), `missing from sw.js: ${f}`);
  for (const f of files) if (f !== './') assert.ok(existsSync(join(root, f)), `sw.js lists a missing file: ${f}`);
});
test('nothing in the game sends data anywhere', () => {
  for (const f of walk('src')) {
    const s = readFileSync(join(root, f), 'utf8');
    for (const bad of ['fetch(', 'XMLHttpRequest', 'sendBeacon', 'WebSocket', 'EventSource', 'http://', 'https://']) {
      assert.ok(!s.includes(bad), `${f} contains ${bad}`);
    }
  }
});
test('all links are relative, so the game works under /yalla-nelaab/', () => {
  const html = readFileSync(join(root, 'index.html'), 'utf8');
  for (const m of html.matchAll(/(?:href|src)="([^"]+)"/g)) assert.ok(!m[1].startsWith('/') && !/^https?:/.test(m[1]), m[1]);
  const man = JSON.parse(readFileSync(join(root, 'manifest.webmanifest'), 'utf8'));
  assert.equal(man.start_url, './'); assert.equal(man.scope, './');
  for (const i of man.icons) assert.ok(!i.src.startsWith('/'));
});
// The child's name is checked by its fingerprint, so the name itself never appears in this public repo.
const NAME_HASHES = new Set(['3deacfb98adc4479cc986da4705e6cfd393eea68e8f223ff70d8f6fb2f201315', '2063d112e46b326178d70cf7aba81fad42a8bcd8e096d765cb6af02809dde325']);
const sha = t => createHash('sha256').update(t).digest('hex');
test('no child name in the published files', () => {
  const files = ['index.html', 'README.md', 'sw.js', 'manifest.webmanifest', ...walk('src'), ...walk('tests'), ...walk('scripts')];
  for (const f of files) {
    const words = readFileSync(join(root, f), 'utf8').toLowerCase().split(/[^\p{L}]+/u);
    for (const w of words) assert.ok(!NAME_HASHES.has(sha(w)), f);
  }
});
