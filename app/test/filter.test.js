import test from 'node:test';
import assert from 'node:assert/strict';
import { checkText } from '../src/filter.js';
import { cigCost } from '../src/prices.js';
import { ppcOf } from '../src/calc.js';

test('normalises spaced and stretched profanity', () => {
  assert.ok(checkText('זייייין', 'name'));
  assert.ok(checkText('ז י ן', 'name'));
  assert.equal(checkText('נועה', 'name'), null);
  assert.equal(checkText('כוס קפה', 'name'), null);
  assert.ok(checkText('כוס', 'name'));
  assert.equal(checkText('class', 'name'), null);
  assert.equal(checkText('cocktail', 'name'), null);
  assert.ok(checkText('f.u.c.k', 'reason'));
});

test('a tobacco brand is blocked only as a savings goal', () => {
  assert.equal(checkText('מרלבורו', 'name'), null);
  assert.ok(checkText('מרלבורו', 'goal'));
  assert.equal(checkText('טיול לים', 'goal'), null);
});

test('rolling cost includes papers and filters at 0.11', () => {
  const each = cigCost({ mode: 'ryo', price: 112, grams: 40 });
  assert.ok(Math.abs(each - 1.79) < 0.001, String(each));
  const day = (46.5 / 20) * 11;
  assert.ok(Math.abs(day - 25.575) < 1e-9);
  assert.equal(Math.round(day * 365), 9335);
});

test('simple price model does not disturb an older rolling backup', () => {
  const legacy = ppcOf({ mode: 'ryo', tobPrice: 120, tobGrams: 40, gpc: 0.5, papPrice: 5, papLeaves: 50, filPrice: 5, filCount: 80 });
  assert.ok(Math.abs(legacy - 1.6625) < 1e-9);
  const simple = ppcOf({ mode: 'ryo', priceModel: 'simple', tobPrice: 95, tobGrams: 30, gpc: 0.6 });
  assert.ok(Math.abs(simple - (95 / 50 + 0.11)) < 1e-9);
});
