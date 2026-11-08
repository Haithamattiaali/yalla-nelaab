// What the child knows, as the parent marks it, and which words are being practised.
// Pure functions: every change returns a new progress object.
//
// progress = {
//   v: 1,
//   targets: [{ id, addedOn }],          // about 10 words in practice
//   learned: [{ id, learnedOn }],        // mastered; they come back now and then for review
//   paused:  [id],                       // swapped out by the parent; back in the bank
//   codes:   { id: [{ date, code }] },   // the parent's marks, at most one of each code per day
//   finds:   { id: [{ date, firstTry }] } // the garden's own record
// }
import { BANK, GROUPS, SAMPLE_IDS } from './words.js';
import { addDays } from './today.js';

export const CODES = ['👆', '🔁', '⭐', '➕', '✋'];   // understands · says after you · says alone · with another word · sign
export const TARGET_COUNT = 10;
const SAID_ALONE = new Set(['⭐', '➕']);
const ANY_SIGN_OF_LIFE = new Set(['👆', '🔁', '⭐', '➕']);

const clone = p => JSON.parse(JSON.stringify(p));
const usedIds = p => new Set([...p.targets.map(t => t.id), ...p.learned.map(l => l.id), ...p.paused]);

export function emptyProgress() {
  return { v: 1, targets: [], learned: [], paused: [], codes: {}, finds: {} };
}

// The next word to bring in: from the group with the fewest words in practice (variety),
// ties broken by the group order, then the bank order. Paused words are not picked by themselves.
export function nextNewWord(p, bank = BANK) {
  const used = usedIds(p);
  const free = bank.filter(w => !used.has(w.id));
  if (!free.length) return null;
  const count = g => p.targets.filter(t => bank.find(w => w.id === t.id)?.group === g).length;
  const groups = GROUPS.filter(g => free.some(w => w.group === g));
  groups.sort((a, b) => count(a) - count(b) || GROUPS.indexOf(a) - GROUPS.indexOf(b));
  return free.find(w => w.group === groups[0]).id;
}

export function initialProgress(today) {
  let p = emptyProgress();
  p.targets = SAMPLE_IDS.map(id => ({ id, addedOn: today }));
  while (p.targets.length < TARGET_COUNT) {
    const id = nextNewWord(p);
    if (!id) break;
    p.targets.push({ id, addedOn: today });
  }
  return p;
}

export const isTarget = (p, id) => p.targets.some(t => t.id === id);
export const isLearned = (p, id) => p.learned.some(l => l.id === id);

export function hasCode(p, id, date, code) {
  return (p.codes[id] || []).some(c => c.date === date && c.code === code);
}

export function toggleCode(p, id, date, code) {
  if (!CODES.includes(code)) throw new Error(`unknown code ${code}`);
  const q = clone(p);
  const list = q.codes[id] || [];
  const i = list.findIndex(c => c.date === date && c.code === code);
  if (i >= 0) list.splice(i, 1); else list.push({ date, code });
  q.codes[id] = list;
  return q;
}

export function addFind(p, id, date, firstTry) {
  const q = clone(p);
  (q.finds[id] = q.finds[id] || []).push({ date, firstTry: !!firstTry });
  return q;
}

// Learned: ⭐ or ➕ on 3 different days within any 7-day stretch (the paper program's rule).
export function learnedReady(p, id) {
  const days = [...new Set((p.codes[id] || []).filter(c => SAID_ALONE.has(c.code)).map(c => c.date))].sort();
  for (let i = 0; i + 2 < days.length; i++) {
    if (days[i + 2] <= addDays(days[i], 6)) return true;
  }
  return false;
}

// Stalled: in practice for 14 days or more with no 👆, 🔁, ⭐ or ➕ since it came in.
export function stalled(p, id, today) {
  const t = p.targets.find(x => x.id === id);
  if (!t || addDays(t.addedOn, 14) > today) return false;
  return !(p.codes[id] || []).some(c => c.date >= t.addedOn && ANY_SIGN_OF_LIFE.has(c.code));
}

// The parent confirms a word is mastered: it moves to learned and the next word comes in.
export function promote(p, id, today) {
  if (!isTarget(p, id)) return { progress: p, added: null };
  const q = clone(p);
  q.targets = q.targets.filter(t => t.id !== id);
  q.learned.push({ id, learnedOn: today });
  const added = nextNewWord(q);
  if (added) q.targets.push({ id: added, addedOn: today });
  return { progress: q, added };
}

// The parent swaps a word: the old one goes back to the bank (paused), the new one comes in.
export function swap(p, oldId, newId, today) {
  if (!isTarget(p, oldId) || oldId === newId || isTarget(p, newId)) return p;
  const q = clone(p);
  q.targets = q.targets.map(t => (t.id === oldId ? { id: newId, addedOn: today } : t));
  q.paused = [...q.paused.filter(x => x !== newId), oldId];
  q.learned = q.learned.filter(l => l.id !== newId);
  return q;
}

// What the parent sees per word: this week's marks and the garden's finds.
export function weekSummary(p, id, today) {
  const from = addDays(today, -6);
  const codes = (p.codes[id] || []).filter(c => c.date >= from && c.date <= today);
  const finds = (p.finds[id] || []).filter(f => f.date >= from && f.date <= today);
  const count = {};
  for (const c of codes) count[c.code] = (count[c.code] || 0) + 1;
  return { codes: count, rounds: finds.length, firstTry: finds.filter(f => f.firstTry).length };
}

// A stored progress object from an older or broken save is rebuilt, never trusted blindly.
export function sanitize(raw, today) {
  if (!raw || raw.v !== 1 || !Array.isArray(raw.targets) || !raw.targets.length) return initialProgress(today);
  const known = new Set(BANK.map(w => w.id));
  const p = emptyProgress();
  p.targets = raw.targets.filter(t => known.has(t?.id)).map(t => ({ id: t.id, addedOn: t.addedOn || today }));
  p.learned = (raw.learned || []).filter(l => known.has(l?.id)).map(l => ({ id: l.id, learnedOn: l.learnedOn || today }));
  p.paused = (raw.paused || []).filter(id => known.has(id));
  for (const [id, list] of Object.entries(raw.codes || {})) if (known.has(id) && Array.isArray(list)) p.codes[id] = list.filter(c => CODES.includes(c?.code) && /^\d{4}-\d{2}-\d{2}$/.test(c?.date));
  for (const [id, list] of Object.entries(raw.finds || {})) if (known.has(id) && Array.isArray(list)) p.finds[id] = list.filter(f => /^\d{4}-\d{2}-\d{2}$/.test(f?.date)).map(f => ({ date: f.date, firstTry: !!f.firstTry }));
  if (!p.targets.length) return initialProgress(today);
  return p;
}
