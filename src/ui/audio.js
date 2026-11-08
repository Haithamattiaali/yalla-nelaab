// Sound: the parent's voice clips, short effects, and an original little tune.
// The tune goes quiet under every spoken line, then comes back.
import { getClip } from './store.js';

export const A = { ac: null, master: null, comp: null, music: null, sfx: null, voice: null, musicOn: true, base: 0.16, buffers: new Map(), current: null, last: null };

// iPhone / iPad: by default web sound follows the silent switch, and once the microphone has been
// used the sound goes to the small ear speaker. "playback" sends it to the loud speaker again.
export function setSession(type) {
  try { if (navigator.audioSession) navigator.audioSession.type = type; } catch (e) {}
}
let unlocked = false;
function unlockOlderIOS() {   // older iOS has no audioSession: playing a silent <audio> once does the same
  if (unlocked || navigator.audioSession) return;
  unlocked = true;
  try {
    const el = document.createElement('audio');
    el.setAttribute('playsinline', '');
    el.src = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA=';
    el.play().catch(() => {});
  } catch (e) {}
}

export function audio() {
  if (!A.ac) {
    const C = window.AudioContext || window.webkitAudioContext;
    setSession('playback');
    A.ac = new C();
    // everything goes through a compressor, so lines can be loud without crackling
    A.comp = A.ac.createDynamicsCompressor();
    A.comp.threshold.value = -20; A.comp.knee.value = 12; A.comp.ratio.value = 4; A.comp.attack.value = 0.003; A.comp.release.value = 0.25;
    A.comp.connect(A.ac.destination);
    A.master = A.ac.createGain(); A.master.gain.value = 1.3; A.master.connect(A.comp);
    A.music = A.ac.createGain(); A.music.gain.value = 0; A.music.connect(A.master);
    A.sfx = A.ac.createGain(); A.sfx.gain.value = 1; A.sfx.connect(A.master);
    A.voice = A.ac.createGain(); A.voice.gain.value = 1.6; A.voice.connect(A.master);
  }
  unlockOlderIOS();
  if (A.ac.state === 'suspended' || A.ac.state === 'interrupted') A.ac.resume();
  return A.ac;
}

export function tone(f, start, dur, type = 'sine', vol = 0.35, dest) {
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
  cheer: (at = 0) => [523, 659, 784, 1047].forEach((f, i) => tone(f, at + i * 0.09, 0.25, 'triangle', 0.4)),
  nope: () => tone(220, 0, 0.25, 'sine', 0.25),
  click: () => tone(1250, 0, 0.09, 'square', 0.1),
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

// A phone recording is often quiet and starts or ends with silence: trim the silence
// (keeping a short margin) and bring the loudest point up to 0.95.
export function tidyClip(ac, buf) {
  const ch = [...Array(buf.numberOfChannels)].map((_, i) => buf.getChannelData(i));
  let peak = 0;
  for (const d of ch) for (let i = 0; i < d.length; i++) { const v = Math.abs(d[i]); if (v > peak) peak = v; }
  if (peak < 0.005) return buf;   // silence: leave it alone
  const gate = peak * 0.04, margin = Math.floor(buf.sampleRate * 0.06);
  const loud = i => ch.some(d => Math.abs(d[i]) > gate);
  let a = 0, b = buf.length - 1;
  while (a < b && !loud(a)) a++;
  while (b > a && !loud(b)) b--;
  a = Math.max(0, a - margin); b = Math.min(buf.length - 1, b + margin);
  const out = ac.createBuffer(buf.numberOfChannels, b - a + 1, buf.sampleRate), k = 0.95 / peak;
  ch.forEach((d, c) => { const o = out.getChannelData(c); for (let i = a; i <= b; i++) o[i - a] = d[i] * k; });
  return out;
}

async function bufferFor(key) {
  if (A.buffers.has(key)) return A.buffers.get(key);
  let buf = null;
  const blob = await getClip(key);
  if (blob) {
    try {
      const data = await blob.arrayBuffer();
      buf = await new Promise((res, rej) => { const p = A.ac.decodeAudioData(data, res, rej); if (p && p.then) p.then(res, rej); });
      buf = tidyClip(A.ac, buf);
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
