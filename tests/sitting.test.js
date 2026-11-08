import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSitting, canNext, finishRound, advance, isOver } from '../src/core/sitting.js';
import { thresholdFrom, fillStep, FLOOR, MAX_STEP } from '../src/core/blow.js';

test('Next is refused until the word moment is over', () => {
  let s = createSitting('garden', 2);
  assert.equal(canNext(s), false);
  assert.equal(advance(s), s);
  s = finishRound(s, 'cat');
  assert.equal(canNext(s), true); assert.equal(s.previous, 'cat');
  s = advance(s); assert.equal(s.index, 1); assert.equal(canNext(s), false);
  s = advance(finishRound(s, 'milk'));
  assert.ok(isOver(s));
});
test('the blow threshold comes from the room and has a floor', () => {
  assert.equal(thresholdFrom(0), FLOOR);
  assert.ok(Math.abs(thresholdFrom(0.05) - 0.16) < 1e-9);
});
test('quiet does not fill; blowing fills, capped per frame', () => {
  assert.equal(fillStep(0.02, 0.03), 0);
  assert.ok(fillStep(0.2, 0.03) > 0);
  assert.equal(fillStep(5, 0.03), MAX_STEP);
  assert.equal(fillStep(NaN, 0.03), 0);
});
