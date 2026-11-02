import { test } from 'node:test';
import assert from 'node:assert/strict';
import { agingBucket, balanceOf, displayStatus, statusFromPayments } from '../../src/lib/invoiceStatus';

test('the status follows the money', () => {
  assert.equal(statusFromPayments('sent', 115, 0), 'sent');
  assert.equal(statusFromPayments('sent', 115, 50), 'partial');
  assert.equal(statusFromPayments('partial', 115, 115), 'paid');
  assert.equal(statusFromPayments('paid', 115, 50), 'partial', 'a refund reopens it');
  assert.equal(statusFromPayments('paid', 115, 0), 'sent');
});

test('a draft waits for a person, a cancelled invoice stays cancelled', () => {
  assert.equal(statusFromPayments('draft', 115, 0), 'draft');
  assert.equal(statusFromPayments('cancelled', 115, 115), 'cancelled');
  assert.equal(statusFromPayments('draft', 115, 50), 'partial');
});

test('a fraction of a halala does not leave an invoice open', () => {
  assert.equal(statusFromPayments('sent', 100.01, 100.0099), 'paid');
  assert.equal(balanceOf({ total: 100.1, amountPaid: 100.1 }), 0);
  assert.equal(balanceOf({ total: 10, amountPaid: 20 }), 0);
});

test('overdue comes from the date, and only for what is still owed', () => {
  const now = new Date('2026-06-15T12:00:00');
  assert.equal(displayStatus({ status: 'sent', dueDate: '2026-06-14' }, now), 'overdue');
  assert.equal(displayStatus({ status: 'partial', dueDate: '2026-06-14' }, now), 'overdue');
  assert.equal(displayStatus({ status: 'sent', dueDate: '2026-06-15T00:00:00' }, now), 'sent', 'due today is not late');
  assert.equal(displayStatus({ status: 'paid', dueDate: '2026-01-01' }, now), 'paid');
  assert.equal(displayStatus({ status: 'cancelled', dueDate: '2026-01-01' }, now), 'cancelled');
});

test('ageing buckets', () => {
  const now = new Date('2026-06-30T12:00:00');
  assert.equal(agingBucket('2026-07-01', now), 'current');
  assert.equal(agingBucket(null, now), 'current');
  assert.equal(agingBucket('2026-06-29', now), 'd1_30');
  assert.equal(agingBucket('2026-05-31', now), 'd1_30');
  assert.equal(agingBucket('2026-05-30', now), 'd31_60');
  assert.equal(agingBucket('2026-04-30', now), 'd61_90');
  assert.equal(agingBucket('2026-03-01', now), 'd90plus');
});
