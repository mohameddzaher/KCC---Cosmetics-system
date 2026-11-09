import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ORDER_STATUSES, STATUS_META, TRANSITIONS } from '../../src/lib/orderWorkflow';

const arabic = /[؀-ۿ]/;

test('every status reads in Arabic and English, for the team and for the customer', () => {
  for (const s of ORDER_STATUSES) {
    const m = STATUS_META[s];
    assert.ok(m.labelEn && m.customerEn, `${s} has English`);
    assert.match(m.labelAr, arabic, `${s} has an Arabic label`);
    assert.match(m.customerAr, arabic, `${s} has an Arabic line for the customer`);
  }
});

test('every action button reads in both languages', () => {
  for (const [from, list] of Object.entries(TRANSITIONS)) {
    for (const t of list) {
      assert.ok(t.actionEn, `${from} → ${t.to}`);
      assert.match(t.actionAr, arabic, `${from} → ${t.to} in Arabic`);
    }
  }
});
