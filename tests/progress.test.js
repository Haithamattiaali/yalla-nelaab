import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initialProgress, nextNewWord, toggleCode, hasCode, addFind, learnedReady, stalled, promote, swap, weekSummary, sanitize, needsPictureCue, TARGET_COUNT } from '../src/core/progress.js';
import { word } from '../src/core/words.js';

const T = '2026-11-08';
const ids = p => p.targets.map(t => t.id);

test('starts with the six sample words plus one from each missing group', () => {
  const p = initialProgress(T);
  assert.equal(p.targets.length, TARGET_COUNT);
  assert.deepEqual(ids(p), ['banana', 'apple', 'milk', 'water', 'biscuit', 'cat', 'ball', 'shoe', 'sun', 'eye']);
});
test('a code toggles on and off for one day only', () => {
  let p = initialProgress(T);
  p = toggleCode(p, 'banana', T, '⭐');
  assert.ok(hasCode(p, 'banana', T, '⭐'));
  assert.ok(!hasCode(p, 'banana', '2026-11-07', '⭐'));
  p = toggleCode(p, 'banana', T, '⭐');
  assert.ok(!hasCode(p, 'banana', T, '⭐'));
  assert.throws(() => toggleCode(p, 'banana', T, 'x'));
});
test('learned needs ⭐ or ➕ on 3 different days within 7 days', () => {
  let p = initialProgress(T);
  p = toggleCode(p, 'banana', '2026-11-02', '⭐');
  p = toggleCode(p, 'banana', '2026-11-05', '➕');
  assert.equal(learnedReady(p, 'banana'), false);
  p = toggleCode(p, 'banana', '2026-11-08', '⭐');
  assert.equal(learnedReady(p, 'banana'), true);
});
test('three marks on one day are not learned', () => {
  let p = initialProgress(T);
  for (const c of ['⭐', '➕', '🔁']) p = toggleCode(p, 'milk', T, c);
  assert.equal(learnedReady(p, 'milk'), false);
});
test('three days spread over more than a week are not learned', () => {
  let p = initialProgress(T);
  for (const d of ['2026-10-30', '2026-11-03', '2026-11-08']) p = toggleCode(p, 'milk', d, '⭐');
  assert.equal(learnedReady(p, 'milk'), false);
});
test('👆 alone never counts toward learned', () => {
  let p = initialProgress(T);
  for (const d of ['2026-11-06', '2026-11-07', '2026-11-08']) p = toggleCode(p, 'milk', d, '👆');
  assert.equal(learnedReady(p, 'milk'), false);
});
test('promote moves the word to learned and brings one in from the group with fewest words', () => {
  const p = initialProgress(T);
  const { progress: q, added } = promote(p, 'ball', T);
  assert.ok(q.learned.some(l => l.id === 'ball'));
  assert.ok(!ids(q).includes('ball'));
  assert.equal(q.targets.length, TARGET_COUNT);
  assert.equal(word(added).group, 'toys');     // toys now has 0 in practice, the fewest, first in order
  assert.equal(added, 'car');
});
test('promote twice in the same group keeps variety', () => {
  let p = initialProgress(T);
  p = promote(p, 'banana', T).progress;   // food has 4 left; animals, toys, home, outside, body have 1 each → animals first
  assert.equal(word(p.targets.at(-1).id).group, 'animals');
  assert.equal(p.targets.at(-1).id, 'dog');
});
test('swap sends the old word back to the bank, not to learned', () => {
  let p = initialProgress(T);
  p = swap(p, 'sun', 'dog', T);
  assert.ok(ids(p).includes('dog') && !ids(p).includes('sun'));
  assert.ok(p.paused.includes('sun'));
  assert.ok(!p.learned.some(l => l.id === 'sun'));
  assert.notEqual(nextNewWord(p), 'sun');
  assert.equal(swap(p, 'dog', 'banana', T), p, 'cannot swap in a word already in practice');
});
test('stalled after 14 days with no sign of the word', () => {
  let p = initialProgress('2026-10-20');
  assert.equal(stalled(p, 'eye', '2026-11-02'), false);
  assert.equal(stalled(p, 'eye', '2026-11-03'), true);
  p = toggleCode(p, 'eye', '2026-10-25', '👆');
  assert.equal(stalled(p, 'eye', '2026-11-08'), false);
  p = toggleCode(p, 'cat', '2026-10-25', '✋');
  assert.equal(stalled(p, 'cat', '2026-11-08'), true, 'a sign alone is logged apart and does not unstall');
});
test('the week summary counts this week only', () => {
  let p = initialProgress(T);
  p = toggleCode(p, 'cat', '2026-10-31', '👆');
  p = toggleCode(p, 'cat', '2026-11-02', '👆');
  p = addFind(addFind(p, 'cat', T, true), 'cat', '2026-11-01', false);
  assert.deepEqual(weekSummary(p, 'cat', T), { codes: { '👆': 1 }, rounds: 1, firstTry: 1 });
});
test('a broken save is rebuilt, a good one is kept', () => {
  assert.equal(sanitize(null, T).targets.length, 10);
  assert.equal(sanitize({ v: 2 }, T).targets.length, 10);
  const p = toggleCode(initialProgress(T), 'cat', T, '⭐');
  const s = sanitize(JSON.parse(JSON.stringify({ ...p, codes: { ...p.codes, nope: [{ date: T, code: '⭐' }], cat: [...p.codes.cat, { date: 'x', code: '⭐' }] } })), T);
  assert.deepEqual(s.codes, { cat: [{ date: T, code: '⭐' }] });
});

test('a new word shows its picture in the bubble until he shows he knows it', () => {
  let p = initialProgress(T);
  assert.equal(needsPictureCue(p, 'cat'), true);
  assert.equal(needsPictureCue(addFind(p, 'cat', T, false), 'cat'), true, 'a find after a miss does not count');
  assert.equal(needsPictureCue(addFind(p, 'cat', T, true), 'cat'), false);
  assert.equal(needsPictureCue(toggleCode(p, 'cat', T, '👆'), 'cat'), false);
  assert.equal(needsPictureCue(toggleCode(p, 'cat', T, '✋'), 'cat'), true, 'a sign alone keeps the picture');
  assert.equal(needsPictureCue(promote(p, 'cat', T).progress, 'cat'), false);
});
