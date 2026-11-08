// Everything stays on this device: progress in localStorage, the parent's voice clips in IndexedDB.
// Every read and write survives a private window or blocked storage (it just does not persist).
const KEY = 'yalla.progress.v1';
const MUSIC = 'yalla.music';

export function loadProgressRaw() {
  try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { return null; }
}
export function saveProgress(p) {
  try { localStorage.setItem(KEY, JSON.stringify(p)); return true; } catch (e) { return false; }
}
export function loadMusicOn() {
  try { return localStorage.getItem(MUSIC) !== '0'; } catch (e) { return true; }
}
export function saveMusicOn(on) {
  try { localStorage.setItem(MUSIC, on ? '1' : '0'); } catch (e) {}
}
// Ask the browser to keep this site's data (recordings) instead of clearing it under pressure.
export function askToKeep() {
  try { navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch (e) {}
}

const mem = new Map();
let dbp = null;
function db() {
  if (dbp) return dbp;
  dbp = new Promise(resolve => {
    try {
      const r = indexedDB.open('yalla', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('clips');
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => resolve(null);
    } catch (e) { resolve(null); }
  });
  return dbp;
}
function run(mode, fn) {
  return db().then(d => new Promise(resolve => {
    if (!d) return resolve(undefined);
    try {
      const tx = d.transaction('clips', mode), req = fn(tx.objectStore('clips'));
      tx.oncomplete = () => resolve(req ? req.result : true);
      tx.onerror = tx.onabort = () => resolve(undefined);
    } catch (e) { resolve(undefined); }
  }));
}
export async function putClip(key, blob) { mem.set(key, blob); return (await run('readwrite', s => { s.put(blob, key); })) === true; }
export async function getClip(key) {
  if (mem.has(key)) return mem.get(key);
  const v = await run('readonly', s => s.get(key));
  if (v) mem.set(key, v);
  return v || null;
}
export async function deleteClip(key) { mem.delete(key); await run('readwrite', s => { s.delete(key); }); }
export async function clipKeys() {
  const v = await run('readonly', s => s.getAllKeys());
  return [...new Set([...(v || []), ...mem.keys()])];
}
