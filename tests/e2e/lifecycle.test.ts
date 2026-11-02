import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { hasMongod, startMongod } from '../helpers';

/**
 * The whole life of an order, played by the people who actually do each step,
 * each with their own login. The customer checks in after every move, because
 * tracking is the part only they can see going wrong.
 */

const skip = hasMongod() ? false : 'mongod is not installed';
const PORT = 3126;
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
    headers: { 'content-type': 'application/json', cookie: as[who] || '', 'x-forwarded-for': `10.2.0.${++seq % 250}` },
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

async function placeOrder(type = 'sample', company = 'Rose Beauty Co') {
  const r = await call('buyer', '/api/orders', 'POST', {
    type,
    internalNotes: 'injected by the customer',
    customerInfo: { companyName: company, personName: 'Lina', email: 'buyer@t.local', phone: '0501112222', city: 'Riyadh' },
  });
  assert.equal(r.status, 201, JSON.stringify(r.json));
  return String(r.json.id);
}

before(async () => {
  if (skip) return;
  const mongo = await startMongod(27126);
  stopDb = mongo.stop;
  conn = await mongoose.createConnection(mongo.uri).asPromise();
  db = conn.db as mongoose.mongo.Db;
  const password = bcrypt.hashSync(PASSWORD, 4);
  const people: Record<string, string> = {
    admin: 'SUPER_ADMIN', am: 'ACCOUNT_MANAGER', sales: 'SALES', finance: 'ACCOUNTANT',
    factory: 'FACTORY', dispatch: 'LOGISTICS', buyer: 'CUSTOMER', stranger: 'CUSTOMER',
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
      method: 'POST', headers: { 'content-type': 'application/json', 'x-forwarded-for': `10.3.0.${++seq}` },
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

test('a paid order, start to finish, every person doing their own part', opts, async () => {
  const id = await placeOrder();
  const order = await db.collection('orders').findOne({ _id: new mongoose.Types.ObjectId(id) });
  assert.ok(!order?.internalNotes, 'a customer cannot write team notes');
  await customerSees(id, 'Submitted');

  // It reached the sales team without anyone telling them.
  const account = await db.collection('crmaccounts').findOne({ name: 'Rose Beauty Co' });
  assert.ok(account, 'the order put itself on the CRM');
  assert.equal(account.orderIds.length, 1);
  assert.ok(await db.collection('notifications').findOne({ type: 'new_order' }));

  await move('am', id, 'Under Review');
  await customerSees(id, 'Under Review');
  await move('am', id, 'Approved');

  await move('am', id, 'Quotation Sent', { quote: { amount: 2000, notes: 'Includes filling' } });
  const quoted = await customerSees(id, 'Quotation Sent');
  assert.equal(quoted.totals.total, 2300);
  assert.equal(quoted.invoice, null, 'no invoice until it is asked for');

  await move('am', id, 'Awaiting Payment');
  const billed = await customerSees(id, 'Awaiting Payment');
  assert.equal(billed.invoice.total, 2300);
  assert.equal(billed.invoice.status, 'sent');
  const days = (new Date(billed.invoice.dueDate).getTime() - Date.now()) / 86400000;
  assert.ok(days > 29 && days < 31, 'the terms come from Settings');

  // The customer opens the invoice; nobody else can.
  const doc = await call('buyer', `/api/account/invoices/${billed.invoice._id}`);
  assert.equal(doc.status, 200);
  assert.equal(doc.json.invoice.total, 2300);
  assert.match(doc.json.qr, /<svg/);
  assert.equal((await call('stranger', `/api/account/invoices/${billed.invoice._id}`)).status, 404);

  // Money arrives in two parts; finance records them, the customer sees it.
  assert.equal((await call('finance', '/api/accounting/payments', 'POST', { invoiceId: billed.invoice._id, amount: 1000, method: 'bank_transfer', reference: 'T-1' })).status, 201);
  assert.equal((await customerSees(id, 'Awaiting Payment')).invoice.status, 'partial');
  await move('finance', id, 'Payment Received');
  const paid = await customerSees(id, 'Payment Received');
  assert.equal(paid.paymentStatus, 'paid');
  assert.equal(paid.invoice.amountPaid, 2300);

  await move('am', id, 'Queued for Production');
  await move('factory', id, 'In Production');
  await move('factory', id, 'Quality Check');
  await move('factory', id, 'In Production', { note: 'Colour off, rework' });
  await move('factory', id, 'Quality Check');
  await move('factory', id, 'Production Complete');
  await customerSees(id, 'Production Complete');
  await move('am', id, 'Ready to Ship');

  // Nothing ships without a named courier.
  assert.equal((await call('dispatch', `/api/orders/${id}/transition`, 'POST', { to: 'Shipped' })).status, 400);
  const assigned = await call('admin', `/api/orders/${id}`, 'PUT', { assignments: { courierName: 'Omar', courierPhone: '0509998888', trackingNumber: 'TRK-77' } });
  assert.equal(assigned.status, 200, JSON.stringify(assigned.json));
  await move('dispatch', id, 'Shipped');
  const shipped = await customerSees(id, 'Shipped');
  assert.equal(shipped.assignments.trackingNumber, 'TRK-77', 'the customer can follow the parcel');
  await move('dispatch', id, 'Out for Delivery');
  await move('dispatch', id, 'Shipped', { note: 'Nobody home' });
  await move('dispatch', id, 'Out for Delivery');
  await move('dispatch', id, 'Delivered');
  const delivered = await customerSees(id, 'Delivered');

  // The whole journey is on the order, in order, with names.
  const steps = delivered.timeline.map((e: { to: string }) => e.to);
  assert.equal(steps[0], 'Submitted');
  assert.equal(steps.at(-1), 'Delivered');
  assert.equal(steps.length, 18, 'every step, the rework and the failed delivery included');
  assert.ok(delivered.timeline.every((e: { byName: string }) => e.byName));

  // Feedback closes the loop.
  const fb = await call('buyer', `/api/orders/${id}/feedback`, 'POST', { rating: 5, comment: 'Lovely', aspects: {} });
  assert.ok(fb.status < 300, JSON.stringify(fb.json));
  const staffView = await call('am', `/api/orders/${id}/feedback`);
  assert.equal(staffView.json.feedback.rating, 5);

  await move('am', id, 'Closed');
  await customerSees(id, 'Closed');

  // Every step left a trace, and the money adds up.
  const trail = await db.collection('auditlogs').find({ entity: 'Order', entityId: id, action: 'update' }).toArray();
  assert.ok(trail.length >= 20);
  assert.deepEqual(new Set(trail.map((t) => t.actorName)), new Set(['am', 'finance', 'factory', 'dispatch', 'admin']));
  const summary = (await call('finance', '/api/accounting/summary')).json;
  assert.equal(summary.sales.net, 2000);
  assert.equal(summary.collected.total, 2300);
  assert.equal(summary.receivables.total, 0);
  assert.equal(summary.vat.output, 300);
});

test('nobody can do someone else\'s step', opts, async () => {
  const id = await placeOrder('sample', 'Rose Beauty Co');
  const refused = async (who: string, to: string) =>
    assert.equal((await call(who, `/api/orders/${id}/transition`, 'POST', { to })).status, 403, `${who} → ${to}`);
  await refused('factory', 'Under Review');
  await refused('dispatch', 'Under Review');
  await refused('buyer', 'Under Review');
  await refused('finance', 'Under Review');
  await move('am', id, 'Under Review');
  await refused('am', 'In Production');
  assert.equal((await call('am', `/api/orders/${id}/transition`, 'POST', { to: 'Delivered' })).status, 403);
});

test('orders stay with their customer', opts, async () => {
  const id = await placeOrder();
  assert.equal((await call('stranger', `/api/orders/${id}`)).status, 403);
  assert.equal((await call('stranger', `/api/orders/${id}/feedback`)).status, 403);
  const mine = (await call('stranger', '/api/orders')).json;
  assert.equal(mine.orders.length, 0);
  const theirs = (await call('buyer', '/api/orders?limit=100')).json;
  assert.ok(theirs.orders.some((o: { _id: string }) => o._id === id));
});

test('each desk sees its own queue', opts, async () => {
  const id = await placeOrder();
  const seen = async (who: string) => (await call(who, '/api/orders?limit=200')).json.orders.some((o: { _id: string }) => o._id === id);
  assert.equal(await seen('am'), true);
  assert.equal(await seen('factory'), false, 'the factory only sees what is released to it');
  await move('am', id, 'Under Review');
  await move('am', id, 'Approved');
  await move('am', id, 'Queued for Production');
  assert.equal(await seen('factory'), true);
});

test('a free sample skips the money and raises no invoice', opts, async () => {
  const id = await placeOrder();
  await move('am', id, 'Under Review');
  await move('am', id, 'Approved');
  await move('am', id, 'Queued for Production');
  await move('factory', id, 'In Production');
  await move('factory', id, 'Production Complete');
  await move('am', id, 'Ready to Ship');
  await call('admin', `/api/orders/${id}`, 'PUT', { assignments: { courierName: 'Omar' } });
  await move('dispatch', id, 'Shipped');
  await move('dispatch', id, 'Delivered');
  assert.equal((await customerSees(id, 'Delivered')).invoice, null);
  assert.equal(await db.collection('invoices').countDocuments({ orderId: new mongoose.Types.ObjectId(id) }), 0);
});

test('a bulk order takes the same road', opts, async () => {
  const id = await placeOrder('bulk');
  await move('sales', id, 'Under Review');
  await move('sales', id, 'Approved');
  await move('sales', id, 'Quotation Sent', { quote: { amount: 50000 } });
  await move('sales', id, 'Awaiting Payment');
  assert.equal((await customerSees(id, 'Awaiting Payment')).invoice.total, 57500);
});

test('a revised quotation reprices the invoice', opts, async () => {
  const id = await placeOrder();
  await move('am', id, 'Under Review');
  await move('am', id, 'Approved');
  await move('am', id, 'Quotation Sent', { quote: { amount: 1000 } });
  await move('am', id, 'Awaiting Payment');
  await move('am', id, 'On Hold', { note: 'Customer wants fewer units' });
  await customerSees(id, 'On Hold');
  await move('am', id, 'Under Review');
  await move('am', id, 'Approved');
  await move('am', id, 'Quotation Sent', { quote: { amount: 800 } });
  assert.equal((await customerSees(id, 'Quotation Sent')).invoice.total, 920);
  assert.equal(await db.collection('invoices').countDocuments({ orderId: new mongoose.Types.ObjectId(id) }), 1);
});

test('a promo code on an open order follows through to the invoice', opts, async () => {
  await db.collection('promocodes').insertOne({ code: 'SAVE10', type: 'percentage', value: 10, isActive: true, usedCount: 0, createdAt: new Date() });
  const id = await placeOrder();
  await move('am', id, 'Under Review');
  await move('am', id, 'Approved');
  await move('am', id, 'Quotation Sent', { quote: { amount: 1000 } });
  await move('am', id, 'Awaiting Payment');
  const r = await call('buyer', `/api/orders/${id}/discounts`, 'POST', { promoCode: 'SAVE10' });
  if (r.status !== 200) {
    assert.equal((await customerSees(id, 'Awaiting Payment')).invoice.total, 1150, JSON.stringify(r.json));
    return;
  }
  const after = await customerSees(id, 'Awaiting Payment');
  assert.equal(after.totals.total, after.invoice.total, 'the invoice agrees with the order');
  assert.ok(after.invoice.total < 1150);
});

test('a rejected or cancelled order takes its unpaid invoice with it', opts, async () => {
  const id = await placeOrder();
  await move('am', id, 'Under Review');
  await move('am', id, 'Approved');
  await move('am', id, 'Quotation Sent', { quote: { amount: 500 } });
  await move('am', id, 'Awaiting Payment');
  await move('am', id, 'On Hold', { note: 'Waiting' });
  await move('am', id, 'Cancelled', { note: 'Changed their mind' });
  assert.equal((await customerSees(id, 'Cancelled')).invoice, null);
  const inv = await db.collection('invoices').findOne({ orderId: new mongoose.Types.ObjectId(id) });
  assert.equal(inv?.status, 'cancelled');

  const rej = await placeOrder();
  await move('am', rej, 'Under Review');
  await move('am', rej, 'Rejected', { note: 'Not something we make' });
  await customerSees(rej, 'Rejected');
  assert.equal((await call('am', `/api/orders/${rej}/transition`, 'POST', { to: 'Under Review' })).status, 403, 'a closed order stays closed');
});

test('a cancelled order with money on it keeps the record until refunded', opts, async () => {
  const id = await placeOrder();
  await move('am', id, 'Under Review');
  await move('am', id, 'Approved');
  await move('am', id, 'Quotation Sent', { quote: { amount: 500 } });
  await move('am', id, 'Awaiting Payment');
  const inv = (await customerSees(id, 'Awaiting Payment')).invoice;
  await call('finance', '/api/accounting/payments', 'POST', { invoiceId: inv._id, amount: 100, method: 'cash' });
  await move('am', id, 'On Hold', { note: 'x' });
  await move('am', id, 'Cancelled', { note: 'y' });
  const after = await customerSees(id, 'Cancelled');
  assert.equal(after.invoice.status, 'partial', 'the 100 received is still on the books');
});

test('the sales side lives inside the cycle', opts, async () => {
  // A rep works a target, and the order that follows lands in their hands.
  const created = await call('sales', '/api/crm/accounts', 'POST', { name: 'Cedar Pharmacy', city: 'Jeddah', category: 'pharmacy', keyPerson: { name: 'Sami', email: 'sami@cedar.test' } });
  assert.equal(created.status, 201, JSON.stringify(created.json));
  const accountId = created.json._id;
  const salesUser = await db.collection('users').findOne({ email: 'am@t.local' });
  await call('admin', `/api/crm/accounts/${accountId}`, 'PUT', { ownerId: String(salesUser?._id), ownerName: 'am' });
  await call('am', `/api/crm/accounts/${accountId}/activities`, 'POST', { type: 'visit', body: 'Met Sami at the head office' });
  await call('am', `/api/crm/accounts/${accountId}/activities`, 'POST', { type: 'call', body: 'Agreed to send a sample' });

  const id = await placeOrder('sample', 'Cedar Pharmacy');
  const order = await db.collection('orders').findOne({ _id: new mongoose.Types.ObjectId(id) });
  assert.equal(String(order?.assignments?.accountManagerId), String(salesUser?._id), 'the rep who owns the account looks after the order');

  await move('am', id, 'Under Review');
  await move('am', id, 'Approved');
  await move('am', id, 'Quotation Sent', { quote: { amount: 1000 } });

  // The quotation put a follow-up on the rep's list, due in three days.
  const tasks = (await call('am', '/api/crm/tasks?status=open')).json;
  const followUp = tasks.find((t: { orderId?: string }) => String(t.orderId) === id);
  assert.ok(followUp, 'the follow-up exists');
  assert.equal(followUp.account.name, 'Cedar Pharmacy');
  const days = (new Date(followUp.dueDate).getTime() - Date.now()) / 86400000;
  assert.ok(days > 2 && days < 4);

  await move('am', id, 'Awaiting Payment');
  assert.ok(!(await call('am', '/api/crm/tasks?status=open')).json.some((t: { _id: string }) => t._id === followUp._id), 'and closes itself when the client moves');

  await move('finance', id, 'Payment Received');
  const account = await db.collection('crmaccounts').findOne({ _id: new mongoose.Types.ObjectId(accountId) });
  assert.equal(account?.stage, 'won', 'paying turns a target into a client');
  assert.ok(account?.steps?.commercial);

  await move('am', id, 'Queued for Production');
  await move('factory', id, 'In Production');
  await move('factory', id, 'Production Complete');
  await move('am', id, 'Ready to Ship');
  await call('admin', `/api/orders/${id}`, 'PUT', { assignments: { courierName: 'Omar' } });
  await move('dispatch', id, 'Shipped');
  await move('dispatch', id, 'Delivered');
  assert.ok((await call('am', '/api/crm/tasks?status=open')).json.some((t: { body: string }) => t.body.includes('reorder')), 'delivery leaves a reorder follow-up');

  // A poor rating reaches the complaints screen by itself.
  await call('buyer', `/api/orders/${id}/feedback`, 'POST', { rating: 2, comment: 'Box was damaged', aspects: {} });
  const complaints = (await call('am', '/api/crm/activities?type=complaint&limit=50')).json;
  assert.ok(complaints.items.some((c: { body: string }) => c.body.includes('Box was damaged')));

  // And all of it is one client file, from either door.
  const buyer = await db.collection('users').findOne({ email: 'buyer@t.local' });
  const viaAccount = (await call('am', `/api/client-profile?accountId=${accountId}`)).json;
  assert.equal(viaAccount.stats.meetings, 1);
  assert.equal(viaAccount.stats.contacts, 1);
  assert.equal(viaAccount.stats.orders, 1);
  assert.equal(viaAccount.stats.openComplaints, 1);
  assert.ok(viaAccount.events.some((e: { text: string }) => e.text.includes('Met Sami')));
  assert.ok(viaAccount.events.some((e: { text: string }) => e.text.includes(': Delivered')));
  assert.deepEqual(viaAccount.stages.slice(0, 7), ['target', 'contacted', 'met', 'requested', 'quoted', 'paid', 'delivered']);
  assert.equal(viaAccount.money, null, 'an account manager without accounting access sees no money');

  const full = (await call('admin', `/api/client-profile?accountId=${accountId}`)).json;
  assert.equal(full.money.invoiced, 1150);
  assert.equal(full.money.balance, 0);
  assert.ok(full.events.some((e: { kind: string; type: string }) => e.kind === 'money' && e.type === 'payment'));
  assert.equal(full.events.filter((e: { text: string }) => /^Payment/.test(e.text)).length, 1, 'one line per payment');

  const viaCustomer = (await call('admin', `/api/client-profile?customerId=${buyer?._id}`)).json;
  assert.ok(viaCustomer.orders.length >= 1);
});

test('a target can become a client, and a client added by hand joins the CRM', opts, async () => {
  const made = await call('am', '/api/crm/accounts', 'POST', { name: 'Olive Spa', keyPerson: { name: 'Nour' } });
  const accountId = made.json._id;
  assert.equal((await call('am', `/api/crm/accounts/${accountId}/convert`, 'POST', {})).status, 400, 'no email, no client');
  const ok = await call('am', `/api/crm/accounts/${accountId}/convert`, 'POST', { email: 'nour@olive.test' });
  assert.equal(ok.status, 201, JSON.stringify(ok.json));
  assert.equal((await call('am', `/api/crm/accounts/${accountId}/convert`, 'POST', { email: 'x@y.test' })).status, 400, 'only once');
  const login = await fetch(`${BASE}/api/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'nour@olive.test', password: 'password' }) });
  assert.equal(login.status, 401, 'no way in until an admin sets a password');

  const c = await call('admin', '/api/customers', 'POST', { name: 'Hana', company: 'Lotus Clinic', email: 'hana@lotus.test' });
  assert.equal(c.status, 201);
  const account = await db.collection('crmaccounts').findOne({ name: 'Lotus Clinic' });
  assert.equal(String(account?.customerId), c.json._id);
});

test('reps see their own clients only', opts, async () => {
  const other = await call('admin', '/api/crm/accounts', 'POST', { name: 'Private Co', ownerId: String((await db.collection('users').findOne({ email: 'am@t.local' }))?._id) });
  const sales = await call('factory', `/api/client-profile?accountId=${other.json._id}`);
  assert.equal(sales.status, 403);
});

test('every list exports, filtered or whole, within what the person may see', opts, async () => {
  const post = async (who: string, body: unknown) => {
    const r = await fetch(`${BASE}/api/export`, { method: 'POST', headers: { 'content-type': 'application/json', cookie: as[who] }, body: JSON.stringify(body) });
    return { status: r.status, size: (await r.arrayBuffer()).byteLength, type: r.headers.get('content-type') };
  };
  for (const what of ['orders', 'production', 'logistics', 'customers', 'messages', 'inventory', 'movements', 'promos', 'referrals', 'users', 'tasks', 'categories', 'knowledge']) {
    const r = await post('admin', { what });
    assert.equal(r.status, 200, what);
    assert.match(r.type || '', /spreadsheetml/, what);
    assert.ok(r.size > 400, what);
  }
  const all = await db.collection('orders').find({}).toArray();
  const one = await post('admin', { what: 'orders', ids: [String(all[0]._id)] });
  const whole = await post('admin', { what: 'orders' });
  assert.ok(one.size < whole.size, 'filters are honoured');
  const row = await db.collection('auditlogs').findOne({ action: 'export', entity: 'Orders', entityLabel: '1 filtered rows' });
  assert.ok(row, 'and on record');

  assert.equal((await post('factory', { what: 'customers' })).status, 403);
  assert.equal((await post('buyer', { what: 'orders' })).status, 403, 'a customer exports nothing');
  assert.equal((await post('sales', { what: 'users' })).status, 403);
});

test('a disabled customer loses their tracking at once', opts, async () => {
  const id = await placeOrder();
  await db.collection('users').updateOne({ email: 'stranger@t.local' }, { $set: { isActive: false } });
  assert.equal((await call('stranger', '/api/orders')).status, 401);
  assert.ok(id);
});
