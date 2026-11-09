import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { hasMongod, startMongod } from '../helpers';
import { startMockSmtp } from '../mockSmtp';
import { buildOrderPayload } from '../../src/lib/sample-quiz/payload';
import type { QuizState } from '../../src/lib/sample-quiz/types';
import { can, ROLES } from '../../src/lib/roles';

/**
 * The whole business, as the people who run it would run it, through the real
 * API: a quiz submission, both roads an order can take, every side exit, the
 * store, the CRM, the mail that goes out, and then every role trying every move.
 *
 * The permission table below is written out by hand from docs/WORKFLOW.md §6
 * rather than read from src/lib/orderWorkflow.ts: a test that asks the code what
 * the code allows would pass whatever the code said.
 */

const skip = hasMongod() ? false : 'mongod is not installed';
const PORT = 3129;
const BASE = `http://127.0.0.1:${PORT}`;
const PASSWORD = 'Test12345!';
const opts = { skip };

let server: ChildProcess;
let stopDb: () => Promise<void> = async () => {};
let smtp: Awaited<ReturnType<typeof startMockSmtp>>;
let conn: mongoose.Connection;
let db: mongoose.mongo.Db;
const as: Record<string, string> = {};
const ids: Record<string, mongoose.Types.ObjectId> = {};
let seq = 0;
const oid = (id: string) => new mongoose.Types.ObjectId(id);

/** One login per role, named after it, plus a second customer. */
const PEOPLE: Record<string, string> = Object.fromEntries(ROLES.map((r) => [r.toLowerCase(), r]));
PEOPLE.other_customer = 'CUSTOMER';

