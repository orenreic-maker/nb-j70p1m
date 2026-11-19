import test from 'node:test';
import assert from 'node:assert/strict';
import { phaseAt } from '../src/breath.js';

const P478 = [['שאיפה', 4, 1], ['החזקה', 7, 1], ['נשיפה', 8, 0.82]];

test('phase countdown and wave clock change on the same whole second', () => {
  // Both counters are derived from the same integer second, so every phase edge is also a wave-clock edge.
  let prev = phaseAt(P478, 0);
  assert.deepEqual([prev.i, prev.left], [0, 4]);
  for (let s = 1; s < 600; s++) {
    const ph = phaseAt(P478, s);
    const changedPhase = ph.step !== prev.step;
    assert.ok(changedPhase ? ph.left === P478[ph.i][1] : ph.left === prev.left - 1, `second ${s}`);
    prev = ph;
  }
});

test('no drift after many cycles', () => {
  const ph = phaseAt(P478, 19 * 31 + 5); // 31 full cycles, then 5 s into the hold
  assert.deepEqual([ph.i, ph.left], [1, 6]);
});
