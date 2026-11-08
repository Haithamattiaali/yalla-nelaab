// The app: home, sittings of rounds, the parent's Next, the peek, the parent gate.
import { word } from '../core/words.js';
import { sharedKey } from '../core/lines.js';
import { localDate } from '../core/today.js';
import { sanitize, addFind } from '../core/progress.js';
import { pickNext, pickOthers } from '../core/weights.js';
import { createSitting, canNext, finishRound, advance, isOver } from '../core/sitting.js';
import { loadProgressRaw, saveProgress, loadMusicOn, saveMusicOn, askToKeep, putClip } from './store.js';
import { A, audio, tone, noise, sfx, startMusic, setMusic, say, stopVoice, forgetClip } from './audio.js';
import { M, micClose } from './mic.js';
import * as garden from './garden.js';
import * as balloons from './balloons.js';
import * as picture from './picture.js';
import { openReview } from './review.js';

const GAMES = { garden, balloons, picture };
const EXCLUDE = { garden: [], balloons: ['balloon'], picture: [] };   // no balloon inside a balloon
const $ = s => document.querySelector(s);
const stage = $('#stage'), promptEl = $('#prompt'), hintEl = $('#hint'), nextBtn = $('#next');

const today = () => localDate();
let progress = sanitize(loadProgressRaw(), today());
saveProgress(progress);
let sitting = null, current = null, token = 0;
const rng = Math.random;

export function getProgress() { return progress; }
export function setProgress(p) { progress = p; saveProgress(p); }

function setPrompt(t) { promptEl.textContent = t; promptEl.classList.remove('pop'); void promptEl.offsetWidth; promptEl.classList.add('pop'); }
function setHint(t) { hintEl.textContent = t || ''; hintEl.style.display = t ? 'block' : 'none'; }
const shuffle = a => a.map(x => [rng(), x]).sort((p, q) => p[0] - q[0]).map(x => x[1]);

function burst(el) {
  const r = el.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  for (let i = 0; i < 14; i++) {
    const s = document.createElement('div'); s.className = 'spark'; s.textContent = ['⭐', '✨', '💛', '🎈'][i % 4];
    const ang = (i / 14) * Math.PI * 2, d = 18 + rng() * 10;
    s.style.left = cx + 'px'; s.style.top = cy + 'px';
    s.style.setProperty('--dx', Math.cos(ang) * d + 'vmin'); s.style.setProperty('--dy', Math.sin(ang) * d + 'vmin');
    stage.appendChild(s); setTimeout(() => s.remove(), 950);
  }
}

// What every game gets. Callbacks from an old round are dropped once the round changes.
function makeCtx(wordId) {
  const mine = ++token;
  return {
    stage, rng, shuffle, burst, setHint,
    setPrompt: t => { if (mine === token) setPrompt(t); },
    say: (key, kind) => (mine === token ? say(key, kind) : Promise.resolve(0)),
    later: (fn, ms) => setTimeout(() => { if (mine === token) fn(); }, ms),
    sfx: {
      nope: sfx.nope, click: sfx.click, noise: () => noise(),
      squeak: lv => tone(300 + lv * 500, 0, 0.06, 'sine', 0.04),
      whoosh: () => tone(700, 0, 0.08, 'triangle', 0.12),
    },
    finish(firstTry) {
      if (mine !== token || !sitting || sitting.done) return;
      sitting = finishRound(sitting, wordId);
      if (sitting.game === 'garden') setProgress(addFind(progress, wordId, today(), firstTry));
      nextBtn.classList.remove('wait');
    },
  };
}

function clearRound() {
  if (current) current.stop();
  current = null; token++;
  stopVoice(); micClose();
  stage.innerHTML = '';
}

function startRound(game, id, othersIds) {
  clearRound();
  const others = game === 'garden' ? (othersIds || pickOthers(progress, id, 2, { rng, exclude: EXCLUDE[game] })).map(word) : [];
  nextBtn.classList.add('wait');
  current = GAMES[game].start(makeCtx(id), word(id), others);
  current.wordId = id;
}

function nextRound() {
  if (isOver(sitting)) return showPeek();
  const id = pickNext(progress, today(), { rng, previous: sitting.previous, exclude: EXCLUDE[sitting.game] });
  startRound(sitting.game, id);
}

function showPeek() {
  const last = current && current.wordId;
  clearRound();
  $('#peekPic').textContent = last ? word(last).emoji : '🎉';
  $('#peek').classList.add('show');
  setPrompt('برافو!'); setHint('');
  say(sharedKey('bravo'), 'cheer');
}

function setMode(mode) {
  document.body.dataset.mode = mode;
  $('#peek').classList.remove('show');
}

function startSitting(game) {
  audio(); startMusic(); askToKeep();
  setMode(game);
  sitting = createSitting(game);
  nextRound();
}

function goHome() {
  clearRound();
  sitting = null;
  setMode('home');
  setHint('');
}

// ----- wiring -----
document.querySelectorAll('.tile').forEach(b => b.addEventListener('click', () => startSitting(b.dataset.game)));
nextBtn.addEventListener('click', () => {
  if (!sitting || !canNext(sitting)) return;   // the word moment is not over yet
  sitting = advance(sitting);
  nextRound();
});
$('#homeBtn').addEventListener('click', goHome);
$('#peekHome').addEventListener('click', goHome);

A.musicOn = loadMusicOn();
const paintMusic = () => { $('#musicBtn').textContent = A.musicOn ? '🎵' : '🔇'; };
paintMusic();
$('#musicBtn').addEventListener('click', () => {
  setMusic(!A.musicOn); saveMusicOn(A.musicOn); paintMusic();
  if (A.musicOn) startMusic();
});

// Parent gate: press and hold for 2 seconds; a short tap does nothing.
const parentBtn = $('#parentBtn');
let holdTimer = null;
const cancelHold = () => { clearTimeout(holdTimer); holdTimer = null; parentBtn.classList.remove('holding'); };
parentBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  try { parentBtn.setPointerCapture(e.pointerId); } catch (_) {}
  parentBtn.classList.add('holding');
  holdTimer = setTimeout(() => { cancelHold(); goHome(); openReview(reviewApi); }, 2000);
});
for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) parentBtn.addEventListener(ev, cancelHold);
parentBtn.addEventListener('contextmenu', e => e.preventDefault());

const reviewApi = { getProgress, setProgress, today, say: (k, kind) => say(k, kind) };

// one animation loop for everything
const cloud = $('#cloud');
function frame(t) {
  cloud.style.transform = `translateX(${-((t * 0.02) % (innerWidth * 1.2)) + innerWidth * 0.9}px)`;
  if (current) current.tick(t);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// offline and Home Screen
if ('serviceWorker' in navigator && !/[?&]nosw\b/.test(location.search)) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}

// hooks for the browser tests (read-only views plus a way to start a known round)
window.__yalla = {
  get progress() { return progress; }, setProgress, get sitting() { return sitting; }, get current() { return current; },
  audio: A, mic: M, startRound: (game, id, others) => { setMode(game); sitting = createSitting(game); startRound(game, id, others); },
  openReview: () => openReview(reviewApi), goHome,
  putClip: async (key, blob) => { await putClip(key, blob); forgetClip(key); },
};
