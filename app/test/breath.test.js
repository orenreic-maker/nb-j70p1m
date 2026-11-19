import test from 'node:test';
import assert from 'node:assert/strict';
import { PRESETS, currentBreath, cycleOf, longHolds, phaseAt, problems, toRunner } from '../src/breath.js';
import { blank, migrate } from '../src/model.js';

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

test('presets are the only pattern source and customs survive a backup', () => {
  const sigh = toRunner(PRESETS.find((p) => p.id === 'sigh'));
  assert.deepEqual(sigh.map((p) => p[1]), [2, 1, 6]);
  assert.equal(sigh[0][2], 0.94);
  assert.equal(cycleOf(PRESETS[0]), 19);
  assert.deepEqual(problems({ phases: [{ k: 'in', s: 4 }] }), ['צריך לפחות נשיפה אחת']);
  assert.equal(longHolds({ phases: [{ k: 'hold', s: 10 }] }), true);
  assert.equal(longHolds(PRESETS[0]), false);
  const saved = migrate({
    settings: { quitAt: 10, breathId: 'mine' },
    breaths: [{ id: 'mine', name: 'ערב', phases: [{ k: 'in', s: 4 }, { k: 'out', s: 30 }, { k: 'nope', s: 3 }] }],
  });
  assert.equal(saved.settings.breathId, 'mine');
  assert.equal(saved.breaths[0].phases[1].s, 20);
  assert.equal(saved.breaths[0].phases.length, 2);
  assert.equal(currentBreath(blank()).id, 'calm478');
});

test('no drift after many cycles', () => {
  const ph = phaseAt(P478, 19 * 31 + 5); // 31 full cycles, then 5 s into the hold
  assert.deepEqual([ph.i, ph.left], [1, 6]);
});
