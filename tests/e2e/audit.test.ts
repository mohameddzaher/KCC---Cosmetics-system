import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { hasMongod, startMongod } from '../helpers';

/**
 * The real thing: the production build, a real MongoDB, real HTTP. It needs
 * `next build` first, which `npm run test:e2e` does. Nothing here can reach the
 * live data; the database is created for the run and destroyed after it.
 */

const skip = hasMongod() ? false : 'mongod is not installed';
const PORT = 3123;
const BASE = `http://127.0.0.1:${PORT}`;
const PASSWORD = 'Test12345!';

let server: ChildProcess;
let stopDb: () => Promise<void> = async () => {};
let db: mongoose.mongo.Db;
let conn: mongoose.Connection;
const ids: Record<string, mongoose.Types.ObjectId> = {};
const sessions: Record<string, string> = {};
let ipCounter = 0;

const logs = () => db.collection('auditlogs');

async function call(path: string, opts: { as?: string; method?: string; body?: unknown; cookie?: string; ip?: string } = {}) {
  const res = await fetch(BASE + path, {
    method: opts.method || (opts.body ? 'POST' : 'GET'),
    headers: {
      'content-type': 'application/json',
      'user-agent': 'kcc-e2e',
      // Each call its own address, so the login rate limit stays out of the way.
      'x-forwarded-for': opts.ip || `10.0.0.${++ipCounter % 250}`,
      cookie: opts.cookie ?? (opts.as ? sessions[opts.as] : '') ?? '',
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  return res;
}

async function login(email: string) {
  const r = await call('/api/auth/login', { body: { email, password: PASSWORD } });
  assert.equal(r.status, 200, `login ${email}`);
  return r.headers.getSetCookie().map((c) => c.split(';')[0]).join('; ');
}

async function user(key: string, role: string, extra: Record<string, unknown> = {}) {
  const r = await db.collection('users').insertOne({
    name: key, email: `${key.toLowerCase()}@test.local`, role, isActive: true,
    password: bcrypt.hashSync(PASSWORD, 4), createdAt: new Date(), updatedAt: new Date(), ...extra,
  });
  ids[key] = r.insertedId as unknown as mongoose.Types.ObjectId;
}

before(async () => {
  if (skip) return;
  const mongo = await startMongod(27124);
  stopDb = mongo.stop;
  conn = await mongoose.createConnection(mongo.uri).asPromise();
  db = conn.db as mongoose.mongo.Db;

  await user('admin', 'SUPER_ADMIN');
  await user('manager', 'ACCOUNT_MANAGER');
  await user('repA', 'SALES', { managerId: ids.manager });
  await user('repB', 'SALES', { managerId: ids.manager });
  await user('leaver', 'SALES');
  await user('demoted', 'ADMIN');
  await user('buyer', 'CUSTOMER');

  server = spawn('npx', ['next', 'start', '-p', String(PORT)], {
    env: { ...process.env, MONGODB_URI: mongo.uri, NEXTAUTH_SECRET: 'e2e-secret-0123456789012345678901234', NODE_ENV: 'production' },
    stdio: 'ignore',
    detached: true,
  });
  for (let i = 0; i < 100; i++) {
    if (await fetch(`${BASE}/api/health`).then((r) => r.ok).catch(() => false)) break;
    await new Promise((r) => setTimeout(r, 200));
  }
  for (const k of ['admin', 'manager', 'repA', 'repB', 'leaver', 'demoted']) sessions[k] = await login(`${k}@test.local`);
});

after(async () => {
  if (skip) return;
  try { process.kill(-(server.pid as number)); } catch { /* already gone */ }
  await new Promise((r) => setTimeout(r, 300));
  await conn.close();
  await stopDb();
});

const opts = { skip };

test('health answers', opts, async () => {
  const j = await (await call('/api/health')).json();
  assert.equal(j.ok, true);
});

test('a sign-in says who, from where, on what', opts, async () => {
  await call('/api/auth/login', { body: { email: 'admin@test.local', password: PASSWORD }, ip: '203.0.113.9' });
  const row = await logs().findOne({ action: 'login', ip: '203.0.113.9' });
  assert.ok(row);
  assert.equal(row.actorEmail, 'admin@test.local');
  assert.equal(row.actorRole, 'SUPER_ADMIN');
  assert.equal(row.userAgent, 'kcc-e2e');
  assert.equal(row.outcome, 'success');
  assert.ok(!JSON.stringify(row).includes(PASSWORD));
});

test('a failed sign-in is recorded, with the name tried and never the password', opts, async () => {
  const r = await call('/api/auth/login', { body: { email: 'admin@test.local', password: 'wrong-guess' }, ip: '203.0.113.10' });
  assert.equal(r.status, 401);
  const row = await logs().findOne({ action: 'login_failed', ip: '203.0.113.10' });
  assert.ok(row);
  assert.equal(row.entityLabel, 'admin@test.local');
  assert.equal(row.outcome, 'denied');
  assert.ok(!JSON.stringify(row).includes('wrong-guess'));
});

test('signing out is recorded against the person', opts, async () => {
  const cookie = await login('repB@test.local');
  await call('/api/auth/logout', { method: 'POST', cookie });
  assert.ok(await logs().findOne({ action: 'logout', actorEmail: 'repb@test.local' }));
});

test('an anonymous write is refused and recorded', opts, async () => {
  const r = await call('/api/crm/accounts', { body: { name: 'Sneaky' }, ip: '203.0.113.11' });
  assert.equal(r.status, 403);
  const row = await logs().findOne({ ip: '203.0.113.11', outcome: 'denied' });
  assert.ok(row);
  assert.equal(row.actorName, undefined);
  assert.equal(await db.collection('crmaccounts').countDocuments({ name: 'Sneaky' }), 0);
});

let accountId = '';

test('creating an account records every value it was given', opts, async () => {
  const r = await call('/api/crm/accounts', { as: 'repA', body: { name: 'Nahdi Pharmacy', city: 'Riyadh', category: 'pharmacy', ownerId: ids.repA } });
  assert.equal(r.status, 201);
  accountId = (await r.json())._id;
  const row = await logs().findOne({ entity: 'CrmAccount', entityId: accountId, action: 'create' });
  assert.ok(row);
  assert.equal(row.actorName, 'repA');
  assert.equal(row.entityLabel, 'Nahdi Pharmacy');
  assert.ok(row.changes.some((c: { field: string; to: unknown }) => c.field === 'name' && c.to === 'Nahdi Pharmacy'));
  assert.equal(row.body.name, 'Nahdi Pharmacy');
});

test('editing records the field, the old value and the new one', opts, async () => {
  await call(`/api/crm/accounts/${accountId}`, { as: 'repA', method: 'PUT', body: { feedback: 'Wants a quote', keyPerson: { name: 'Sara' } } });
  const row = await logs().findOne({ entityId: accountId, action: 'update', 'changes.field': 'feedback' });
  assert.ok(row);
  assert.deepEqual(row.changes.find((c: { field: string }) => c.field === 'feedback'), { field: 'feedback', from: null, to: 'Wants a quote' });
  assert.ok(row.changes.some((c: { field: string; to: unknown }) => c.field === 'keyPerson.name' && c.to === 'Sara'));
});

test('one action and what it caused share a request id', opts, async () => {
  const r = await call(`/api/crm/accounts/${accountId}/activities`, { as: 'repA', body: { type: 'visit', body: 'First call' } });
  assert.ok(r.ok);
  const activity = await logs().findOne({ entity: 'CrmActivity', action: 'create', 'changes.to': 'First call' });
  assert.ok(activity);
  const family = await logs().find({ requestId: activity.requestId }).toArray();
  const moved = family.find((f) => f.entity === 'CrmAccount' && f.action === 'update');
  assert.ok(moved, 'the stage move is recorded with the visit');
  assert.deepEqual(moved.changes.find((c: { field: string }) => c.field === 'stage'), { field: 'stage', from: 'upcoming', to: 'current' });
});

test("a rep cannot change another rep's account, and the attempt is on record", opts, async () => {
  const r = await call(`/api/crm/accounts/${accountId}`, { as: 'repB', method: 'PUT', body: { feedback: 'Hijacked' } });
  assert.equal(r.status, 403);
  const doc = await db.collection('crmaccounts').findOne({ _id: new mongoose.Types.ObjectId(accountId) });
  assert.equal(doc?.feedback, 'Wants a quote');
  assert.ok(await logs().findOne({ actorName: 'repB', outcome: 'denied', path: `/api/crm/accounts/${accountId}` }));
  assert.equal((await call(`/api/crm/accounts/${accountId}/activities`, { as: 'repB', body: { type: 'note', body: 'x' } })).status, 403);
  assert.equal((await call(`/api/crm/accounts/${accountId}`, { as: 'repB', method: 'DELETE' })).status, 403);
  assert.equal((await call(`/api/crm/accounts/${accountId}/activities`, { as: 'repB' })).status, 403);
});

test("a manager can act on their rep's account", opts, async () => {
  assert.equal((await call(`/api/crm/accounts/${accountId}`, { as: 'manager', method: 'PUT', body: { nextStep: 'Send samples' } })).status, 200);
});

test('a disabled account stops working at once', opts, async () => {
  assert.equal((await call('/api/auth/me', { as: 'leaver' })).status, 200);
  const r = await call(`/api/users/${ids.leaver}`, { as: 'admin', method: 'PUT', body: { isActive: false } });
  assert.equal(r.status, 200);
  assert.equal((await call('/api/auth/me', { as: 'leaver' })).status, 401);
  assert.equal((await call('/api/crm/dashboard', { as: 'leaver' })).status, 403);
  const row = await logs().findOne({ entity: 'User', entityId: String(ids.leaver), 'changes.field': 'isActive' });
  assert.ok(row);
  assert.equal(row.actorName, 'admin');
});

test('a changed role applies to a session already open', opts, async () => {
  assert.equal((await call('/api/audit', { as: 'demoted' })).status, 200);
  await call(`/api/users/${ids.demoted}`, { as: 'admin', method: 'PUT', body: { role: 'SUPPORT' } });
  assert.equal((await call('/api/audit', { as: 'demoted' })).status, 403);
  const row = await logs().findOne({ entityId: String(ids.demoted), 'changes.field': 'role' });
  assert.deepEqual(row?.changes.find((c: { field: string }) => c.field === 'role'), { field: 'role', from: 'ADMIN', to: 'SUPPORT' });
});

test('changing a password shows that it changed, never to what', opts, async () => {
  const r = await call(`/api/customers/${ids.buyer}/credentials`, { as: 'admin', method: 'PUT', body: { email: 'buyer@test.local', password: 'BrandNew123!' } });
  assert.ok(r.ok, await r.clone().text());
  const row = await logs().findOne({ entityId: String(ids.buyer), 'changes.field': 'password' });
  assert.ok(row);
  const text = JSON.stringify(row);
  assert.ok(!text.includes('BrandNew123!') && !text.includes('$2'));
});

test('role permission changes record exactly what was granted', opts, async () => {
  const before = (await (await call('/api/roles', { as: 'admin' })).json());
  assert.ok(before);
  const r = await call('/api/roles', { as: 'admin', method: 'PUT', body: { role: 'SUPPORT', permissions: ['dashboard.view', 'inbox.view'] } });
  assert.equal(r.status, 200);
  const row = await logs().findOne({ entity: 'RolePermission', action: { $in: ['create', 'update'] } });
  assert.ok(row);
  assert.equal(row.actorEmail, 'admin@test.local');
  assert.ok(row.changes.some((c: { field: string }) => c.field === 'permissions'));
  await call('/api/roles', { as: 'admin', method: 'PUT', body: { role: 'SUPPORT', reset: true } });
});

test('deleting a customer records what went with them', opts, async () => {
  const c = await call('/api/customers', { as: 'admin', body: { name: 'Temp Co', email: 'temp@test.local' } });
  assert.equal(c.status, 201, await c.clone().text());
  const { _id } = await c.json();
  await call(`/api/customers/${_id}/activities`, { as: 'admin', body: { type: 'note', body: 'Keep this' } });
  const del = await call(`/api/customers/${_id}`, { as: 'admin', method: 'DELETE' });
  assert.ok(del.ok, await del.clone().text());
  const row = await logs().findOne({ entity: 'User', entityId: _id, action: 'delete' });
  assert.ok(row);
  assert.ok(await logs().findOne({ requestId: row.requestId, entity: 'CustomerActivity', action: 'delete' }));
});

test('the log itself is for those allowed, and read-only', opts, async () => {
  assert.equal((await call('/api/audit')).status, 401);
  assert.equal((await call('/api/audit', { as: 'repA' })).status, 403);
  const anyRow = await logs().findOne({});
  assert.equal((await call(`/api/audit/${anyRow?._id}`, { as: 'repA' })).status, 403);
  assert.equal((await call('/api/audit/export', { as: 'repA' })).status, 403);
  for (const method of ['POST', 'PUT', 'DELETE']) {
    assert.equal((await call(`/api/audit/${anyRow?._id}`, { as: 'admin', method })).status, 405, method);
  }
});

test('the screen can find things', opts, async () => {
  const get = async (q: string) => (await call(`/api/audit?${q}`, { as: 'admin' })).json();
  const all = await get('limit=5');
  assert.equal(all.items.length, 5);
  assert.ok(all.total > 10 && all.actors.length > 2 && all.entities.includes('CrmAccount'));

  const trail = await get(`entity=CrmAccount&entityId=${accountId}`);
  assert.ok(trail.total >= 3);
  assert.ok(trail.items.every((i: { entityId: string }) => i.entityId === accountId));

  const mine = await get(`userId=${ids.repB}&outcome=denied`);
  assert.ok(mine.total >= 1 && mine.items.every((i: { actorName: string }) => i.actorName === 'repB'));
  assert.equal((await get('q=feedback&action=update')).items[0].entity, 'CrmAccount');
  assert.equal((await get('from=2020-01-01&to=2020-01-02')).total, 0);
  assert.ok(!('body' in all.items[0]), 'the list stays light');

  const detail = await (await call(`/api/audit/${all.items[0]._id}`, { as: 'admin' })).json();
  assert.ok('requestId' in detail && Array.isArray(detail.related));
});

test('an older entry still names its author', opts, async () => {
  await db.collection('auditlogs').insertOne({ userId: ids.admin, action: 'role.permissions.reset', entity: 'RolePermission', entityId: 'ACCOUNTANT', details: { role: 'ACCOUNTANT' }, createdAt: new Date() });
  const j = await (await call('/api/audit?action=role.permissions.reset', { as: 'admin' })).json();
  assert.equal(j.items[0].actorName, 'admin');
});

test('exports are audited, the log included', opts, async () => {
  const r = await call('/api/audit/export?entity=CrmAccount', { as: 'admin' });
  assert.equal(r.status, 200);
  assert.match(r.headers.get('content-type') || '', /spreadsheetml/);
  assert.ok(await logs().findOne({ action: 'export', entity: 'AuditLog', actorName: 'admin' }));

  assert.equal((await call('/api/crm/export?what=accounts&list=target', { as: 'repA' })).status, 200);
  const row = await logs().findOne({ action: 'export', entity: 'CrmReport', actorName: 'repA' });
  assert.ok(row);
  assert.match(row.path, /what=accounts/);
});

test('the account list carries only what the table draws', opts, async () => {
  const j = await (await call('/api/crm/accounts?stage=all&limit=5', { as: 'admin' })).json();
  assert.ok(j.items.length > 0);
  assert.ok(j.items[0].name && j.items[0].stage);
  assert.ok(!('matchKeys' in j.items[0]) && !('links' in j.items[0]) && !('notes' in j.items[0]));
});