async function call(who: string | null, path: string, method = 'GET', body?: unknown) {
  const r = await fetch(BASE + path, {
    method,
    headers: { 'content-type': 'application/json', cookie: who ? as[who] || '' : '', 'x-forwarded-for': `10.8.${(++seq >> 8) % 250}.${seq % 250}` },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: r.status, json: await r.clone().json().catch(() => null) };
}

async function move(who: string, id: string, to: string, extra: Record<string, unknown> = {}) {
  const r = await call(who, `/api/orders/${id}/transition`, 'POST', { to, ...extra });
  assert.equal(r.status, 200, `${who} → ${to}: ${JSON.stringify(r.json)}`);
  return r.json;
}

const order = async (id: string) => (await db.collection('orders').findOne({ _id: oid(id) }))!;

async function customerSees(id: string, status: string, who = 'customer') {
  const r = await call(who, `/api/orders/${id}`);
  assert.equal(r.status, 200);
  assert.equal(r.json.status, status, `the customer sees "${status}"`);
  for (const k of ['internalNotes', 'materials', 'materialsCost']) assert.ok(!(k in r.json), `never ${k}`);
  return r.json;
}

/** A quiz as a customer would fill it, category-scoped or general. */
function quizState(scoped: boolean): QuizState {
  return {
    phase: 'review',
    customerName: 'Lina',
    briefAnswers: {
      mainConcerns: ['hydration', 'glow'],
      preferredTexture: 'light-cream',
      marketingClaims: ['paraben-free', 'vegan'],
      heroIngredient: { ingredients: ['niacinamide'], excludedIngredients: 'alcohol, fragrance' },
      referenceImages: ['https://res.cloudinary.com/demo/image/upload/ref.jpg'],
    },
    categoryAnswers: scoped ? { 'main:skinType': 'dry', 'product:spf': 'none' } : {},
    questionNotes: { mainConcerns: 'Mostly for winter' },
    category: scoped
      ? { mainSlug: 'skin-care', mainName: 'Skin Care', subSlug: 'face', subName: 'Face', productKey: 'skin-care__face__moisturizer', itemName: 'Moisturizer' }
      : {},
    specs: scoped ? { 'oils-extracts': { selected: ['argan'] } } : {},
    fragrance: { family: 'floral', notes: ['rose'], intensity: 'subtle' },
    packaging: { bottle: 'airless-50', cap: 'pump', label: 'matte', finish: 'frosted', color: 'white' },
    email: 'customer@t.local',
    promoCode: '',
    promoApplied: null,
    submitted: null,
  } as unknown as QuizState;
}

before(async () => {
  if (skip) return;
  const mongo = await startMongod(27129);
  stopDb = mongo.stop;
  smtp = await startMockSmtp(2529);
  conn = await mongoose.createConnection(mongo.uri).asPromise();
  db = conn.db as mongoose.mongo.Db;
  const password = bcrypt.hashSync(PASSWORD, 4);
  for (const [k, role] of Object.entries(PEOPLE)) {
    ids[k] = new mongoose.Types.ObjectId();
    await db.collection('users').insertOne({
      _id: ids[k], name: k, email: `${k}@t.local`, role, isActive: true, password,
      ...(role === 'CUSTOMER' ? { company: k === 'customer' ? 'Lina Cosmetics' : 'Other Co', referralCode: k === 'other_customer' ? 'OTHER1' : undefined } : {}),
      createdAt: new Date(), updatedAt: new Date(),
    });
  }
  await db.collection('sitesettings').insertOne({
    key: 'main',
    general: { companyName: { en: 'KCC', ar: 'كي سي سي' }, vatNumber: '300000000000003', crNumber: '1010101010', paymentTermsDays: 14 },
    notifications: { recipientEmails: 'team@t.local', emailNewOrder: true, emailOrderStatusChange: true, emailLowStock: true, emailPaymentReceived: true },
  });
  await db.collection('promocodes').insertOne({
    code: 'WELCOME10', type: 'percentage', value: 10, isActive: true, usageLimit: 100, usedCount: 0,
    perUserLimit: 5, minOrderAmount: 0, expiresAt: new Date(Date.now() + 30 * 86400000), createdAt: new Date(), updatedAt: new Date(),
  });

  server = spawn('npx', ['next', 'start', '-p', String(PORT)], {
    env: { ...process.env, ...smtp.env, MONGODB_URI: mongo.uri, NEXTAUTH_SECRET: 'e2e-secret-0123456789012345678901234', NODE_ENV: 'production' },
    stdio: 'ignore', detached: true,
  });
  for (let i = 0; i < 100; i++) {
    if (await fetch(`${BASE}/api/health`).then((r) => r.ok).catch(() => false)) break;
    await new Promise((r) => setTimeout(r, 200));
  }
  for (const k of Object.keys(PEOPLE)) {
    const r = await fetch(`${BASE}/api/auth/login`, {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-forwarded-for': `10.9.${++seq % 250}.1` },
      body: JSON.stringify({ email: `${k}@t.local`, password: PASSWORD }),
    });
    assert.equal(r.status, 200, `login ${k}`);
    as[k] = r.headers.getSetCookie().map((c) => c.split(';')[0]).join('; ');
  }
});

after(async () => {
  if (skip) return;
  try { process.kill(-(server.pid as number)); } catch { /* gone */ }
  await new Promise((r) => setTimeout(r, 300));
  await conn.close();
  await smtp.stop();
  await stopDb();
});

async function sample(scoped = true, who = 'customer', extra: Record<string, unknown> = {}) {
  const payload = buildOrderPayload(quizState(scoped), { name: 'Lina', email: `${who}@t.local`, phone: '0501112222', company: who === 'customer' ? 'Lina Cosmetics' : 'Other Co' });
  const r = await call(who, '/api/orders', 'POST', { ...payload, ...extra });
  assert.equal(r.status, 201, JSON.stringify(r.json));
  return String(r.json.id);
}

/* ------------------------------------------------------------------ */
/* A. The sample request                                               */
/* ------------------------------------------------------------------ */

test('A. a quiz submission arrives whole, priced by nobody, on the team\'s desk', opts, async () => {
  const id = await sample(true, 'customer', { promoCode: 'WELCOME10' });
  const o = await order(id);
  assert.equal(o.status, 'Submitted');
  assert.equal(o.type, 'sample');
  assert.equal(o.timeline.length, 1);
  assert.equal(o.timeline[0].to, 'Submitted');
  assert.equal(o.timeline[0].byName, 'customer');
  assert.equal(o.surveyData.quizVersion, 'v2');
  assert.equal(o.surveyData.category.productKey, 'skin-care__face__moisturizer');
  assert.deepEqual(o.surveyData.brief.mainConcerns, ['hydration', 'glow']);
  assert.deepEqual(o.surveyData.categoryAnswers, { 'main:skinType': 'dry', 'product:spf': 'none' });
  assert.equal(o.surveyData.questionNotes.mainConcerns, 'Mostly for winter');
  assert.equal(o.surveyData.fragrance.family, 'floral');
  assert.equal(o.surveyData.packaging.bottle, 'airless-50');
  assert.deepEqual(o.surveyData.brief.referenceImages, ['https://res.cloudinary.com/demo/image/upload/ref.jpg'], 'the attachment came with it');
  assert.deepEqual(o.surveyData.mustAvoidIngredients, ['alcohol', 'fragrance']);
  assert.equal(o.surveyData.parabenFree, true);
  assert.equal(o.totals.total, 0, 'a sample is priced by the team, never by the form');
  assert.ok(o.promoCodeId, 'the code is held for the quotation');

  // A general path (no category) is a valid request too.
  const general = await order(await sample(false));
  assert.ok(!general.surveyData.category?.productKey, 'no category chosen');
  assert.equal(general.surveyData.productType, 'other');

  // The team hears about it: a bell, and a mail.
  assert.ok(await db.collection('notifications').findOne({ type: 'new_order', 'data.orderId': oid(id) }));
  const mail = await smtp.waitFor((m) => m.subject.includes(o.orderNumber) && m.to.includes('team@t.local'));
  assert.ok(mail, `the new-order mail went to the team; got: ${JSON.stringify(smtp.mails.map((m) => [m.subject, m.to]))}`);

  // The customer cannot set what only the team sets.
  const forged = await call('customer', '/api/orders', 'POST', { ...buildOrderPayload(quizState(true), { name: 'L', email: 'customer@t.local' }), status: 'Approved', internalNotes: 'x', totals: { subtotal: -5, tax: -1 } });
  assert.equal(forged.status, 201);
  const f = await order(forged.json.id);
  assert.equal(f.status, 'Submitted');
  assert.equal(f.internalNotes, '');
  assert.equal(f.totals.subtotal, 0);
});

test('A. nobody signed out can place a request', opts, async () => {
  const r = await call(null, '/api/orders', 'POST', buildOrderPayload(quizState(true), { name: 'x', email: 'x@x.com' }));
  assert.equal(r.status, 401);
});

/* ------------------------------------------------------------------ */
/* B. The free sample, every turn of it                                */
/* ------------------------------------------------------------------ */

test('B. a free sample goes all the way, with a failed QC and a failed delivery', opts, async () => {
  const id = await sample();
  await move('account_manager', id, 'Under Review');
  await customerSees(id, 'Under Review');
  await move('account_manager', id, 'Approved');
  await move('account_manager', id, 'Queued for Production');
  assert.equal(await db.collection('invoices').countDocuments({ orderId: oid(id) }), 0, 'no bill for a free sample');

  await move('factory', id, 'In Production');
  await move('factory', id, 'Quality Check');
  // A failed QC needs its reason.
  assert.equal((await call('factory', `/api/orders/${id}/transition`, 'POST', { to: 'In Production' })).status, 400);
  await move('factory', id, 'In Production', { note: 'Texture grainy' });
  await move('factory', id, 'Quality Check');
  await move('factory', id, 'Production Complete');
  await move('account_manager', id, 'Ready to Ship');

  // No courier, no shipping.
  const blocked = await call('logistics', `/api/orders/${id}/transition`, 'POST', { to: 'Shipped' });
  assert.equal(blocked.status, 400);
  assert.equal((await order(id)).status, 'Ready to Ship');
  assert.equal((await call('account_manager', `/api/orders/${id}`, 'PUT', { assignments: { courierName: 'Omar', courierPhone: '0509998888', trackingNumber: 'TRK-1' } })).status, 200);
  await move('logistics', id, 'Shipped');
  await move('logistics', id, 'Out for Delivery');
  assert.equal((await call('logistics', `/api/orders/${id}/transition`, 'POST', { to: 'Shipped' })).status, 400, 'a failed attempt needs a reason');
  await move('logistics', id, 'Shipped', { note: 'Nobody at the address' });
  await move('logistics', id, 'Out for Delivery');
  await move('logistics', id, 'Delivered');

  // Feedback before delivery is refused; after, it lands.
  const fb = await call('customer', `/api/orders/${id}/feedback`, 'POST', { rating: 4, comment: 'Good', aspects: {}, wouldReorder: true });
  assert.ok(fb.status < 300, JSON.stringify(fb.json));
  await move('account_manager', id, 'Closed');
  const done = await customerSees(id, 'Closed');
  assert.deepEqual(
    done.timeline.map((e: { to: string }) => e.to),
    ['Submitted', 'Under Review', 'Approved', 'Queued for Production', 'In Production', 'Quality Check', 'In Production',
      'Quality Check', 'Production Complete', 'Ready to Ship', 'Shipped', 'Out for Delivery', 'Shipped', 'Out for Delivery', 'Delivered', 'Closed']
  );
  const reasons = done.timeline.filter((e: { note?: string }) => e.note).map((e: { note: string }) => e.note);
  assert.deepEqual(reasons, ['Texture grainy', 'Nobody at the address']);
  assert.equal(done.assignments.trackingNumber, 'TRK-1');

  // Each move told the team by mail, and each is a readable line in the log.
  assert.ok(await smtp.waitFor((m) => m.subject.includes('→ Delivered')));
  await new Promise((r) => setTimeout(r, 300));
  const rows = await db.collection('auditlogs').find({ entity: 'Order', entityId: id, action: 'update' }).toArray();
  assert.ok(rows.length >= 15);
  assert.ok(rows.every((r) => r.actorName && r.changes?.length), 'each says who and what changed');
});

test('B. feedback before delivery is refused, and only the owner gives it', opts, async () => {
  const id = await sample();
  assert.notEqual((await call('customer', `/api/orders/${id}/feedback`, 'POST', { rating: 5 })).status, 201);
  assert.equal((await call('other_customer', `/api/orders/${id}/feedback`, 'POST', { rating: 1 })).status, 403);
});

/* ------------------------------------------------------------------ */
/* C. The paid order, and the mail and money behind it                */
/* ------------------------------------------------------------------ */

test('C. a paid bulk order: the price mail, the invoice and its QR, the VAT', opts, async () => {
  const r = await call('customer', '/api/orders', 'POST', {
    type: 'bulk', surveyData: { productType: 'serum', size: '30ml' }, bulkDetails: { quantity: 5000 },
    customerInfo: { companyName: 'Lina Cosmetics', personName: 'Lina', email: 'customer@t.local', phone: '0501112222' },
  });
  assert.equal(r.status, 201);
  const id = String(r.json.id);
  await move('sales', id, 'Under Review');
  await move('sales', id, 'Approved');
  // A quotation with no price is refused.
  assert.equal((await call('sales', `/api/orders/${id}/transition`, 'POST', { to: 'Quotation Sent', quote: { amount: 0 } })).status, 400);
  await move('sales', id, 'Quotation Sent', { quote: { amount: 10000, notes: 'Filling and labels' } });

  const o = await order(id);
  const priceMail = await smtp.waitFor((m) => m.to.includes('customer@t.local') && m.subject.includes(o.orderNumber));
  assert.ok(priceMail, 'the customer got their price by mail');
  assert.match(priceMail!.raw.replace(/=\r\n/g, ''), /11,500|11500/, 'with the total, VAT included');

  await move('sales', id, 'Awaiting Payment');
  const inv = await db.collection('invoices').findOne({ orderId: oid(id) });
  assert.ok(inv);
  assert.equal(inv!.subtotal, 10000);
  assert.equal(inv!.tax, 1500);
  assert.equal(inv!.total, 11500);
  assert.match(inv!.invoiceNumber, /^INV-\d{4}-\d{5}$/);

  // The customer's copy carries a ZATCA QR naming the seller and the VAT.
  const copy = await call('customer', `/api/account/invoices/${inv!._id}`);
  assert.equal(copy.status, 200);
  assert.match(copy.json.qr, /<svg/);
  assert.equal(copy.json.seller.vatNumber, '300000000000003');
  assert.equal(copy.json.seller.crNumber, '1010101010');
  assert.equal((await call('other_customer', `/api/account/invoices/${inv!._id}`)).status, 404, 'nobody else\'s');

  // Only finance (or the account manager) confirms the money.
  assert.equal((await call('sales', `/api/orders/${id}/transition`, 'POST', { to: 'Payment Received' })).status, 403);
  await move('accountant', id, 'Payment Received');
  const paid = await db.collection('invoices').findOne({ _id: inv!._id });
  assert.equal(paid!.status, 'paid');
  assert.equal(paid!.amountPaid, 11500);
  assert.equal(await db.collection('payments').countDocuments({ invoiceId: inv!._id, status: 'completed' }), 1);
  assert.equal((await order(id)).paymentStatus, 'paid');

  for (const [who, to] of [['sales', 'Queued for Production'], ['factory', 'In Production'], ['factory', 'Production Complete'], ['sales', 'Ready to Ship']] as const) await move(who, id, to);
  await call('account_manager', `/api/orders/${id}`, 'PUT', { assignments: { courierName: 'Aramex' } });
  for (const to of ['Shipped', 'Delivered']) await move('logistics', id, to);
  await move('sales', id, 'Closed');
  await customerSees(id, 'Closed');

  const summary = (await call('accountant', '/api/accounting/summary')).json;
  assert.ok(summary.vat.output >= 1500, 'the VAT is in the report');
});

/* ------------------------------------------------------------------ */
/* D. From a sample to a bulk order                                    */
/* ------------------------------------------------------------------ */

test('D. a bulk order made from a sample keeps the link, and only to the customer\'s own sample', opts, async () => {
  const sampleId = await sample();
  const s = await order(sampleId);
  const bulk = await call('customer', '/api/orders', 'POST', {
    type: 'bulk', surveyData: s.surveyData, bulkDetails: { quantity: 1000 }, convertedFromSample: sampleId,
    customerInfo: s.customerInfo,
  });
  assert.equal(bulk.status, 201);
  const view = await call('customer', `/api/orders/${bulk.json.id}`);
  assert.equal(view.json.convertedFromSample.orderNumber, s.orderNumber, 'the bulk order names its sample');
  assert.deepEqual(view.json.surveyData.packaging, s.surveyData.packaging, 'the brief came across, nothing re-asked');

  // Both sit on the same client file and the same CRM account.
  const account = await db.collection('crmaccounts').findOne({ orderIds: oid(sampleId) });
  assert.ok(account!.orderIds.map(String).includes(String(bulk.json.id)));

  // Someone else's sample cannot be claimed (or read through the link).
  const theirs = await sample(true, 'other_customer');
  const stolen = await call('customer', '/api/orders', 'POST', { type: 'bulk', convertedFromSample: theirs, customerInfo: s.customerInfo });
  assert.equal(stolen.status, 201);
  const stolenView = await call('customer', `/api/orders/${stolen.json.id}`);
  assert.ok(!stolenView.json.convertedFromSample, 'the link to another customer\'s sample is dropped');
});

/* ------------------------------------------------------------------ */
/* E. Every side exit, from everywhere it is allowed, with its reason  */
/* ------------------------------------------------------------------ */

const EXITS: Array<[string, string]> = [
  ['Submitted', 'Cancelled'], ['Under Review', 'Rejected'], ['Under Review', 'On Hold'],
  ['Approved', 'On Hold'], ['Quotation Sent', 'Cancelled'], ['Awaiting Payment', 'On Hold'],
  ['Queued for Production', 'On Hold'], ['On Hold', 'Cancelled'],
];

test('E. hold, reject and cancel need a reason, from every stage that allows them', opts, async () => {
  for (const [from, to] of EXITS) {
    const id = await sample();
    await db.collection('orders').updateOne({ _id: oid(id) }, { $set: { status: from } });
    const bare = await call('admin', `/api/orders/${id}/transition`, 'POST', { to });
    assert.equal(bare.status, 400, `${from} → ${to} without a reason`);
    assert.equal((await order(id)).status, from);
    await move('admin', id, to, { note: `Reason for ${to}` });
    const o = await order(id);
    assert.equal(o.status, to);
    assert.equal(o.timeline.at(-1).note, `Reason for ${to}`);
  }
});

test('E. a held order resumes, and a closed, rejected or cancelled one goes nowhere', opts, async () => {
  const id = await sample();
  await move('account_manager', id, 'Under Review');
  await move('account_manager', id, 'On Hold', { note: 'Waiting for the artwork' });
  await move('account_manager', id, 'Under Review');
  assert.equal((await order(id)).status, 'Under Review');
  for (const end of ['Closed', 'Rejected', 'Cancelled']) {
    await db.collection('orders').updateOne({ _id: oid(id) }, { $set: { status: end } });
    for (const to of ['Under Review', 'Approved', 'Submitted']) {
      assert.equal((await call('admin', `/api/orders/${id}/transition`, 'POST', { to, note: 'x' })).status, 403, `${end} → ${to}`);
    }
  }
});

/* ------------------------------------------------------------------ */
/* F. The store                                                        */
/* ------------------------------------------------------------------ */

test('F. a cancelled order that never started leaves the store as it was', opts, async () => {
  const item = await call('factory', '/api/inventory', 'POST', { sku: 'J-GLY', name: { en: 'Glycerin', ar: 'جلسرين' }, unit: 'kg', currentStock: 10, costPerUnit: 4 });
  const id = await sample();
  for (const to of ['Under Review', 'Approved', 'Queued for Production']) await move('account_manager', id, to);
  assert.equal((await call('factory', `/api/orders/${id}/materials`, 'PUT', { lines: [{ itemId: item.json._id, quantity: 3 }] })).status, 200);
  await move('factory', id, 'On Hold', { note: 'Client paused' });
  await move('account_manager', id, 'Cancelled', { note: 'Client withdrew' });
  const stock = await db.collection('inventoryitems').findOne({ _id: oid(item.json._id) });
  assert.equal(stock!.currentStock, 10, 'nothing was taken for a job that never ran');
  assert.equal(await db.collection('inventorymovements').countDocuments({ 'reference.id': id }), 0);
});

test('F. production that cannot be covered does not start, and the factory is told what is missing', opts, async () => {
  const item = await call('factory', '/api/inventory', 'POST', { sku: 'J-OIL', name: { en: 'Argan oil', ar: 'زيت أرغان' }, unit: 'kg', currentStock: 1, costPerUnit: 50 });
  const id = await sample();
  for (const to of ['Under Review', 'Approved', 'Queued for Production']) await move('account_manager', id, to);
  await call('factory', `/api/orders/${id}/materials`, 'PUT', { lines: [{ itemId: item.json._id, quantity: 2 }] });
  const r = await call('factory', `/api/orders/${id}/transition`, 'POST', { to: 'In Production' });
  assert.equal(r.status, 409);
  assert.equal(r.json.shortages[0].sku, 'J-OIL');
  assert.equal((await order(id)).status, 'Queued for Production');
});

/* ------------------------------------------------------------------ */
/* G. The CRM                                                          */
/* ------------------------------------------------------------------ */

test('G. an order puts the client on the CRM; the first visit makes a target current; the KPIs count it', opts, async () => {
  const r = await call('other_customer', '/api/orders', 'POST', {
    type: 'sample', surveyData: {}, customerInfo: { companyName: 'Fresh Brand KSA', personName: 'Sara', email: 'other_customer@t.local', city: 'Jeddah' },
  });
  assert.equal(r.status, 201);
  const ordered = await db.collection('crmaccounts').findOne({ orderIds: oid(r.json.id) });
  assert.ok(ordered, 'the client is on the CRM');
  // The order is logged on the account as a sample request, which is already
  // an action: a client who asked for something is a current client.
  assert.equal(ordered!.stage, 'current');
  assert.ok(await db.collection('crmactivities').findOne({ accountId: ordered!._id, type: 'sample_request' }));

  // A target nobody has spoken to yet is upcoming until the first visit.
  const created = await call('sales', '/api/crm/accounts', 'POST', { name: 'Target Beauty Co', category: 'local-brand', city: 'Riyadh' });
  assert.equal(created.status, 201, JSON.stringify(created.json));
  const account = await db.collection('crmaccounts').findOne({ name: 'Target Beauty Co' });
  assert.equal(account!.stage, 'upcoming');

  const visit = await call('sales', `/api/crm/accounts/${account!._id}/activities`, 'POST', { type: 'visit', body: 'Met the founder' });
  assert.equal(visit.status, 201, JSON.stringify(visit.json));
  const after = await db.collection('crmaccounts').findOne({ _id: account!._id });
  assert.equal(after!.stage, 'current');
  assert.equal(String(after!.ownerId), String(ids.sales), 'the rep who went owns it');

  const kpi = await call('admin', '/api/crm/kpis?period=day');
  const rep = kpi.json.people.find((p: { name: string }) => p.name === 'sales');
  assert.equal(rep.visits, 1);
  assert.equal(rep.accountsSeen, 1);
});

/* ------------------------------------------------------------------ */
/* The permission matrix                                               */
/* ------------------------------------------------------------------ */

const AM = ['ACCOUNT_MANAGER', 'SALES'];
/** Every move in docs/WORKFLOW.md §6, and who besides the admins may make it. */
const MATRIX: Array<{ from: string; to: string; roles: string[]; note?: boolean; quote?: boolean; courier?: boolean }> = [
  { from: 'Submitted', to: 'Under Review', roles: AM },
  { from: 'Submitted', to: 'Cancelled', roles: AM, note: true },
  { from: 'Under Review', to: 'Approved', roles: AM },
  { from: 'Under Review', to: 'Rejected', roles: AM, note: true },
  { from: 'Under Review', to: 'On Hold', roles: AM, note: true },
  { from: 'Approved', to: 'Quotation Sent', roles: AM, quote: true },
  { from: 'Approved', to: 'Queued for Production', roles: AM },
  { from: 'Approved', to: 'On Hold', roles: AM, note: true },
  { from: 'Quotation Sent', to: 'Awaiting Payment', roles: AM },
  { from: 'Quotation Sent', to: 'Approved', roles: AM },
  { from: 'Quotation Sent', to: 'Cancelled', roles: AM, note: true },
  { from: 'Awaiting Payment', to: 'Payment Received', roles: ['ACCOUNTANT', 'ACCOUNT_MANAGER'] },
  { from: 'Awaiting Payment', to: 'On Hold', roles: AM, note: true },
  { from: 'Payment Received', to: 'Queued for Production', roles: AM },
  { from: 'Queued for Production', to: 'In Production', roles: ['FACTORY'] },
  { from: 'Queued for Production', to: 'On Hold', roles: ['FACTORY', ...AM], note: true },
  { from: 'In Production', to: 'Quality Check', roles: ['FACTORY'] },
  { from: 'In Production', to: 'Production Complete', roles: ['FACTORY'] },
  { from: 'Quality Check', to: 'Production Complete', roles: ['FACTORY'] },
  { from: 'Quality Check', to: 'In Production', roles: ['FACTORY'], note: true },
  { from: 'Production Complete', to: 'Ready to Ship', roles: AM },
  { from: 'Ready to Ship', to: 'Shipped', roles: ['LOGISTICS'], courier: true },
  { from: 'Shipped', to: 'Out for Delivery', roles: ['LOGISTICS'] },
  { from: 'Shipped', to: 'Delivered', roles: ['LOGISTICS'] },
  { from: 'Out for Delivery', to: 'Delivered', roles: ['LOGISTICS'] },
  { from: 'Out for Delivery', to: 'Shipped', roles: ['LOGISTICS'], note: true },
  { from: 'Delivered', to: 'Closed', roles: AM },
  { from: 'On Hold', to: 'Under Review', roles: [...AM, 'FACTORY'] },
  { from: 'On Hold', to: 'Cancelled', roles: AM, note: true },
];

test('every move, by every role: the right people succeed, everyone else gets 403 and nothing changes', opts, async () => {
  const roleLogin = (role: string) => role.toLowerCase();
  let checked = 0;
  for (const m of MATRIX) {
    const id = await sample();
    const reset = () => db.collection('orders').updateOne(
      { _id: oid(id) },
      { $set: { status: m.from, ...(m.courier ? { 'assignments.courierName': 'Rep' } : {}) } }
    );
    await reset();
    const body = { to: m.to, note: 'Reason given', ...(m.quote ? { quote: { amount: 500 } } : {}) };
    const allowed = new Set(['SUPER_ADMIN', 'ADMIN', ...m.roles]);

    for (const role of ROLES) {
      if (allowed.has(role)) continue;
      const before = await order(id);
      const r = await call(roleLogin(role), `/api/orders/${id}/transition`, 'POST', body);
      assert.equal(r.status, 403, `${role}: ${m.from} → ${m.to} should be refused, got ${r.status}`);
      const now = await order(id);
      assert.equal(now.status, m.from, `${role} changed nothing`);
      assert.equal(now.timeline.length, before.timeline.length);
      checked++;
    }
    for (const role of allowed) {
      await reset();
      const r = await call(roleLogin(role), `/api/orders/${id}/transition`, 'POST', body);
      assert.equal(r.status, 200, `${role}: ${m.from} → ${m.to} should be allowed: ${JSON.stringify(r.json)}`);
      assert.equal((await order(id)).status, m.to);
      checked++;
    }
  }
  assert.ok(checked >= MATRIX.length * ROLES.length);
});

test('the table above is the whole workflow: no move exists that it does not list', opts, async () => {
  const { TRANSITIONS } = await import('../../src/lib/orderWorkflow');
  const inCode = Object.entries(TRANSITIONS).flatMap(([from, list]) => list.map((t) => `${from} → ${t.to}`)).sort();
  const inTable = MATRIX.map((m) => `${m.from} → ${m.to}`).sort();
  assert.deepEqual(inCode, inTable);
});

test('status cannot be changed around the workflow', opts, async () => {
  const id = await sample();
  for (const who of ['admin', 'account_manager', 'customer']) {
    await call(who, `/api/orders/${id}`, 'PUT', { status: 'Delivered' });
    assert.equal((await order(id)).status, 'Submitted', `${who} cannot set a status directly`);
  }
});

/* ------------------------------------------------------------------ */
/* Pages and their APIs agree                                          */
/* ------------------------------------------------------------------ */

/** A page in the sidebar, the permission that shows it, and the read it depends on. */
const PAGES: Array<[string, string]> = [
  ['crm.view', '/api/crm/dashboard'],
  ['crm.view', '/api/crm/kpis'],
  ['crm.view', '/api/crm/tasks'],
  ['customers.view', '/api/customers'],
  ['inbox.view', '/api/contact'],
  ['inventory.view', '/api/inventory'],
  ['inventory.view', '/api/inventory/movements'],
  ['accounting.view', '/api/accounting/summary'],
  ['accounting.view', '/api/accounting/invoices'],
  ['accounting.view', '/api/accounting/payments'],
  ['accounting.view', '/api/accounting/expenses'],
  ['accounting.view', '/api/accounting/receivables'],
  ['promos.manage', '/api/promos'],
  ['users.view', '/api/users'],
  ['audit.view', '/api/audit'],
];

test('a page shows in the sidebar exactly when its data opens for that role', opts, async () => {
  const wrong: string[] = [];
  for (const role of ROLES) {
    if (role === 'CUSTOMER') continue;
    for (const [perm, api] of PAGES) {
      const shown = can(role, perm as Parameters<typeof can>[1]);
      const r = await call(role.toLowerCase(), api);
      const opens = r.status === 200;
      if (shown !== opens) wrong.push(`${role} ${perm} ${api}: page ${shown ? 'shown' : 'hidden'}, API ${r.status}`);
    }
  }
  assert.deepEqual(wrong, []);
});

test('referrals: the team sees all of them, anyone else only their own', opts, async () => {
  await db.collection('referrals').insertOne({ referrerId: ids.other_customer, referralCode: 'OTHER1', status: 'pending', createdAt: new Date() });
  const all = await call('admin', '/api/referrals');
  assert.ok(all.json.length >= 1);
  for (const who of ['customer', 'factory', 'account_manager']) {
    const mine = await call(who, '/api/referrals');
    assert.equal(mine.status, 200);
    assert.equal(mine.json.length, 0, `${who} sees no one else's referrals`);
  }
  const own = await call('other_customer', '/api/referrals');
  assert.equal(own.json.length, 1);
});

test('a customer reaches none of the staff data', opts, async () => {
  for (const [, api] of PAGES) {
    const r = await call('customer', api);
    assert.ok(r.status === 401 || r.status === 403, `${api} gave a customer ${r.status}`);
  }
});
