// The app: home, sittings of rounds, the peek, and the parent's controls.
// The child's screen has nothing to press but the game itself; every tap goes to the game first.
// The parent moves on with a 1-second press anywhere after the word moment, or from the parent bar.
import { word } from '../core/words.js';
import { sharedKey } from '../core/lines.js';
import { localDate } from '../core/today.js';
import { sanitize, addFind, needsPictureCue } from '../core/progress.js';
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
const NEXT_HOLD_MS = 1000, GATE_HOLD_MS = 2000, CONFIRM_MS = 3000, BAR_MS = 8000;
const $ = s => document.querySelector(s);
const stage = $('#stage'), promptText = $('#promptText'), promptPic = $('#promptPic'), promptEl = $('#prompt');
const hand = $('#hand'), ring = $('#holdRing'), bar = $('#parentBar');

const today = () => localDate();
let progress = sanitize(loadProgressRaw(), today());
saveProgress(progress);
let sitting = null, current = null, token = 0, peekOn = false, guideFn = null;
const rng = Math.random;

export function getProgress() { return progress; }
export function setProgress(p) { progress = p; saveProgress(p); }

function setPrompt(t, pic = '') {
  promptText.textContent = t; promptPic.textContent = pic;
  promptEl.classList.remove('pop'); void promptEl.offsetWidth; promptEl.classList.add('pop');
}
function setHint(t) { $('#barHint').textContent = t || ''; }
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

// ----- the guiding hand: shows the child what to do now -----
function guide(fn) { guideFn = fn; }
function unguide() { guideFn = null; hand.classList.remove('on'); }
function drawHand() {
  const p = guideFn && guideFn();
  if (!p) { hand.classList.remove('on'); return; }
  hand.classList.add('on');
  hand.style.transform = `translate(${p.x - hand.offsetWidth * 0.35}px, ${p.y - hand.offsetHeight * 0.1}px)`;
}
hand.innerHTML = '<span>👆</span>';

// What every game gets. Callbacks from an old round are dropped once the round changes.
function makeCtx(wordId) {
  const mine = ++token;
  const live = () => mine === token;
  return {
    stage, rng, shuffle, burst, setHint,
    setPrompt: (t, pic) => { if (live()) setPrompt(t, pic); },
    say: (key, kind) => (live() ? say(key, kind) : Promise.resolve(0)),
    later: (fn, ms) => setTimeout(() => { if (live()) fn(); }, ms),
    guide: fn => { if (live()) guide(fn); },
    unguide: () => { if (live()) unguide(); },
    pictureCue: needsPictureCue(progress, wordId),
    sfx: {
      nope: sfx.nope, click: sfx.click, noise: () => noise(),
      squeak: lv => tone(300 + lv * 500, 0, 0.06, 'sine', 0.08),
      whoosh: () => tone(700, 0, 0.08, 'triangle', 0.2),
      pump: lv => tone(260 + lv * 400, 0, 0.12, 'triangle', 0.25),
    },
    finish(firstTry) {
      if (!live() || !sitting || sitting.done) return;
      sitting = finishRound(sitting, wordId);
      if (sitting.game === 'garden') setProgress(addFind(progress, wordId, today(), firstTry));
      paintBar();
    },
  };
}

function clearRound() {
  if (current) current.stop();
  current = null; token++;
  unguide(); stopVoice(); micClose(); cancelNextHold();
  stage.innerHTML = '';
}

function startRound(game, id, othersIds) {
  clearRound();
  const others = game === 'garden' ? (othersIds || pickOthers(progress, id, 2, { rng, exclude: EXCLUDE[game] })).map(word) : [];
  current = GAMES[game].start(makeCtx(id), word(id), others);
  current.wordId = id;
  paintBar();
}

function nextRound() {
  if (isOver(sitting)) return showPeek();
  const id = pickNext(progress, today(), { rng, previous: sitting.previous, exclude: EXCLUDE[sitting.game] });
  startRound(sitting.game, id);
}
function goNext() {
  if (peekOn) return goHome();
  if (!sitting || !canNext(sitting)) return false;   // the word moment is not over yet
  sitting = advance(sitting);
  nextRound();
  return true;
}

function showPeek() {
  const last = current && current.wordId;
  clearRound();
  peekOn = true;
  $('#peekPic').textContent = last ? word(last).emoji : '🎉';
  $('#peek').classList.add('show');
  setPrompt('برافو!'); setHint('');
  say(sharedKey('bravo'), 'cheer');
  paintBar();
}

function setMode(mode) {
  document.body.dataset.mode = mode;
  peekOn = false;
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
  paintBar();
}

