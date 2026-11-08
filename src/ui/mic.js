// The microphone for blowing: loudness only, nothing is recorded or kept.
// It opens only while a balloon fills and closes the moment it is full.
import { audio, setSession } from './audio.js';
import { thresholdFrom } from '../core/blow.js';

export const M = { stream: null, an: null, buf: null, ok: null, threshold: null, calib: [], calibUntil: 0 };
const CALIBRATE_MS = 500;

function notify(on) { document.body.classList.toggle('mic-on', on); }

export async function micOpen(stillWanted = () => true) {
  if (M.stream) return;
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { M.ok = false; return; }
  try {
    const ac = audio();
    setSession('play-and-record');
    const s = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
    if (!stillWanted()) { s.getTracks().forEach(t => t.stop()); setSession('playback'); return; }
    M.stream = s;
    const src = ac.createMediaStreamSource(s), silent = ac.createGain();
    silent.gain.value = 0;
    M.an = ac.createAnalyser(); M.an.fftSize = 1024;
    src.connect(M.an); M.an.connect(silent); silent.connect(ac.destination);
    M.buf = new Float32Array(M.an.fftSize);
    M.ok = true; M.threshold = null; M.calib = []; M.calibUntil = performance.now() + CALIBRATE_MS;
    notify(true);
  } catch (e) { M.ok = false; setSession('playback'); }
}

export function micClose() {
  const was = !!M.stream;
  if (M.stream) M.stream.getTracks().forEach(t => t.stop());
  M.stream = null; M.an = null;
  if (was) setSession('playback');   // back to the loud speaker
  notify(false);
}

function level() {
  M.an.getFloatTimeDomainData(M.buf);
  let s = 0;
  for (const v of M.buf) s += v * v;
  return Math.sqrt(s / M.buf.length);
}

// { rms, threshold }; threshold is null while the room's quiet is still being measured.
export function micRead(now = performance.now()) {
  if (!M.an) return { rms: 0, threshold: null };
  const rms = level();
  if (M.threshold === null) {
    M.calib.push(rms);
    if (now >= M.calibUntil) {
      const sorted = [...M.calib].sort((a, b) => a - b);
      M.threshold = thresholdFrom(sorted[Math.floor(sorted.length / 2)] || 0);
    }
    return { rms, threshold: null };
  }
  return { rms, threshold: M.threshold };
}
