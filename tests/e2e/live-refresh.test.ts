import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { chromium, type Browser, type Page } from 'playwright';
import { hasMongod, startMongod } from '../helpers';

/**
 * Does each side see the change without reloading, and how fast?
 *
 * A real browser holds a page open as one person while another person moves
 * the order through the API. The page must show the move by itself. The time
 * it took is printed, and is what docs/QA_REPORT.md quotes.
 */

const skip = hasMongod() ? false : 'mongod is not installed';
const PORT = 3130;
const BASE = `http://127.0.0.1:${PORT}`;
const PASSWORD = 'Test12345!';
const opts = { skip };

let server: ChildProcess;
let browser: Browser;
let stopDb: () => Promise<void> = async () => {};
let conn: mongoose.Connection;
const as: Record<string, string> = {};
let seq = 0;

async function call(who: string, path: string, method = 'GET', body?: unknown) {
  const r = await fetch(BASE + path, {
    method,
    headers: { 'content-type': 'application/json', cookie: as[who], 'x-forwarded-for': `10.11.0.${++seq % 250}` },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: r.status, json: await r.clone().json().catch(() => null) };
}

async function move(who: string, id: string, to: string, extra: Record<string, unknown> = {}) {
  const r = await call(who, `/api/orders/${id}/transition`, 'POST', { to, ...extra });
  assert.equal(r.status, 200, `${who} → ${to}: ${JSON.stringify(r.json)}`);
}

async function pageAs(who: string, path: string): Promise<Page> {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.addCookies([
    ...as[who].split('; ').map((c) => {
      const [name, ...v] = c.split('=');
      return { name, value: v.join('='), url: BASE };
    }),
    { name: 'kcc-locale', value: 'en', url: BASE },
  ]);
  const page = await ctx.newPage();
  await page.goto(BASE + path);
  return page;
}

/** How long until `text` shows up on the open page, with no reload. */
async function seenWithin(page: Page, text: string | RegExp, ms: number) {
  const start = Date.now();
  await page.getByText(text).first().waitFor({ state: 'visible', timeout: ms });
  return Date.now() - start;
}

async function goneWithin(page: Page, text: string, ms: number) {
  const start = Date.now();
  await page.getByText(text).first().waitFor({ state: 'detached', timeout: ms });
  return Date.now() - start;
}

const timings: Record<string, number> = {};

before(async () => {
  if (skip) return;
  const mongo = await startMongod(27130);
  stopDb = mongo.stop;
  conn = await mongoose.createConnection(mongo.uri).asPromise();
  const db = conn.db as mongoose.mongo.Db;
  const password = bcrypt.hashSync(PASSWORD, 4);
  for (const [k, role] of Object.entries({ admin: 'SUPER_ADMIN', am: 'ACCOUNT_MANAGER', factory: 'FACTORY', finance: 'ACCOUNTANT', customer: 'CUSTOMER' })) {
    await db.collection('users').insertOne({ name: k, email: `${k}@t.local`, role, isActive: true, password, createdAt: new Date(), updatedAt: new Date() });
  }
  server = spawn('npx', ['next', 'start', '-p', String(PORT)], {
    env: { ...process.env, MONGODB_URI: mongo.uri, NEXTAUTH_SECRET: 'e2e-secret-0123456789012345678901234', NODE_ENV: 'production' },
    stdio: 'ignore', detached: true,
  });
  for (let i = 0; i < 100; i++) {
    if (await fetch(`${BASE}/api/health`).then((r) => r.ok).catch(() => false)) break;
    await new Promise((r) => setTimeout(r, 200));
  }
  for (const k of ['admin', 'am', 'factory', 'finance', 'customer']) {
    const r = await fetch(`${BASE}/api/auth/login`, {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-forwarded-for': `10.12.0.${++seq}` },
      body: JSON.stringify({ email: `${k}@t.local`, password: PASSWORD }),
    });
    as[k] = r.headers.getSetCookie().map((c) => c.split(';')[0]).join('; ');
  }
  browser = await chromium.launch();
});

after(async () => {
  if (skip) return;
  console.log('live refresh timings (ms):', JSON.stringify(timings));
  await browser?.close();
  try { process.kill(-(server.pid as number)); } catch { /* gone */ }
  await new Promise((r) => setTimeout(r, 300));
  await conn.close();
  await stopDb();
});

async function newOrder() {
  const r = await call('customer', '/api/orders', 'POST', { type: 'sample', surveyData: {}, customerInfo: { companyName: 'Live Co', personName: 'L', email: 'customer@t.local' } });
  assert.equal(r.status, 201);
  return { id: String(r.json.id), number: String(r.json.orderNumber) };
}

test('the admin order page shows another desk\'s move by itself', opts, async () => {
  const o = await newOrder();
  for (const to of ['Under Review', 'Approved', 'Queued for Production']) await move('am', o.id, to);
  const page = await pageAs('am', `/admin/orders/${o.id}`);
  await seenWithin(page, 'Released to Factory', 15000);
  await move('factory', o.id, 'In Production');
  timings.adminOrderPage = await seenWithin(page, /^In Production$/, 15000);
  assert.ok(timings.adminOrderPage < 12000);
  await page.context().close();
});

test('the production board follows the floor', opts, async () => {
  const o = await newOrder();
  for (const to of ['Under Review', 'Approved', 'Queued for Production']) await move('am', o.id, to);
  for (const to of ['In Production', 'Production Complete']) await move('factory', o.id, to);
  const page = await pageAs('factory', '/admin/production');
  await seenWithin(page, o.number, 15000);
  await move('am', o.id, 'Ready to Ship');
  timings.productionBoard = await goneWithin(page, o.number, 15000);
  assert.ok(timings.productionBoard < 12000);
  await page.context().close();
});

test('the customer\'s sample page tracks the order without a reload', opts, async () => {
  const o = await newOrder();
  const page = await pageAs('customer', `/account/my-samples/${o.id}`);
  await seenWithin(page, o.number, 15000);
  await move('am', o.id, 'Under Review');
  timings.customerSamplePage = await seenWithin(page, /reviewing the brief/i, 15000);
  assert.ok(timings.customerSamplePage < 12000);
  await page.context().close();
});

test('the customer\'s list of samples follows too', opts, async () => {
  const page = await pageAs('customer', '/account/my-samples');
  await page.waitForLoadState('networkidle');
  const o = await newOrder();
  timings.customerSampleList = await seenWithin(page, o.number, 20000);
  assert.ok(timings.customerSampleList < 18000);
  await page.context().close();
});

test('the accounts follow an order that comes up for payment', opts, async () => {
  const page = await pageAs('finance', '/admin/accounting/invoices');
  await page.waitForLoadState('networkidle');
  const o = await newOrder();
  await move('am', o.id, 'Under Review');
  await move('am', o.id, 'Approved');
  await move('am', o.id, 'Quotation Sent', { quote: { amount: 900 } });
  await move('am', o.id, 'Awaiting Payment');
  timings.invoiceList = await seenWithin(page, o.number, 40000);
  assert.ok(timings.invoiceList < 35000);
  await page.context().close();
});