// ----- every touch on the child's screen goes here first -----
let held = null;   // the parent's 1-second press to move on
function cancelNextHold() {
  if (held) { clearTimeout(held.timer); held = null; }
  ring.classList.remove('on');
}
function startNextHold(e) {
  cancelNextHold();
  ring.style.left = e.clientX + 'px'; ring.style.top = e.clientY + 'px';
  void ring.offsetWidth; ring.classList.add('on');
  held = { id: e.pointerId, x: e.clientX, y: e.clientY, timer: setTimeout(() => { cancelNextHold(); goNext(); }, NEXT_HOLD_MS) };
}
const PARENT_ZONE = '#parentBtn, #parentConfirm, #parentBar, #review, .rv-pick, #home';
document.addEventListener('pointerdown', e => {
  if (e.target.closest(PARENT_ZONE)) return;
  if (document.body.dataset.mode === 'home') return;
  e.preventDefault();
  audio();
  const used = !peekOn && current && current.tap ? current.tap(e.clientX, e.clientY, e) : false;
  if (!used && (peekOn || (sitting && canNext(sitting)))) startNextHold(e);
}, { passive: false });
document.addEventListener('pointerup', e => {
  if (held && held.id === e.pointerId) cancelNextHold();
  if (current && current.release) current.release(e);
});
document.addEventListener('pointercancel', e => { if (held && held.id === e.pointerId) cancelNextHold(); if (current && current.release) current.release(e); });
document.addEventListener('pointermove', e => {
  if (held && held.id === e.pointerId && Math.hypot(e.clientX - held.x, e.clientY - held.y) > 40) cancelNextHold();
});
// iPhone / iPad: no pinch zoom, no page scroll, no long-press menus on the child's screen
for (const ev of ['gesturestart', 'gesturechange', 'gestureend']) document.addEventListener(ev, e => e.preventDefault(), { passive: false });
document.addEventListener('touchmove', e => { if (!e.target.closest('#review, .rv-pick, #parentBar')) e.preventDefault(); }, { passive: false });
document.addEventListener('contextmenu', e => { if (!e.target.closest('#review')) e.preventDefault(); });
document.addEventListener('dblclick', e => e.preventDefault());

document.querySelectorAll('.tile').forEach(b => b.addEventListener('click', () => startSitting(b.dataset.game)));

// ----- parent controls: hold the faint corner 2 s, then confirm at the other corner -----
const parentBtn = $('#parentBtn'), confirmBtn = $('#parentConfirm');
let gateTimer = null, confirmTimer = null, barTimer = null;
const cancelGate = () => { clearTimeout(gateTimer); gateTimer = null; parentBtn.classList.remove('holding'); };
parentBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  try { parentBtn.setPointerCapture(e.pointerId); } catch (_) {}
  parentBtn.classList.add('holding');
  gateTimer = setTimeout(() => {
    cancelGate();
    confirmBtn.classList.add('on');
    clearTimeout(confirmTimer);
    confirmTimer = setTimeout(() => confirmBtn.classList.remove('on'), CONFIRM_MS);
  }, GATE_HOLD_MS);
});
for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) parentBtn.addEventListener(ev, cancelGate);
confirmBtn.addEventListener('click', () => { confirmBtn.classList.remove('on'); clearTimeout(confirmTimer); openBar(); });

function paintBar() {
  bar.querySelector('[data-bar=next]').disabled = !(peekOn || (sitting && canNext(sitting)));
  bar.querySelector('[data-bar=music]').textContent = A.musicOn ? '🎵 الموسيقى' : '🔇 الموسيقى';
}
function openBar() { bar.hidden = false; paintBar(); keepBar(); }
function closeBar() { bar.hidden = true; clearTimeout(barTimer); }
function keepBar() { clearTimeout(barTimer); barTimer = setTimeout(closeBar, BAR_MS); }
bar.addEventListener('click', e => {
  const b = e.target.closest('[data-bar]');
  if (!b) return;
  keepBar();
  const act = b.dataset.bar;
  if (act === 'next') goNext();
  if (act === 'home') { goHome(); closeBar(); }
  if (act === 'music') { setMusic(!A.musicOn); saveMusicOn(A.musicOn); if (A.musicOn) startMusic(); }
  if (act === 'review') { closeBar(); goHome(); openReview(reviewApi); }
  if (act === 'close') closeBar();
  paintBar();
});

A.musicOn = loadMusicOn();
const reviewApi = { getProgress, setProgress, today, say: (k, kind) => say(k, kind) };

// one animation loop for everything
function frame(t) {
  if (current) current.tick(t);
  drawHand();
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
  get guiding() { return !!(guideFn && guideFn()); }, get peek() { return peekOn; },   // is the hand on screen now
  audio: A, mic: M, startRound: (game, id, others) => { setMode(game); sitting = createSitting(game); startRound(game, id, others); },
  openReview: () => openReview(reviewApi), goHome, goNext,
  putClip: async (key, blob) => { await putClip(key, blob); forgetClip(key); },
};
