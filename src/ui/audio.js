// Sound: the parent's voice clips, short effects, and an original little tune.
// The tune goes quiet under every spoken line, then comes back.
import { getClip } from './store.js';

export const A = { ac: null, master: null, music: null, sfx: null, voice: null, musicOn: true, base: 0.22, buffers: new Map(), current: null, last: null };

export function audio() {
  if (!A.ac) {
    const C = window.AudioContext || window.webkitAudioContext;
    A.ac = new C();
    A.master = A.ac.createGain(); A.master.connect(A.ac.destination);
    A.music = A.ac.createGain(); A.music.gain.value = 0; A.music.connect(A.master);
    A.sfx = A.ac.createGain(); A.sfx.gain.value = 0.9; A.sfx.connect(A.master);
    A.voice = A.ac.createGain(); A.voice.gain.value = 1.4; A.voice.connect(A.master);
  }
  if (A.ac.state === 'suspended') A.ac.resume();
  return A.ac;
}

export function tone(f, start, dur, type = 'sine', vol = 0.18, dest) {
  const ac = audio(), o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.frequency.value = f; o.connect(g); g.connect(dest || A.sfx);
  const t = ac.currentTime + Math.max(0, start);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.015); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.start(t); o.stop(t + dur + 0.05);
}
export function noise(dur = 0.22, vol = 0.5) {   // a soft pop
  const ac = audio(), n = Math.floor(ac.sampleRate * dur), buf = ac.createBuffer(1, n, ac.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3);
  const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
  s.buffer = buf; f.type = 'lowpass'; f.frequency.value = 2200; g.gain.value = vol;
  s.connect(f); f.connect(g); g.connect(A.sfx); s.start();
}
export const sfx = {
  prompt: () => { tone(660, 0, 0.18); tone(880, 0.18, 0.25); },
  cheer: (at = 0) => [523, 659, 784, 1047].forEach((f, i) => tone(f, at + i * 0.09, 0.25, 'triangle')),
  nope: () => tone(220, 0, 0.25, 'sine', 0.12),
  click: () => tone(1250, 0, 0.09, 'square', 0.05),
  ready: () => tone(990, 0, 0.12),
};

// ----- music -----
let duckTimer = null;
const musicLevel = () => (A.musicOn ? A.base : 0);
export function duck(ms) {
  if (!A.ac) return;
  const t = A.ac.currentTime;
  A.music.gain.cancelScheduledValues(t);
  A.music.gain.setTargetAtTime(A.musicOn ? A.base * 0.1 : 0, t, 0.04);
  clearTimeout(duckTimer);
  duckTimer = setTimeout(() => { duckTimer = null; A.music.gain.setTargetAtTime(musicLevel(), A.ac.currentTime, 0.4); }, ms);
}
const MEL = [64, 67, 69, 67, 64, 62, 60, 62, 64, 64, 67, 69, 67, 64, 62, 0, 60, 62, 64, 67, 69, 67, 64, 62, 60, 62, 64, 62, 60, 0, 0, 0];
const BASS = [48, 0, 0, 0, 55, 0, 0, 0, 53, 0, 0, 0, 55, 0, 0, 0, 48, 0, 0, 0, 53, 0, 0, 0, 55, 0, 0, 0, 48, 0, 0, 0];
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
let sched = null, step = 0, nextT = 0;
export function startMusic() {
  audio();
  if (!sched) {
    nextT = A.ac.currentTime + 0.1;
    sched = setInterval(() => {
      const spb = 60 / 108 / 2;
      if (nextT < A.ac.currentTime) nextT = A.ac.currentTime + 0.05;   // after a pause, do not rush to catch up
      while (nextT < A.ac.currentTime + 0.25) {
        const m = MEL[step % 32], b = BASS[step % 32], at = nextT - A.ac.currentTime;
        if (m) tone(mtof(m + 12), at, 0.26, 'triangle', 0.32, A.music);
        if (b) tone(mtof(b), at, 0.5, 'sine', 0.45, A.music);
        nextT += spb; step++;
      }
    }, 60);
  }
  if (!duckTimer) A.music.gain.setTargetAtTime(musicLevel(), A.ac.currentTime, 0.5);
}
export function setMusic(on) {
  A.musicOn = on;
  if (A.ac) A.music.gain.setTargetAtTime(musicLevel(), A.ac.currentTime, 0.1);
}

// ----- the parent's voice -----
// kind: 'prompt' or 'cheer' picks the stand-in sound when no clip was recorded yet.
export function forgetClip(key) { A.buffers.delete(key); }
async function bufferFor(key) {
  if (A.buffers.has(key)) return A.buffers.get(key);
  let buf = null;
  const blob = await getClip(key);
  if (blob) {
    try {
      const data = await blob.arrayBuffer();
      buf = await new Promise((res, rej) => { const p = A.ac.decodeAudioData(data, res, rej); if (p && p.then) p.then(res, rej); });
    } catch (e) { buf = null; }
  }
  A.buffers.set(key, buf);
  return buf;
}
export function stopVoice() {
  if (A.current) { try { A.current.stop(); } catch (e) {} A.current = null; }
}
// Plays the line; resolves with how long it lasts (ms).
export async function say(key, kind = 'prompt') {
  audio();
  const buf = await bufferFor(key);
  stopVoice();
  if (buf) {
    const s = A.ac.createBufferSource(); s.buffer = buf; s.connect(A.voice); s.start();
    A.current = s;
    const ms = Math.round(buf.duration * 1000);
    duck(ms + 400);
    A.last = { key, source: 'clip', ms };
    if (kind === 'cheer') sfx.cheer(buf.duration + 0.1);   // effects after the word, never over it
    return ms;
  }
  duck(1500);
  (kind === 'cheer' ? sfx.cheer : sfx.prompt)();
  A.last = { key, source: 'fallback', ms: 0 };
  return 0;
}
