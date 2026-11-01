import { after, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import mongoose, { Schema } from 'mongoose';
import { hasMongod, startMongod } from '../helpers';
import { auditStorage, type AuditStore } from '../../src/lib/audit/context';
import { auditTrail } from '../../src/lib/audit/plugin';
import AuditLog from '../../src/models/AuditLog';

/** Against a real MongoDB: a mocked driver would prove nothing about the hooks. */

const skip = hasMongod() ? false : 'mongod is not installed';

const WidgetSchema = new Schema({ name: String, stage: String, password: String, tags: [String], owner: { name: String } });
WidgetSchema.plugin(auditTrail);
const Widget = mongoose.model('Widget', WidgetSchema);

let stop: () => Promise<void> = async () => {};
const store = (): AuditStore => ({ requestId: 'r', method: 'POST', path: '/t', startedAt: 0, events: [], flushed: false });
async function run(fn: () => Promise<unknown>) {
  const s = store();
  // Awaited inside: a query is lazy, and runs wherever it is awaited.
  await auditStorage.run(s, async () => { await fn(); });
  return s.events;
}

before(async () => {
  if (skip) return;
  const db = await startMongod(27123);
  stop = db.stop;
  await mongoose.connect(db.uri);
});
after(async () => {
  if (skip) return;
  await mongoose.disconnect();
  await stop();
});
beforeEach(async () => {
  if (!skip) await Widget.deleteMany({});
});

test('create() records a create, with the values', { skip }, async () => {
  const [e] = await run(() => Widget.create({ name: 'A', stage: 'new' }));
  assert.equal(e.action, 'create');
  assert.equal(e.entity, 'Widget');
  assert.equal(e.entityLabel, 'A');
  assert.deepEqual(e.changes?.find((c) => c.field === 'stage'), { field: 'stage', from: null, to: 'new' });
});

test('save() records exactly what moved', { skip }, async () => {
  const w = await Widget.create({ name: 'A', stage: 'new' });
  const [e, ...rest] = await run(async () => { w.stage = 'done'; await w.save(); });
  assert.equal(rest.length, 0);
  assert.equal(e.action, 'update');
  assert.deepEqual(e.changes, [{ field: 'stage', from: 'new', to: 'done' }]);
});

test('a save that changes nothing records nothing', { skip }, async () => {
  const w = await Widget.create({ name: 'A' });
  assert.equal((await run(() => w.save())).length, 0);
});

test('findByIdAndUpdate', { skip }, async () => {
  const w = await Widget.create({ name: 'A', stage: 'new' });
  const [e] = await run(() => Widget.findByIdAndUpdate(w._id, { $set: { stage: 'x' } }));
  assert.deepEqual(e.changes, [{ field: 'stage', from: 'new', to: 'x' }]);
});

test('updateOne touches one row, however many match', { skip }, async () => {
  await Widget.create([{ name: 'A', stage: 's' }, { name: 'B', stage: 's' }]);
  const events = await run(() => Widget.updateOne({ stage: 's' }, { $set: { stage: 't' } }));
  assert.equal(events.length, 1);
});

test('updateMany is one entry per document', { skip }, async () => {
  await Widget.create([{ name: 'A', stage: 's' }, { name: 'B', stage: 's' }]);
  const events = await run(() => Widget.updateMany({ stage: 's' }, { $set: { stage: 't' } }));
  assert.deepEqual(events.map((e) => e.entityLabel).sort(), ['A', 'B']);
});

test('an upsert that inserts is a create', { skip }, async () => {
  const [e] = await run(() => Widget.findOneAndUpdate({ name: 'New' }, { $set: { stage: 's' } }, { upsert: true, new: true }));
  assert.equal(e.action, 'create');
});

test('an upsert that updates is an update', { skip }, async () => {
  await Widget.create({ name: 'A', stage: 'a' });
  const [e] = await run(() => Widget.findOneAndUpdate({ name: 'A' }, { $set: { stage: 'b' } }, { upsert: true, new: true }));
  assert.equal(e.action, 'update');
});

test('every way of deleting keeps what was deleted', { skip }, async () => {
  const ways: Array<(id: unknown) => Promise<unknown>> = [
    (id) => Widget.findByIdAndDelete(id),
    (id) => Widget.deleteOne({ _id: id }),
    (id) => Widget.deleteMany({ _id: id }),
    async (id) => { const d = await Widget.findById(id); await d?.deleteOne(); },
  ];
  for (const way of ways) {
    const w = await Widget.create({ name: 'Gone', stage: 'x' });
    const events = await run(() => way(w._id));
    assert.equal(events.length, 1, way.toString());
    assert.equal(events[0].action, 'delete');
    assert.equal(events[0].entityLabel, 'Gone');
    assert.deepEqual(events[0].changes?.find((c) => c.field === 'stage'), { field: 'stage', from: 'x', to: null });
  }
});

test('insertMany', { skip }, async () => {
  assert.equal((await run(() => Widget.insertMany([{ name: 'A' }, { name: 'B' }]))).length, 2);
});

test('a password update is seen but never stored', { skip }, async () => {
  const w = await Widget.create({ name: 'A', password: 'old' });
  const [e] = await run(async () => { w.password = 'new'; await w.save(); });
  assert.equal(e.changes?.[0].field, 'password');
  assert.ok(!JSON.stringify(e).includes('old') && !/"new"/.test(JSON.stringify(e)));
});

test('outside a request nothing is recorded and nothing is slowed', { skip }, async () => {
  const w = await Widget.create({ name: 'A' });
  await Widget.updateOne({ _id: w._id }, { stage: 'x' });
  assert.equal(auditStorage.getStore(), undefined);
});

test('audit rows cannot be edited or deleted', { skip }, async () => {
  const row = await AuditLog.create({ action: 'x', entity: 'y' });
  await assert.rejects(() => AuditLog.updateOne({ _id: row._id }, { action: 'z' }), /cannot be changed/);
  await assert.rejects(() => AuditLog.findByIdAndDelete(row._id), /cannot be changed/);
  await assert.rejects(() => AuditLog.deleteMany({}), /cannot be changed/);
  row.action = 'z';
  await assert.rejects(() => row.save(), /cannot be changed/);
});
