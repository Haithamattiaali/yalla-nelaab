import { test } from 'node:test';
import assert from 'node:assert/strict';
import { weightOf, pickNext, pickOthers, W } from '../src/core/weights.js';
import { initialProgress, toggleCode, addFind, promote } from '../src/core/progress.js';

const T = '2026-11-08';
function seeded(seed = 1) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }

test('weights follow what the parent marked this week', () => {
  let p = initialProgress(T);
  assert.equal(weightOf(p, 'banana', T), W.fresh);
  p = toggleCode(p, 'banana', T, '👆');
  assert.equal(weightOf(p, 'banana', T), W.understands);
  p = toggleCode(p, 'banana', T, '⭐');
  assert.equal(weightOf(p, 'banana', T), W.says);
  assert.equal(weightOf(toggleCode(initialProgress(T), 'milk', '2026-10-20', '⭐'), 'milk', T), W.fresh, 'old marks do not count');
});
test('garden misses raise a word, first-try finds lower it, never below 1', () => {
  let p = initialProgress(T);
  for (let i = 0; i < 5; i++) p = addFind(p, 'cat', T, false);
  assert.equal(weightOf(p, 'cat', T), W.fresh + W.missMax);
  let q = initialProgress(T);
  for (let i = 0; i < 9; i++) q = addFind(q, 'cat', T, true);
  assert.equal(weightOf(q, 'cat', T), W.floor);
});
test('learned words keep a small review weight; others get none', () => {
  const p = promote(initialProgress(T), 'banana', T).progress;
  assert.equal(weightOf(p, 'banana', T), W.learned);
  assert.equal(weightOf(p, 'lion', T), 0);
});
test('pickNext never repeats the last word and honours exclusions', () => {
  const p = initialProgress(T), rng = seeded(7);
  let prev = null;
  for (let i = 0; i < 500; i++) {
    const id = pickNext(p, T, { rng, previous: prev, exclude: ['ball'] });
    assert.notEqual(id, prev); assert.notEqual(id, 'ball');
    prev = id;
  }
});
test('pickNext follows the weights over many draws', () => {
  let p = initialProgress(T);
  p = toggleCode(p, 'cat', T, '👆');       // 4
  p = toggleCode(p, 'milk', T, '⭐');      // 2
  p = promote(p, 'banana', T).progress;    // 0.5 (learned)
  const rng = seeded(11), n = 40000, hits = {};
  for (let i = 0; i < n; i++) { const id = pickNext(p, T, { rng }); hits[id] = (hits[id] || 0) + 1; }
  const total = 4 + 2 + 0.5 + 3 * 8;       // cat, milk, banana, and 8 fresh targets
  for (const [id, w] of [['cat', 4], ['milk', 2], ['banana', 0.5], ['apple', 3]]) {
    const share = hits[id] / n, want = w / total;
    assert.ok(Math.abs(share - want) < 0.012, `${id}: ${share.toFixed(3)} vs ${want.toFixed(3)}`);
  }
});
test('pickOthers gives distinct words, never the target, his own words first', () => {
  const p = initialProgress(T);
  const o = pickOthers(p, 'cat', 2, { rng: seeded(3) });
  assert.equal(o.length, 2); assert.equal(new Set(o).size, 2); assert.ok(!o.includes('cat'));
  assert.ok(o.every(id => p.targets.some(t => t.id === id)));
  assert.equal(pickOthers(p, 'cat', 40, { rng: seeded(3) }).length, 40, 'fills from the bank when needed');
});
