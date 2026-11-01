import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Types } from 'mongoose';
import { MASK, MAX_CHANGES, diffDocuments, flatten, isSensitive, labelOf, redactBody } from '../../src/lib/audit/diff';

const field = (r: ReturnType<typeof diffDocuments>, name: string) => r.changes.find((c) => c.field === name);

test('reports only what differs, with both values', () => {
  const r = diffDocuments({ stage: 'upcoming', city: 'riyadh' }, { stage: 'current', city: 'riyadh' });
  assert.deepEqual(r.changes, [{ field: 'stage', from: 'upcoming', to: 'current' }]);
});

test('walks nested objects by dotted path', () => {
  const r = diffDocuments({ keyPerson: { name: 'A', phone: '1' } }, { keyPerson: { name: 'B', phone: '1' } });
  assert.deepEqual(r.changes, [{ field: 'keyPerson.name', from: 'A', to: 'B' }]);
});

test('one new line in an array of objects is that line, not the whole array', () => {
  const h = [{ status: 'new', at: new Date(0) }];
  const r = diffDocuments({ statusHistory: h }, { statusHistory: [...h, { status: 'paid', at: new Date(0) }] });
  assert.deepEqual(r.changes.map((c) => c.field), ['statusHistory.1.at', 'statusHistory.1.status']);
});

test('an array of plain values stays whole, so the screen can say what was added', () => {
  const r = diffDocuments({ permissions: ['a'] }, { permissions: ['a', 'b'] });
  assert.deepEqual(r.changes, [{ field: 'permissions', from: ['a'], to: ['a', 'b'] }]);
});

test('ObjectIds and dates compare by value', () => {
  const id = new Types.ObjectId();
  const at = new Date('2026-01-01');
  assert.equal(diffDocuments({ ownerId: id, at }, { ownerId: new Types.ObjectId(id.toHexString()), at: new Date(at) }).changes.length, 0);
});

test('bookkeeping fields are not changes', () => {
  assert.equal(diffDocuments({ updatedAt: new Date(0), __v: 1, matchKeys: ['a'] }, { updatedAt: new Date(), __v: 2, matchKeys: ['b'] }).changes.length, 0);
});

test('undefined, null and empty string are the same nothing', () => {
  assert.equal(diffDocuments({ a: null, b: '', c: [] }, { a: undefined, b: null }).changes.length, 0);
});

test('a secret is recorded as changed but its value never is', () => {
  const r = diffDocuments({ password: 'old-hash' }, { password: 'new-hash' });
  assert.deepEqual(field(r, 'password'), { field: 'password', from: MASK, to: MASK });
  assert.ok(!JSON.stringify(r).includes('hash'));
});

test('a secret first being set shows nothing to something', () => {
  assert.deepEqual(field(diffDocuments({}, { smtpPass: 'x' }), 'smtpPass'), { field: 'smtpPass', from: null, to: MASK });
});

test('recognises secrets at any depth, and leaves ordinary words alone', () => {
  for (const f of ['password', 'mail.smtpPass', 'resetToken', 'apiKey', 'integrations.0.secret']) assert.ok(isSensitive(f), f);
  for (const f of ['name', 'passport', 'stage', 'footprint', 'compassion']) assert.ok(!isSensitive(f), f);
});

test('a huge document cannot produce a huge row', () => {
  const big = Object.fromEntries(Array.from({ length: MAX_CHANGES + 50 }, (_, i) => [`f${i}`, i]));
  const r = diffDocuments({}, big);
  assert.equal(r.changes.length, MAX_CHANGES);
  assert.equal(r.truncated, true);
  assert.ok((flatten({ s: 'x'.repeat(9000) }).s as string).length < 2100);
});

test('request bodies lose their secrets and their bulk', () => {
  const out = redactBody({ email: 'a@b.c', password: 'hunter2', nested: { newPassword: 'x' }, blob: 'y'.repeat(5000) }) as Record<string, any>;
  assert.equal(out.email, 'a@b.c');
  assert.equal(out.password, MASK);
  assert.equal(out.nested.newPassword, MASK);
  assert.ok(out.blob.length < 300);
});

test('finds the word a person would use for a record', () => {
  assert.equal(labelOf({ orderNumber: 'SMP-1', name: 'x' }), 'SMP-1');
  assert.equal(labelOf({ name: 'Nahdi' }), 'Nahdi');
  assert.equal(labelOf({ other: 1 }), undefined);
});
