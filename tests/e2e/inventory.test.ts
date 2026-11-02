import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { hasMongod, startMongod } from '../helpers';

/**
 * Production drawing on the store: an order's materials leave the shelves when
 * the factory starts it, never twice, never below zero, and the money follows.
 * Every step is made by the person who would make it, through the real API.
 */

const skip = hasMongod() ? false : 'mongod is not installed';
const PORT = 3127;
const BASE = `http://127.0.0.1:${PORT}`;
const PASSWORD = 'Test12345!';
const opts = { skip };

let server: ChildProcess;
let stopDb: () => Promise<void> = async () => {};
let conn: mongoose.Connection;
let db: mongoose.mongo.Db;
const as: Record<string, string> = {};
let seq = 0;

async function call(who: string, path: string, method = 'GET', body?: unknown) {
  const r = await fetch(BASE + path, {
    method,
    headers: { 'content-type': 'application/json', cookie: as[who] || '', 'x-forwarded-for': `10.4.0.${++seq % 250}` },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: r.status, json: await r.clone().json().catch(() => null) };
}

/** A move, by whoever is meant to make it. */
async function move(who: string, id: string, to: string, extra: Record<string, unknown> = {}) {
  const r = await call(who, `/api/orders/${id}/transition`, 'POST', { to, ...extra });
  assert.equal(r.status, 200, `${who} → ${to}: ${JSON.stringify(r.json)}`);
  assert.equal(r.json.accountingWarning, undefined, 'the books kept up');
}

async function customerSees(id: string, status: string, who = 'buyer') {
  const r = await call(who, `/api/orders/${id}`);
  assert.equal(r.status, 200);
  assert.equal(r.json.status, status, 'the customer sees where the order is');
  assert.ok(!('internalNotes' in r.json), 'and never the team notes');
  return r.json;
}

async function placeOrder(type = 'sample', company = 'Rose Beauty Co', who = 'buyer') {
  const r = await call(who, '/api/orders', 'POST', {
    type,
    internalNotes: 'injected by the customer',
    customerInfo: { companyName: company, personName: 'Lina', email: 'buyer@t.local', phone: '0501112222', city: 'Riyadh' },
  });
  assert.equal(r.status, 201, JSON.stringify(r.json));
  return String(r.json.id);
}

before(async () => {
  if (skip) return;
  const mongo = await startMongod(27127);
  stopDb = mongo.stop;
  conn = await mongoose.createConnection(mongo.uri).asPromise();
  db = conn.db as mongoose.mongo.Db;
  const password = bcrypt.hashSync(PASSWORD, 4);
  const people: Record<string, string> = {
    admin: 'SUPER_ADMIN', am: 'ACCOUNT_MANAGER', sales: 'SALES', finance: 'ACCOUNTANT',
    factory: 'FACTORY', dispatch: 'LOGISTICS', buyer: 'CUSTOMER', stranger: 'CUSTOMER', cedar: 'CUSTOMER',
  };
  for (const [k, role] of Object.entries(people)) {
    await db.collection('users').insertOne({ name: k, email: `${k}@t.local`, role, isActive: true, password, createdAt: new Date(), updatedAt: new Date() });
  }
  await db.collection('sitesettings').insertOne({ key: 'main', general: { companyName: { en: 'KCC', ar: 'كي سي سي' }, vatNumber: '300000000000003', paymentTermsDays: 30 } });

  server = spawn('npx', ['next', 'start', '-p', String(PORT)], {
    env: { ...process.env, MONGODB_URI: mongo.uri, NEXTAUTH_SECRET: 'e2e-secret-0123456789012345678901234', NODE_ENV: 'production' },
    stdio: 'ignore', detached: true,
  });
  for (let i = 0; i < 100; i++) {
    if (await fetch(`${BASE}/api/health`).then((r) => r.ok).catch(() => false)) break;
    await new Promise((r) => setTimeout(r, 200));
  }
  for (const k of Object.keys(people)) {
    const r = await fetch(`${BASE}/api/auth/login`, {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-forwarded-for': `10.5.0.${++seq}` },
      body: JSON.stringify({ email: `${k}@t.local`, password: PASSWORD }),
    });
    as[k] = r.headers.getSetCookie().map((c) => c.split(';')[0]).join('; ');
  }
});

after(async () => {
  if (skip) return;
  try { process.kill(-(server.pid as number)); } catch { /* gone */ }
  await new Promise((r) => setTimeout(r, 300));
  await conn.close();
  await stopDb();
});


const oid = (id: string) => new mongoose.Types.ObjectId(id);
const stock = async (id: string) => (await db.collection('inventoryitems').findOne({ _id: oid(id) }))!.currentStock;
const today = new Date().toISOString().slice(0, 10);

async function newItem(sku: string, currentStock: number, costPerUnit: number, lowStockThreshold = 0, en = `Item ${sku}`) {
  const r = await call('factory', '/api/inventory', 'POST', {
    sku, name: { en, ar: `صنف ${sku}` }, category: 'Raw', unit: 'kg', currentStock, costPerUnit, lowStockThreshold,
  });
  assert.equal(r.status, 201, JSON.stringify(r.json));
  return String(r.json._id);
}

async function toFactory(company: string) {
  const id = await placeOrder('sample', company);
  await move('am', id, 'Under Review');
  await move('am', id, 'Approved');
  await move('am', id, 'Queued for Production');
  return id;
}

let A = '';
let B = '';
let storeOrder = '';

test('an opening count is a movement, and a level cannot be typed over', opts, async () => {
  A = await newItem('GLY-01', 10, 5, 6);
  B = await newItem('BTL-50', 1, 2, 0, 'Bottle 50 ml');
  assert.equal(await stock(A), 10);
  const opening = await db.collection('inventorymovements').findOne({ itemId: oid(A) });
  assert.equal(opening?.type, 'IN');
  assert.equal(opening?.reason, 'Opening stock');
  assert.equal(opening?.previousStock, 0);

  const r = await call('factory', `/api/inventory/${A}`, 'PUT', { currentStock: 999, lowStockThreshold: 6 });
  assert.equal(r.status, 200);
  assert.equal(await stock(A), 10, 'editing the item does not change the level');
});

test('only the store keepers change stock or an order\'s materials', opts, async () => {
  const sales = await call('sales', '/api/inventory/movements', 'POST', { itemId: A, type: 'OUT', quantity: 1 });
  assert.equal(sales.status, 403, 'seeing stock is not changing it');
  assert.equal(await stock(A), 10);

  const id = await placeOrder('sample', 'Peek Co');
  assert.equal((await call('buyer', `/api/orders/${id}/materials`)).status, 403, 'the customer never sees the recipe');
  assert.equal((await call('am', `/api/orders/${id}/materials`)).status, 200, 'the account manager can read it');
  assert.equal((await call('am', `/api/orders/${id}/materials`, 'PUT', { lines: [] })).status, 403, 'but not change it');
});

test('production takes the materials, once, at average cost, and returns what it gives back', opts, async () => {
  const id = await toFactory('Store Co');
  storeOrder = id;

  // The plan, before anything moves: the screen already says what is short.
  let r = await call('factory', `/api/orders/${id}/materials`, 'PUT', { lines: [{ itemId: A, quantity: 4 }, { itemId: B, quantity: 3 }] });
  assert.equal(r.status, 200, JSON.stringify(r.json));
  assert.equal(r.json.consumedAt, null);
  assert.deepEqual(r.json.shortages.map((s: any) => [s.sku, s.needed, s.available]), [['BTL-50', 3, 1]]);
  assert.equal(await stock(A), 10, 'a plan takes nothing');

  // Short of bottles: the factory cannot start, and is told why.
  r = await call('factory', `/api/orders/${id}/transition`, 'POST', { to: 'In Production' });
  assert.equal(r.status, 409);
  assert.equal(r.json.shortages[0].sku, 'BTL-50');
  assert.equal((await db.collection('orders').findOne({ _id: oid(id) }))!.status, 'Queued for Production');
  assert.equal(await stock(A), 10, 'nothing was taken for a start that did not happen');

  // Bottles arrive, paid for. The cost averages in and the purchase is booked.
  r = await call('factory', '/api/inventory/movements', 'POST', {
    itemId: B, type: 'IN', quantity: 5, unitCost: 2.6, vatAmount: 1.95, vendor: 'Glass Ltd', reference: 'PO-77',
  });
  assert.equal(r.status, 201, JSON.stringify(r.json));
  const item = await db.collection('inventoryitems').findOne({ _id: oid(B) });
  assert.equal(item!.currentStock, 6);
  assert.equal(item!.costPerUnit, 2.5, '(1 × 2 + 5 × 2.6) / 6');
  const expense = await db.collection('expenses').findOne({ _id: oid(r.json.expenseId) });
  assert.equal(expense?.amount, 14.95, '5 × 2.6 + VAT');
  assert.equal(expense?.vatAmount, 1.95);
  assert.equal(expense?.vendor, 'Glass Ltd');
  assert.equal(expense?.category, 'packaging', 'a bottle is packaging');

  const free = await call('factory', '/api/inventory/movements', 'POST', { itemId: B, type: 'IN', quantity: 1, unitCost: 2.5, recordExpense: false });
  assert.equal(free.status, 201);
  assert.equal(free.json.expenseId, undefined, 'unticked: no expense');
  await call('factory', '/api/inventory/movements', 'POST', { itemId: B, type: 'ADJUSTMENT', quantity: 6, reason: 'Count' });

  // Now it starts, and the shelves follow.
  await move('factory', id, 'In Production');
  assert.equal(await stock(A), 6);
  assert.equal(await stock(B), 3);
  let order = await db.collection('orders').findOne({ _id: oid(id) });
  assert.ok(order!.materialsConsumedAt);
  assert.equal(order!.materialsCost, 27.5, '4 × 5 + 3 × 2.5');
  const moves = await db.collection('inventorymovements').find({ 'reference.type': 'order', 'reference.id': id }).toArray();
  assert.equal(moves.length, 2);
  assert.ok(moves.every((m) => m.type === 'OUT' && m.createdBy && /Store|ORD|KCC|-/.test(m.reason)), 'each names the order and who did it');

  // A fell to its threshold: the team hears about it.
  assert.ok(await db.collection('notifications').findOne({ type: 'low_stock', 'data.sku': 'GLY-01' }));

  // The customer sees none of it.
  const seen = await call('buyer', `/api/orders/${id}`);
  assert.equal(seen.status, 200);
  for (const k of ['materials', 'materialsCost', 'materialsConsumedAt']) assert.ok(!(k in seen.json), `no ${k} for the customer`);

  // Used one more A and one bottle fewer than planned: only the difference moves.
  r = await call('factory', `/api/orders/${id}/materials`, 'PUT', { lines: [{ itemId: A, quantity: 5 }, { itemId: B, quantity: 2 }] });
  assert.equal(r.status, 200, JSON.stringify(r.json));
  assert.equal(await stock(A), 5);
  assert.equal(await stock(B), 4);
  order = await db.collection('orders').findOne({ _id: oid(id) });
  assert.equal(order!.materialsCost, 30, '5 × 5 + 2 × 2.5');

  // Asking for more than the shelf holds changes nothing at all.
  r = await call('factory', `/api/orders/${id}/materials`, 'PUT', { lines: [{ itemId: A, quantity: 100 }, { itemId: B, quantity: 4 }] });
  assert.equal(r.status, 409);
  assert.equal(await stock(A), 5);
  assert.equal(await stock(B), 4, 'not even the item that was available');
  assert.equal((await db.collection('orders').findOne({ _id: oid(id) }))!.materialsCost, 30);

  // A failed QC sends it back; nothing is taken twice.
  await move('factory', id, 'Quality Check');
  await move('factory', id, 'In Production', { note: 'Viscosity off' });
  assert.equal(await stock(A), 5);
  assert.equal(await stock(B), 4);

  // What it cost shows to those who see money, with the margin.
  r = await call('finance', `/api/orders/${id}/materials`);
  assert.equal(r.status, 200);
  assert.equal(r.json.money.cost, 30);
  assert.equal(r.json.money.margin, null, 'a free sample has no sale to set it against');
  r = await call('factory', `/api/orders/${id}/materials`);
  assert.equal(r.json.money, undefined, 'the factory sees quantities, not money');
  assert.equal(r.json.lines[0].cost, undefined);
});

test('the accounts see what went into orders, and the store sheet names the order', opts, async () => {
  const r = await call('admin', `/api/accounting/summary?from=${today}&to=${today}`);
  assert.equal(r.status, 200);
  assert.equal(r.json.materials.used, 30);
  assert.equal(r.json.materials.onHand, 5 * 5 + 4 * 2.5);

  const sheet = await fetch(`${BASE}/api/export`, {
    method: 'POST', headers: { 'content-type': 'application/json', cookie: as.factory, 'x-forwarded-for': '10.4.9.9' },
    body: JSON.stringify({ what: 'movements' }),
  });
  assert.equal(sheet.status, 200);
  assert.match(sheet.headers.get('content-type') || '', /sheet|excel|octet/);

  const listed = await call('factory', '/api/inventory/movements?limit=100');
  const fromOrder = listed.json.find((m: any) => m.reference?.type === 'order');
  assert.match(fromOrder.orderNumber, /\S/, 'the movement links back to its order');
});

test('a start the shelves stopped covering since the plan takes nothing', opts, async () => {
  const C = await newItem('OIL-02', 2, 1);
  const id = await toFactory('Race Co');
  await call('factory', `/api/orders/${id}/materials`, 'PUT', { lines: [{ itemId: A, quantity: 1 }, { itemId: C, quantity: 2 }] });
  // Someone takes the oil between the plan and the start.
  await call('factory', '/api/inventory/movements', 'POST', { itemId: C, type: 'OUT', quantity: 1, reason: 'Spilled' });
  const r = await call('factory', `/api/orders/${id}/transition`, 'POST', { to: 'In Production' });
  assert.equal(r.status, 409);
  assert.equal(await stock(A), 5, 'A was not taken either');
  assert.equal(await stock(C), 1);
});

test('two people cannot both take the last unit', opts, async () => {
  const D = await newItem('LAST-1', 1, 1);
  const [x, y] = await Promise.all([
    call('factory', '/api/inventory/movements', 'POST', { itemId: D, type: 'OUT', quantity: 1 }),
    call('admin', '/api/inventory/movements', 'POST', { itemId: D, type: 'OUT', quantity: 1 }),
  ]);
  assert.deepEqual([x.status, y.status].sort(), [201, 400]);
  assert.equal(await stock(D), 0);
});

test('an item an order is waiting for cannot be deleted', opts, async () => {
  const E = await newItem('WAIT-1', 3, 1);
  const id = await toFactory('Wait Co');
  await call('factory', `/api/orders/${id}/materials`, 'PUT', { lines: [{ itemId: E, quantity: 1 }] });
  assert.equal((await call('factory', `/api/inventory/${E}`, 'DELETE')).status, 409);
  await call('factory', `/api/orders/${id}/materials`, 'PUT', { lines: [] });
  assert.equal((await call('factory', `/api/inventory/${E}`, 'DELETE')).status, 200);
});

test('starting with no materials listed warns, and adding them later takes them at once', opts, async () => {
  const id = await toFactory('Late Co');
  const r = await call('factory', `/api/orders/${id}/transition`, 'POST', { to: 'In Production' });
  assert.equal(r.status, 200);
  assert.match(r.json.materialsWarning, /no materials/);
  const before = await stock(A);
  const put = await call('factory', `/api/orders/${id}/materials`, 'PUT', { lines: [{ itemId: A, quantity: 2 }] });
  assert.equal(put.status, 200);
  assert.equal(await stock(A), before - 2);
});

test('every change is on the audit trail', opts, async () => {
  await new Promise((r) => setTimeout(r, 300));
  assert.ok(await db.collection('auditlogs').findOne({ entity: 'Order', 'changes.field': /^materials/ }), 'the order\'s materials changes are logged');
  assert.ok(await db.collection('auditlogs').findOne({ entity: 'InventoryMovement', action: 'create' }));
  const named = await db.collection('auditlogs').findOne({ entity: 'Order', 'changes.field': /^materials\.\d+\.itemId$/ });
  const change = named?.changes.find((c: any) => /itemId$/.test(c.field));
  assert.match(change?.toLabel || '', /^Item |^Bottle /, 'the trail names the material, not its id');
  assert.ok(await db.collection('auditlogs').findOne({ entity: 'InventoryItem', entityLabel: 'Item GLY-01' }), 'and names the item itself');

  // An edit that never loaded the materials must not read as having removed them.
  const r = await call('am', `/api/orders/${storeOrder}`, 'PUT', { internalNotes: 'Call before delivery' });
  assert.equal(r.status, 200, JSON.stringify(r.json));
  await new Promise((r) => setTimeout(r, 300));
  const row = await db.collection('auditlogs').find({ entity: 'Order', entityId: storeOrder, action: 'update' }).sort({ _id: -1 }).limit(1).next();
  assert.ok(row?.changes.some((c: any) => c.field === 'internalNotes'));
  assert.ok(!row?.changes.some((c: any) => c.field.startsWith('materials')), JSON.stringify(row?.changes));
});
