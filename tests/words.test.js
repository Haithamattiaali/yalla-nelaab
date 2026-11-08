import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BANK, GROUPS, SAMPLE_IDS, MOVES, word } from '../src/core/words.js';
import { whereLine, hereLine, SHARED, lineForKey } from '../src/core/lines.js';

test('the bank has 41 picture words in 6 groups', () => {
  assert.equal(BANK.length, 41);
  assert.equal(new Set(BANK.map(w => w.id)).size, 41);
  assert.deepEqual([...new Set(BANK.map(w => w.group))], GROUPS);
  const per = Object.fromEntries(GROUPS.map(g => [g, BANK.filter(w => w.group === g).length]));
  assert.deepEqual(per, { food: 10, animals: 10, toys: 7, home: 8, outside: 4, body: 2 });
});
test('every word has a gender, a picture, a known way of moving and the article', () => {
  for (const w of BANK) {
    assert.ok(['m', 'f'].includes(w.g), w.id);
    assert.ok(w.emoji && w.ar && w.def.startsWith('ال'), w.id);
    assert.ok(MOVES.includes(w.move), w.id);
  }
});
test('the six sample words are in the bank', () => {
  for (const id of SAMPLE_IDS) assert.ok(word(id), id);
});
test('lines follow the gender', () => {
  assert.equal(whereLine(word('banana')), 'فين المُوزَة؟');
  assert.equal(hereLine(word('banana')), 'أهي المُوزَة!');
  assert.equal(hereLine(word('milk')), 'أهو اللَّبَن!');
  assert.equal(lineForKey('milk:where', word), 'فين اللَّبَن؟');
  assert.equal(lineForKey('shared:more', word), 'كمان؟');
  assert.equal(SHARED.length, 5);
});
