import { test } from 'node:test';
import assert from 'node:assert/strict';
import { localDate, addDays } from '../src/core/today.js';

test('localDate formats the local day', () => {
  assert.equal(localDate(new Date(2026, 10, 8, 23, 50)), '2026-11-08');
});
test('addDays crosses a month', () => {
  assert.equal(addDays('2026-11-29', 3), '2026-12-02');
  assert.equal(addDays('2026-11-08', -7), '2026-11-01');
});
