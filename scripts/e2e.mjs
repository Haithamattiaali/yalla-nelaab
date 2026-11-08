// Runs tests/e2e.html in headless Chrome, in real time, and prints its results.
// No dependencies: a tiny static server, Chrome's own debugging port, Node's built-in WebSocket.
// The PARENT folder is served, so the game runs under a subpath, as it does on GitHub Pages.
import { spawn } from 'node:child_process';
import { mkdtempSync, existsSync, readFileSync, createReadStream, statSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, basename, extname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import http from 'node:http';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const PARENT = dirname(ROOT), SUB = basename(ROOT);
const TIMEOUT = Number(process.env.E2E_TIMEOUT || 180000);
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.svg': 'image/svg+xml', '.wav': 'audio/wav' };

const server = http.createServer((req, res) => {
  const path = normalize(join(PARENT, decodeURIComponent(new URL(req.url, 'http://x').pathname)));
  if (!path.startsWith(PARENT)) { res.writeHead(403); return res.end(); }
  let file = path;
  try { if (statSync(file).isDirectory()) file = join(file, 'index.html'); statSync(file); } catch { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  createReadStream(file).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const url = `http://127.0.0.1:${server.address().port}/${encodeURIComponent(SUB)}/tests/e2e.html`;

const candidates = [process.env.CHROME, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser'];
const chrome = candidates.find(c => c && existsSync(c));
if (!chrome) { console.error('e2e: Chrome not found (set CHROME=/path/to/chrome)'); process.exit(2); }
const profile = mkdtempSync(join(tmpdir(), 'yalla-e2e-'));
const proc = spawn(chrome, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--no-sandbox',
  `--user-data-dir=${profile}`, '--autoplay-policy=no-user-gesture-required', '--remote-debugging-port=0', '--window-size=1400,1000', 'about:blank'],
  { stdio: 'ignore' });

const sleep = ms => new Promise(r => setTimeout(r, ms));
function finish(code) { try { proc.kill(); } catch {} server.close(); try { rmSync(profile, { recursive: true, force: true }); } catch {} process.exit(code); }

let port = null;
for (let i = 0; i < 100 && !port; i++) {
  await sleep(100);
  const f = join(profile, 'DevToolsActivePort');
  if (existsSync(f)) port = readFileSync(f, 'utf8').split('\n')[0].trim();
}
if (!port) { console.error('e2e: Chrome did not start'); finish(2); }
const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
const ws = new WebSocket(targets.find(t => t.type === 'page').webSocketDebuggerUrl);
await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
let id = 0;
const pending = new Map();
ws.onmessage = m => { const msg = JSON.parse(m.data); if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg.result); pending.delete(msg.id); } };
const send = (method, params = {}) => new Promise(r => { const n = ++id; pending.set(n, r); ws.send(JSON.stringify({ id: n, method, params })); });

await send('Page.navigate', { url });
const t0 = Date.now();
let state = 'pending', text = '';
while (Date.now() - t0 < TIMEOUT) {
  await sleep(500);
  const r = await send('Runtime.evaluate', { expression: `(() => { const e = document.getElementById('results'); return e ? e.dataset.pass + '\\u0001' + e.textContent : 'pending\\u0001'; })()`, returnByValue: true });
  [state, text] = String(r?.result?.value ?? 'pending\u0001').split('\u0001');
  if (state !== 'pending') break;
}
console.log(text || '(no results)');
console.log(`e2e: ${state === 'pending' ? 'timed out' : state} (${Math.round((Date.now() - t0) / 1000)} s)`);
finish(state === 'yes' ? 0 : 1);
