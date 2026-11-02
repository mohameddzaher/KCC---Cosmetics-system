import { test } from 'node:test';
import assert from 'node:assert/strict';
import { materialDeltas, mergePlan, normalizePlan } from '../../src/lib/materialsPlan';

const A = 'a'.repeat(24);
const B = 'b'.repeat(24);
const C = 'c'.repeat(24);

test('a plan is cleaned before it is trusted', () => {
  assert.deepEqual(normalizePlan([{ itemId: A, quantity: 2 }, { itemId: A, quantity: '1.5' }]), [{ itemId: A, quantity: 3.5 }], 'one line per item');
  assert.throws(() => normalizePlan('nope'));
  assert.throws(() => normalizePlan([{ itemId: 'x', quantity: 1 }]), /Pick a material/);
  assert.throws(() => normalizePlan([{ itemId: A, quantity: -1 }]), /zero or more/);
  assert.throws(() => normalizePlan([{ itemId: A, quantity: 'lots' }]));
});

test('before production, the plan is only a plan', () => {
  const lines = mergePlan([], [{ itemId: A, quantity: 5 }, { itemId: B, quantity: 2 }]);
  assert.deepEqual(materialDeltas(lines), [{ itemId: A, delta: 5 }, { itemId: B, delta: 2 }], 'all of it is still to take');
});

test('after production starts, only the difference moves', () => {
  const taken = [
    { itemId: A, quantity: 5, consumed: 5, cost: 50 },
    { itemId: B, quantity: 2, consumed: 2, cost: 8 },
  ];
  const lines = mergePlan(taken, [{ itemId: A, quantity: 7 }, { itemId: C, quantity: 1 }]);
  const byId = Object.fromEntries(materialDeltas(lines).map((d) => [d.itemId, d.delta]));
  assert.equal(byId[A], 2, 'two more of A');
  assert.equal(byId[B], -2, 'B dropped: give it back');
  assert.equal(byId[C], 1, 'C is new');
  assert.equal(lines.find((l) => String(l.itemId) === A)!.cost, 50, 'what was spent stays on record');
});

test('an untouched plan moves nothing, and a cleared line disappears once returned', () => {
  const taken = [{ itemId: A, quantity: 5, consumed: 5, cost: 50 }];
  assert.deepEqual(materialDeltas(mergePlan(taken, [{ itemId: A, quantity: 5 }])), [{ itemId: A, delta: 0 }]);
  assert.equal(mergePlan([{ itemId: A, quantity: 5, consumed: 0 }], []).length, 0, 'never taken: gone');
  assert.equal(mergePlan(taken, []).length, 1, 'taken: kept at zero so it can be returned');
});

test('fractions do not drift', () => {
  const lines = mergePlan([{ itemId: A, quantity: 0.3, consumed: 0.3 }], [{ itemId: A, quantity: 0.1 + 0.2 }]);
  assert.equal(materialDeltas(lines)[0].delta, 0);
});
