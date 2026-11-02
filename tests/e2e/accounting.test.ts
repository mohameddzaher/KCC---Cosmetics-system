import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { hasMongod, startMongod } from '../helpers';

/** The books against the real build: every path by which money moves. */

const skip = hasMongod() ? false : 'mongod is not installed';
const PORT = 3125;
const BASE = `http://127.0.0.1:${PORT}`;
const PASSWORD = 'Test12345!';
const opts = { skip };

let server: ChildProcess;
let stopDb: () => Promise<void> = async () => {};
let conn: mongoose.Connection;
let db: mongoose.mongo.Db;
let cookie = '';
let salesCookie = '';
let customerId: mongoose.Types.ObjectId;
let seq = 0;

const oid = (s: string) => new mongoose.Types.ObjectId(s);

async function call(path: string, method = 'GET', body?: unknown, as = cookie) {
  const r = await fetch(BASE + path, {
    method,
    headers: { 'content-type': 'application/json', cookie: as, 'x-forwarded-for': `10.1.0.${++seq % 250}` },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: r.status, json: await r.clone().json().catch(() => null) };
}

async function makeOrder(status: string, subtotal = 1000) {
  const n = ++seq;
  const r = await db.collection('orders').insertOne({
    orderNumber: `TST-${n}`, type: 'sample', status, priority: 'normal', userId: customerId,
    totals: { subtotal, discount: 0, tax: subtotal * 0.15, total: subtotal * 1.15 },
    paymentStatus: 'pending', paymentMethod: 'cash', timeline: [], assignments: {},
    customerInfo: { companyName: 'Acme' }, createdAt: new Date(), updatedAt: new Date(),
  });
  return String(r.insertedId);
}

const invoiceOf = (orderId: string) => db.collection('invoices').findOne({ orderId: oid(orderId), status: { $ne: 'cancelled' } });
const orderOf = (orderId: string) => db.collection('orders').findOne({ _id: oid(orderId) });

async function newInvoice(status = 'sent') {
  const orderId = await makeOrder('Approved');
  const r = await call('/api/accounting/invoices', 'POST', { orderId, status });
  assert.equal(r.status, 201, JSON.stringify(r.json));
  return { orderId, id: r.json._id as string };
}

before(async () => {
  if (skip) return;
  const mongo = await startMongod(27125);
  stopDb = mongo.stop;
  conn = await mongoose.createConnection(mongo.uri).asPromise();
  db = conn.db as mongoose.mongo.Db;
  const password = bcrypt.hashSync(PASSWORD, 4);
  const add = (email: string, role: string) => db.collection('users').insertOne({ name: email, email, role, isActive: true, password, createdAt: new Date(), updatedAt: new Date() });
  await add('admin@t.local', 'SUPER_ADMIN');
  await add('sales@t.local', 'SALES');
  customerId = (await add('buyer@t.local', 'CUSTOMER')).insertedId as unknown as mongoose.Types.ObjectId;

  server = spawn('npx', ['next', 'start', '-p', String(PORT)], {
    env: { ...process.env, MONGODB_URI: mongo.uri, NEXTAUTH_SECRET: 'e2e-secret-0123456789012345678901234', NODE_ENV: 'production' },
    stdio: 'ignore', detached: true,
  });
  for (let i = 0; i < 100; i++) {
    if (await fetch(`${BASE}/api/health`).then((r) => r.ok).catch(() => false)) break;
    await new Promise((r) => setTimeout(r, 200));
  }
  const login = async (email: string) => {
    const r = await fetch(`${BASE}/api/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password: PASSWORD }) });
    return r.headers.getSetCookie().map((c) => c.split(';')[0]).join('; ');
  };
  cookie = await login('admin@t.local');
  salesCookie = await login('sales@t.local');
});

after(async () => {
  if (skip) return;
  try { process.kill(-(server.pid as number)); } catch { /* gone */ }
  await new Promise((r) => setTimeout(r, 300));
  await conn.close();
  await stopDb();
});

test('an invoice takes its money from the order, and numbers run in sequence', opts, async () => {
  const a = await newInvoice();
  const b = await newInvoice();
  const inv = await db.collection('invoices').findOne({ _id: oid(a.id) });
  assert.equal(inv?.total, 1150);
  assert.equal(inv?.tax, 150);
  const year = new Date().getFullYear();
  assert.match(inv?.invoiceNumber, new RegExp(`^INV-${year}-\\d{5}$`));
  const second = await db.collection('invoices').findOne({ _id: oid(b.id) });
  assert.equal(Number(second?.invoiceNumber.slice(-5)), Number(inv?.invoiceNumber.slice(-5)) + 1);
});

test('figures sent by the client are not believed', opts, async () => {
  const orderId = await makeOrder('Approved');
  const r = await call('/api/accounting/invoices', 'POST', {
    orderId, status: 'sent', total: 1, tax: 0, subtotal: 1,
    items: [{ description: 'Filling', quantity: 2, unitPrice: 100, total: 1 }],
  });
  assert.equal(r.status, 201);
  assert.equal(r.json.subtotal, 200);
  assert.equal(r.json.tax, 30);
  assert.equal(r.json.total, 230);
});

test('an order cannot be billed twice, and an unpriced one not at all', opts, async () => {
  const { orderId } = await newInvoice();
  assert.equal((await call('/api/accounting/invoices', 'POST', { orderId })).status, 409);
  const free = await makeOrder('Approved', 0);
  assert.equal((await call('/api/accounting/invoices', 'POST', { orderId: free })).status, 400);
});

test('a part payment is a part payment', opts, async () => {
  const { orderId, id } = await newInvoice();
  assert.equal((await call('/api/accounting/payments', 'POST', { invoiceId: id, amount: 500, method: 'cash' })).status, 201);
  let inv = await db.collection('invoices').findOne({ _id: oid(id) });
  assert.equal(inv?.status, 'partial');
  assert.equal(inv?.amountPaid, 500);
  assert.equal((await orderOf(orderId))?.paymentStatus, 'pending');

  assert.equal((await call('/api/accounting/payments', 'POST', { invoiceId: id, amount: 650, method: 'cash' })).status, 201);
  inv = await db.collection('invoices').findOne({ _id: oid(id) });
  assert.equal(inv?.status, 'paid');
  assert.ok(inv?.paidAt);
  assert.equal((await orderOf(orderId))?.paymentStatus, 'paid');
});

test('nobody can pay more than is owed', opts, async () => {
  const { id } = await newInvoice();
  assert.equal((await call('/api/accounting/payments', 'POST', { invoiceId: id, amount: 1150.5, method: 'cash' })).status, 400);
  assert.equal((await call('/api/accounting/payments', 'POST', { invoiceId: id, amount: 0, method: 'cash' })).status, 400);
});

test('a refund reopens the invoice and the order', opts, async () => {
  const { orderId, id } = await newInvoice();
  const p = await call('/api/accounting/payments', 'POST', { invoiceId: id, amount: 1150, method: 'card' });
  assert.equal((await orderOf(orderId))?.paymentStatus, 'paid');
  assert.equal((await call(`/api/accounting/payments/${p.json._id}`, 'PUT', { status: 'refunded' })).status, 200);
  const inv = await db.collection('invoices').findOne({ _id: oid(id) });
  assert.equal(inv?.status, 'sent');
  assert.equal(inv?.amountPaid, 0);
  assert.equal(inv?.paidAt ?? null, null);
  assert.equal((await orderOf(orderId))?.paymentStatus, 'refunded');
});

test('received money cannot be deleted; a pending payment can', opts, async () => {
  const { id } = await newInvoice();
  const got = await call('/api/accounting/payments', 'POST', { invoiceId: id, amount: 100, method: 'cash' });
  assert.equal((await call(`/api/accounting/payments/${got.json._id}`, 'DELETE')).status, 409);
  const wait = await call('/api/accounting/payments', 'POST', { invoiceId: id, amount: 100, method: 'cash', status: 'pending' });
  assert.equal((await db.collection('invoices').findOne({ _id: oid(id) }))?.amountPaid, 100, 'pending is not received');
  assert.equal((await call(`/api/accounting/payments/${wait.json._id}`, 'DELETE')).status, 200);
});

test('confirming a pending payment counts it, within what is owed', opts, async () => {
  const { id } = await newInvoice();
  const a = await call('/api/accounting/payments', 'POST', { invoiceId: id, amount: 1000, method: 'cash', status: 'pending' });
  const b = await call('/api/accounting/payments', 'POST', { invoiceId: id, amount: 1000, method: 'cash', status: 'pending' });
  assert.equal((await call(`/api/accounting/payments/${a.json._id}`, 'PUT', { status: 'completed' })).status, 200);
  assert.equal((await call(`/api/accounting/payments/${b.json._id}`, 'PUT', { status: 'completed' })).status, 400);
});

test('an invoice cannot simply be declared paid', opts, async () => {
  const { id } = await newInvoice();
  assert.equal((await call(`/api/accounting/invoices/${id}`, 'PUT', { status: 'paid' })).status, 400);
  assert.equal((await call(`/api/accounting/invoices/${id}`, 'PUT', { amountPaid: 1150 })).status, 200);
  assert.equal((await db.collection('invoices').findOne({ _id: oid(id) }))?.amountPaid, 0, 'stray fields are ignored');
});

test('issued invoices are cancelled, not erased; drafts can go', opts, async () => {
  const issued = await newInvoice();
  assert.equal((await call(`/api/accounting/invoices/${issued.id}`, 'DELETE')).status, 409);
  assert.equal((await call(`/api/accounting/invoices/${issued.id}`, 'PUT', { status: 'cancelled' })).status, 200);
  assert.equal((await call('/api/accounting/invoices', 'POST', { orderId: issued.orderId })).status, 201, 'the order can be billed again');

  const paid = await newInvoice();
  await call('/api/accounting/payments', 'POST', { invoiceId: paid.id, amount: 10, method: 'cash' });
  assert.equal((await call(`/api/accounting/invoices/${paid.id}`, 'PUT', { status: 'cancelled' })).status, 400);

  const draft = await newInvoice('draft');
  assert.equal((await call(`/api/accounting/invoices/${draft.id}`, 'PUT', { items: [{ description: 'New', quantity: 1, unitPrice: 200 }] })).status, 200);
  assert.equal((await db.collection('invoices').findOne({ _id: oid(draft.id) }))?.total, 230);
  assert.equal((await call(`/api/accounting/invoices/${draft.id}`, 'DELETE')).status, 200);
});

test('an order awaiting payment gets its invoice by itself', opts, async () => {
  const orderId = await makeOrder('Quotation Sent');
  assert.equal((await call(`/api/orders/${orderId}/transition`, 'POST', { to: 'Awaiting Payment' })).status, 200);
  const inv = await invoiceOf(orderId);
  assert.equal(inv?.status, 'sent');
  assert.equal(inv?.total, 1150);
});

test('confirming payment on the order puts the money in the books', opts, async () => {
  const orderId = await makeOrder('Quotation Sent');
  await call(`/api/orders/${orderId}/transition`, 'POST', { to: 'Awaiting Payment' });
  const r = await call(`/api/orders/${orderId}/transition`, 'POST', { to: 'Payment Received' });
  assert.equal(r.status, 200, JSON.stringify(r.json));
  const inv = await invoiceOf(orderId);
  assert.equal(inv?.status, 'paid');
  assert.equal(await db.collection('payments').countDocuments({ invoiceId: inv?._id, status: 'completed' }), 1);
  assert.equal((await orderOf(orderId))?.paymentStatus, 'paid');
});

test('a part already paid is not taken twice when the order is confirmed', opts, async () => {
  const orderId = await makeOrder('Quotation Sent');
  await call(`/api/orders/${orderId}/transition`, 'POST', { to: 'Awaiting Payment' });
  const inv = await invoiceOf(orderId);
  await call('/api/accounting/payments', 'POST', { invoiceId: inv?._id, amount: 150, method: 'card' });
  await call(`/api/orders/${orderId}/transition`, 'POST', { to: 'Payment Received' });
  const pays = await db.collection('payments').find({ invoiceId: inv?._id }).toArray();
  assert.deepEqual(pays.map((p) => p.amount).sort((a, b) => a - b), [150, 1000]);
});

test('with an invoice, the order cannot be marked paid by hand', opts, async () => {
  const { orderId } = await newInvoice();
  await call(`/api/orders/${orderId}`, 'PUT', { paymentStatus: 'paid' });
  assert.equal((await orderOf(orderId))?.paymentStatus, 'pending');
  const free = await makeOrder('Approved', 0);
  await call(`/api/orders/${free}`, 'PUT', { paymentStatus: 'paid' });
  assert.equal((await orderOf(free))?.paymentStatus, 'paid', 'an order with no invoice keeps working as it did');
});

test('the order shows its invoice', opts, async () => {
  const { orderId, id } = await newInvoice();
  const r = await call(`/api/orders/${orderId}`);
  assert.equal(r.json.invoice._id, id);
  assert.equal(r.json.invoice.total, 1150);
  assert.ok(Array.isArray(r.json.timeline), 'the order itself is still all there');
});

test('a free order passes through without an invoice', opts, async () => {
  const orderId = await makeOrder('Quotation Sent', 0);
  assert.equal((await call(`/api/orders/${orderId}/transition`, 'POST', { to: 'Awaiting Payment' })).status, 200);
  assert.equal(await invoiceOf(orderId), null);
});

test('the reports add up', opts, async () => {
  await db.collection('invoices').deleteMany({});
  await db.collection('payments').deleteMany({});
  await db.collection('orders').deleteMany({ status: 'Approved' });
  const { id } = await newInvoice();
  await call('/api/accounting/payments', 'POST', { invoiceId: id, amount: 575, method: 'cash' });
  assert.equal((await call('/api/accounting/expenses', 'POST', { category: 'packaging', amount: 230, vatAmount: 30, description: { en: 'Boxes' } })).status, 201);

  const s = (await call('/api/accounting/summary')).json;
  assert.equal(s.sales.net, 1000);
  assert.equal(s.collected.total, 575);
  assert.equal(s.expenses.net, 200);
  assert.equal(s.profit.earned, 800, 'sales less costs, VAT out of both');
  assert.equal(s.profit.cash, 345);
  assert.equal(s.vat.due, 120, '150 charged less 30 paid');
  assert.equal(s.receivables.total, 575);
  assert.equal(s.byCategory[0].key, 'packaging');
  assert.equal(s.months[11].sales, 1000);

  const r = (await call('/api/accounting/receivables')).json;
  assert.equal(r.customers[0].balance, 575);
  assert.equal(r.buckets.current, 575);
});

test('overdue is found by date', opts, async () => {
  const { id } = await newInvoice();
  await call(`/api/accounting/invoices/${id}`, 'PUT', { dueDate: '2020-01-01' });
  const list = (await call('/api/accounting/invoices?status=overdue')).json;
  assert.ok(list.some((i: { _id: string }) => i._id === id));
  const r = (await call('/api/accounting/receivables')).json;
  assert.ok(r.buckets.d90plus >= 1150);
});

test('workbooks open, and each export is on record', opts, async () => {
  for (const what of ['invoices', 'payments', 'expenses', 'receivables', 'report']) {
    const r = await fetch(`${BASE}/api/accounting/export?what=${what}`, { headers: { cookie } });
    assert.equal(r.status, 200, what);
    assert.match(r.headers.get('content-type') || '', /spreadsheetml/);
    assert.ok((await r.arrayBuffer()).byteLength > 500);
  }
  assert.equal(await db.collection('auditlogs').countDocuments({ action: 'export', entity: 'AccountingReport' }), 5);
});

test('every money move reaches the audit log with its subjects', opts, async () => {
  const { id } = await newInvoice();
  const p = await call('/api/accounting/payments', 'POST', { invoiceId: id, amount: 50, method: 'cash' });
  const row = await db.collection('auditlogs').findOne({ entity: 'Payment', entityId: p.json._id, action: 'create' });
  assert.ok(row?.subjects.some((s: { model: string }) => s.model === 'Invoice'));
  assert.ok(await db.collection('auditlogs').findOne({ requestId: row?.requestId, entity: 'Invoice', action: 'update' }), 'the settled invoice is part of the same action');
});

test('the accounts are closed to those without the permission', opts, async () => {
  for (const path of ['/api/accounting/summary', '/api/accounting/receivables', '/api/accounting/invoices', '/api/accounting/export']) {
    assert.equal((await call(path, 'GET', undefined, salesCookie)).status, 403, path);
  }
  assert.equal((await call('/api/accounting/payments', 'POST', {}, salesCookie)).status, 403);
});

test('search finds across the system, within what each person may see', opts, async () => {
  const { id } = await newInvoice();
  const number = (await db.collection('invoices').findOne({ _id: oid(id) }))?.invoiceNumber;
  const mine = await call(`/api/search?q=${number}`);
  assert.equal(mine.json.hits[0].href, `/admin/accounting/invoices/${id}`);
  const theirs = await call(`/api/search?q=${number}`, 'GET', undefined, salesCookie);
  assert.equal(theirs.json.hits.length, 0);
  assert.equal((await call('/api/search?q=TST', 'GET', undefined, '')).status, 401);
  assert.ok((await call('/api/search?q=buyer')).json.hits.some((h: { type: string }) => h.type === 'customer'));
});

test('people who assign work can read the team, not the user records', opts, async () => {
  const r = await call('/api/users/directory', 'GET', undefined, salesCookie);
  assert.equal(r.status, 200);
  assert.ok(r.json.length >= 2);
  assert.ok(!('email' in r.json[0]) && !('password' in r.json[0]));
});
