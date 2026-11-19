import test from 'node:test';
import assert from 'node:assert/strict';
import { DAY, HOUR, MIN, cigsAt, keepSlips, lastSmokeAt, moneyAt, ppcOf, fmtLife } from '../src/calc.js';
import { applySlip, blank, deleteSlip, migrate, updateSlip } from '../src/model.js';
import { HEALTH, RESTARTS, withSlips } from '../src/health.js';
import { ACH } from '../src/achievements.js';

test('rolled-tobacco formula matches the brief', () => {
  const s = { mode: 'ryo', tobPrice: 120, tobGrams: 40, gpc: 0.5, papPrice: 5, papLeaves: 50, filPrice: 5, filCount: 80, cpd: 15 };
  const ppc = ppcOf(s);
  assert.ok(Math.abs(ppc - 1.6625) < 1e-9);
  assert.ok(Math.abs(ppc * 15 - 24.9375) < 1e-9);
  assert.equal(Math.round(ppc * 15 * 30.44), 759);
  assert.equal(Math.round(ppc * 15 * 365.25), 9108);
});

test('four days and 05:23:03 matches the board numbers', () => {
  const st = blank();
  st.settings.mode = 'ryo';
  st.settings.cpd = 15;
  st.settings.mpc = 11;
  st.settings.quitAt = 0;
  const t = 4 * DAY + 5 * HOUR + 23 * MIN + 3000;
  const cigs = cigsAt(st, t);
  assert.ok(Math.abs(cigs - 63.365104) < 1e-3);
  assert.equal(Math.floor(cigs), 63);
  assert.equal(moneyAt(st, t).toFixed(2), '105.34');
  assert.equal(fmtLife(cigs * 11).text, '11:37');
});

test('a slip keeps history and does not wipe the quit date', () => {
  const st = blank();
  st.settings.quitAt = 1_000;
  st.settings.cpd = 10;
  st.settings.mode = 'pack';
  st.cravings.push({ id: 'a', t: 2_000, won: true });
  st.checkins.push({ id: 'b', t: 2_000, mood: 3, crave: 4 });
  applySlip(st, { now: 5_000, cigs: 2, note: 'קפה', triggers: ['coffee'], mode: 'keep' });
  assert.equal(st.settings.quitAt, 1_000);
  assert.equal(st.cravings.length, 1);
  assert.equal(st.checkins.length, 1);
  assert.equal(st.slips.length, 1);
  assert.equal(st.slips[0].restart, false);
});

test('restart keeps the previous streak and the journal', () => {
  const st = blank();
  st.settings.quitAt = 0;
  st.settings.cpd = 10;
  st.settings.mode = 'ryo';
  st.cravings.push({ id: 'a', t: 10, won: true });
  applySlip(st, { now: DAY, cigs: 1, note: '', triggers: [], mode: 'restart' });
  assert.equal(st.settings.quitAt, DAY);
  assert.equal(st.cravings.length, 1);
  assert.equal(st.attempts.length, 1);
  assert.ok(st.longest >= DAY);
});

test('kept slips move the body clock and an edit recomputes it', () => {
  assert.equal(RESTARTS.size, 12);
  assert.ok(RESTARTS.has('n-72h'));
  assert.equal(RESTARTS.has('l-1w'), false);
  const st = blank();
  st.settings.quitAt = 0;
  st.settings.cpd = 10;
  st.settings.mode = 'pack';
  st.settings.packPrice = 40;
  st.settings.perPack = 20;
  applySlip(st, { now: 2 * DAY, cigs: 3, note: '', triggers: ['coffee'], mode: 'keep' });
  assert.equal(st.settings.quitAt, 0);
  assert.equal(lastSmokeAt(st), 2 * DAY);
  assert.equal(keepSlips(st).length, 1);
  const steps = withSlips(3 * DAY, DAY);
  assert.equal(steps.find((h) => h.id === 'air-20m').status, 'done');
  assert.equal(steps.find((h) => h.id === 'l-1w').status, 'now');
  assert.equal(steps.find((h) => h.id === 'n-72h').again, true);
  updateSlip(st, st.slips[0].id, { now: DAY, cigs: 1, note: 'עודכן', triggers: [], mode: 'keep' });
  assert.equal(st.slips[0].cigs, 1);
  assert.equal(lastSmokeAt(st), DAY);
  deleteSlip(st, st.slips[0].id);
  assert.equal(st.slips.length, 0);
  assert.equal(lastSmokeAt(st), 0);
});

test('old backup migrates without keeping kids text', () => {
  const next = migrate({
    v: 1,
    settings: { quitAt: 10, packPrice: 40, perPack: 20, cpd: 20, kids: ['נועה'], reasons: ['לנשום'] },
    cravings: [{ t: 11, won: true }],
    unlocked: { h1: 12 },
  });
  assert.equal(next.settings.mode, 'ryo');
  assert.equal(next.settings.cpd, 15);
  assert.equal(next.settings.kids, undefined);
  assert.equal(next.cravings.length, 1);
  assert.equal(next.unlocked.h1, 12);
  assert.deepEqual(next.settings.reasons, ['לנשום']);
});

test('health milestones are sourced and in range', () => {
  assert.ok(HEALTH.length >= 40 && HEALTH.length <= 60, String(HEALTH.length));
  for (const h of HEALTH) {
    assert.ok(h.source && h.url.startsWith('http'), h.id);
    assert.ok(h.icon && h.title && h.when, h.id);
  }
});

test('original 23 achievement ids are still here', () => {
  const ids = new Set(ACH.map((a) => a.id));
  for (const id of ['h1', 'd1', 'd3', 'w1', 'w2', 'm1', 'd100', 'm6', 'y1', 'r100', 'r500', 'r1000', 'r5000', 'r10000', 'c100', 'c500', 'c1000', 'c5000', 'k1', 'k10', 'k50', 'j1', 'j7']) {
    assert.ok(ids.has(id), id);
  }
  assert.ok(ids.has('log1') && ids.has('streak7') && ids.has('trigTop') && ids.has('k100'));
});

test('backup parsing tolerates a BOM and whitespace and rejects junk', async () => {
  const { parseBackup } = await import('../src/model.js');
  const st = blank();
  st.settings.quitAt = 1700000000000;
  const json = JSON.stringify(st, null, 2);
  assert.equal(parseBackup(json).settings.quitAt, 1700000000000);
  assert.equal(parseBackup('\uFEFF\n  ' + json + '\n\n').settings.quitAt, 1700000000000);
  assert.throws(() => parseBackup('hello'));
  assert.throws(() => parseBackup('{"a":1}'));
  assert.throws(() => parseBackup(JSON.stringify(blank())));
});
