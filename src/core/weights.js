// How often each word shows up. Words he understands but does not say yet come most;
// words he says come less; mastered words come back now and then for review.
import { BANK } from './words.js';
import { addDays } from './today.js';

export const W = { fresh: 3, understands: 4, says: 2, learned: 0.5, missStep: 1, missMax: 3, hitStep: 0.5, floor: 1 };
const SAYS = new Set(['🔁', '⭐', '➕']);
const UNDERSTANDS = new Set(['👆', '✋']);

export function weightOf(p, id, today) {
  if (p.learned.some(l => l.id === id)) return W.learned;
  if (!p.targets.some(t => t.id === id)) return 0;
  const from = addDays(today, -6);
  const recent = (p.codes[id] || []).filter(c => c.date >= from && c.date <= today).map(c => c.code);
  let w = recent.some(c => SAYS.has(c)) ? W.says : recent.some(c => UNDERSTANDS.has(c)) ? W.understands : W.fresh;
  const finds = (p.finds[id] || []).filter(f => f.date >= from && f.date <= today);
  const misses = finds.filter(f => !f.firstTry).length;
  const hits = finds.length - misses;
  w += Math.min(W.missMax, misses * W.missStep) - hits * W.hitStep;
  return Math.max(W.floor, w);
}

// One word, by weight. Never the same word twice in a row; a game may leave some words out.
export function pickNext(p, today, { rng = Math.random, previous = null, exclude = [] } = {}) {
  const skip = new Set([previous, ...exclude]);
  let pool = [...p.targets.map(t => t.id), ...p.learned.map(l => l.id)].filter(id => !skip.has(id));
  if (!pool.length) pool = BANK.map(w => w.id).filter(id => !skip.has(id));
  const weights = pool.map(id => weightOf(p, id, today) || W.floor);
  let r = rng() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < pool.length; i++) {
    r -= weights[i];
    if (r < 0) return pool[i];
  }
  return pool[pool.length - 1];
}

// The other things on screen with the word: from his own words first (more review), then the bank.
export function pickOthers(p, targetId, n, { rng = Math.random, exclude = [] } = {}) {
  const skip = new Set([targetId, ...exclude]);
  const own = [...p.targets.map(t => t.id), ...p.learned.map(l => l.id)].filter(id => !skip.has(id));
  const rest = BANK.map(w => w.id).filter(id => !skip.has(id) && !own.includes(id));
  const shuffled = a => a.map(x => [rng(), x]).sort((x, y) => x[0] - y[0]).map(x => x[1]);
  return [...shuffled(own), ...shuffled(rest)].slice(0, n);
}
