import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { hasMongod, startMongod } from '../helpers';

/**
 * The sales sheet's work belongs to the rep who did it: it counts on his KPIs
 * since the start, his accounts become his, and what his team logs afterwards
 * shows on the same screen at once.
 */

const skip = hasMongod() ? false : 'mongod is not installed';
const PORT = 3128;
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
    headers: { 'content-type': 'application/json', cookie: as[who] || '', 'x-forwarded-for': `10.6.0.${++seq % 250}` },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: r.status, json: await r.clone().json().catch(() => null) };
}

const ids: Record<string, mongoose.Types.ObjectId> = {};
const acc: Record<string, mongoose.Types.ObjectId> = {};

before(async () => {
  if (skip) return;
  const mongo = await startMongod(27128);
  stopDb = mongo.stop;
  conn = await mongoose.createConnection(mongo.uri).asPromise();
  db = conn.db as mongoose.mongo.Db;
  const password = bcrypt.hashSync(PASSWORD, 4);
  for (const [k, role] of Object.entries({ admin: 'SUPER_ADMIN', amr: 'ACCOUNT_MANAGER', rep: 'SALES', other: 'ACCOUNT_MANAGER' })) {
    ids[k] = new mongoose.Types.ObjectId();
    await db.collection('users').insertOne({
      _id: ids[k], name: k === 'amr' ? 'Amr Zayat' : k, email: `${k}@t.local`, role, isActive: true, password,
      ...(k === 'rep' ? { managerId: ids.amr } : {}), createdAt: new Date(), updatedAt: new Date(),
    });
  }
  // As the import left them: meetings credited to Amr, accounts with no owner,
  // one account already owned by someone else.
  const imported = new Date('2026-09-01T09:00:00Z');
  for (const [k, owner, meetings] of [['nahdi', null, ['done', 'done']], ['dawaa', null, ['hold']], ['taken', 'other', ['done']]] as const) {
    acc[k] = new mongoose.Types.ObjectId();
    await db.collection('crmaccounts').insertOne({
      _id: acc[k], name: k, nameKey: k, stage: 'current', targetList: true, active: true,
      ...(owner ? { ownerId: ids[owner], ownerName: owner } : {}),
      meetingCount: meetings.length, activityCount: meetings.length, createdAt: imported, updatedAt: imported,
    });
    for (let i = 0; i < meetings.length; i++) {
      await db.collection('crmactivities').insertOne({
        accountId: acc[k], type: 'meeting', meetingIndex: i + 1, backfilled: true, outcome: meetings[i],
        byId: ids.amr, byName: 'Amr Zayat', at: imported, createdAt: imported, updatedAt: imported,
      });
    }
  }
  acc.fresh = new mongoose.Types.ObjectId();
  await db.collection('crmaccounts').insertOne({ _id: acc.fresh, name: 'fresh', nameKey: 'fresh', stage: 'upcoming', targetList: true, active: true, createdAt: new Date(), updatedAt: new Date() });

  server = spawn('npx', ['next', 'start', '-p', String(PORT)], {
    env: { ...process.env, MONGODB_URI: mongo.uri, NEXTAUTH_SECRET: 'e2e-secret-0123456789012345678901234', NODE_ENV: 'production' },
    stdio: 'ignore', detached: true,
  });
  for (let i = 0; i < 100; i++) {
    if (await fetch(`${BASE}/api/health`).then((r) => r.ok).catch(() => false)) break;
    await new Promise((r) => setTimeout(r, 200));
  }
  for (const k of Object.keys(ids)) {
    const r = await fetch(`${BASE}/api/auth/login`, {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-forwarded-for': `10.7.0.${++seq}` },
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

const line = async (who: string, period: string, name = 'Amr Zayat') => {
  const r = await call(who, `/api/crm/kpis?period=${period}`);
  assert.equal(r.status, 200, JSON.stringify(r.json));
  return { all: r.json, me: r.json.people.find((p: any) => p.name === name) };
};

test('a dated period keeps the sheet apart; "since the start" counts it as his', opts, async () => {
  const week = await line('amr', 'week');
  assert.equal(week.me.visits, 0, 'the sheet has no dates, so no week holds it');
  assert.equal(week.me.carried.visits, 4);
  assert.equal(week.me.carried.done, 3);

  const all = await line('amr', 'all');
  assert.equal(all.all.allTime, true);
  assert.equal(all.me.visits, 4, 'every meeting he made');
  assert.equal(all.me.meetings, 4);
  assert.equal(all.me.accountsSeen, 3);
  assert.equal(all.me.activeDays, 0, 'the import day is not a day he worked');
  assert.equal(all.me.visitsPerDay, null, 'no rate without dates');
  assert.equal(all.me.dailyAttainmentPct, null);

  const sheet = await fetch(`${BASE}/api/crm/export?what=kpis&period=all`, { headers: { cookie: as.amr, 'x-forwarded-for': '10.6.9.9' } });
  assert.equal(sheet.status, 200, 'the workbook takes the same period');
});

test('the accounts he visited become his, and nobody else\'s are taken', opts, async () => {
  assert.equal((await call('amr', '/api/crm/accounts/claim-sheet-work')).status, 403, 'admins only');
  assert.equal((await call('amr', '/api/crm/accounts/claim-sheet-work', 'POST')).status, 403);

  let r = await call('admin', '/api/crm/accounts/claim-sheet-work');
  assert.equal(r.status, 200);
  assert.equal(r.json.total, 2, 'two unowned; the third already has an owner');
  assert.deepEqual(r.json.reps.map((x: any) => [x.repName, x.accounts]), [['Amr Zayat', 2]]);
  assert.equal(await db.collection('crmaccounts').countDocuments({ ownerId: ids.amr }), 0, 'looking changes nothing');

  r = await call('admin', '/api/crm/accounts/claim-sheet-work', 'POST');
  assert.equal(r.status, 200);
  assert.equal(r.json.assigned, 2);
  assert.equal(await db.collection('crmaccounts').countDocuments({ ownerId: ids.amr }), 2);
  assert.equal(String((await db.collection('crmaccounts').findOne({ _id: acc.taken }))!.ownerId), String(ids.other), 'kept its owner');
  assert.equal((await call('admin', '/api/crm/accounts/claim-sheet-work')).json.total, 0, 'nothing left: the button goes away');

  const { me } = await line('amr', 'all');
  assert.equal(me.accountsOwned.current, 2, '"Owns" is no longer empty');
  await new Promise((res) => setTimeout(res, 300));
  assert.ok(await db.collection('auditlogs').findOne({ entity: 'CrmAccount', action: 'update', entityId: String(acc.nahdi) }), 'and the trail says who gave it');
});

test('what his team logs shows on his screen at once', opts, async () => {
  const r = await call('rep', `/api/crm/accounts/${acc.fresh}/activities`, 'POST', { type: 'visit', body: 'First visit' });
  assert.equal(r.status, 201, JSON.stringify(r.json));
  assert.equal(String((await db.collection('crmaccounts').findOne({ _id: acc.fresh }))!.ownerId), String(ids.rep), 'the first visit claims an unowned account');

  const week = await line('amr', 'week', 'rep');
  assert.ok(week.me, 'Amr sees the rep who reports to him');
  assert.equal(week.me.visits, 1);
  assert.equal(week.me.activeDays, 1);
  assert.ok(week.me.dailyAttainmentPct !== null);
  const all = await line('amr', 'all');
  assert.equal(all.all.team.visits, 5, 'four from the sheet and the new one');

  const outside = await line('other', 'week');
  assert.equal(outside.all.people.find((p: any) => p.name === 'rep'), undefined, 'another manager does not see Amr\'s team');
  const dash = await call('other', '/api/crm/dashboard');
  assert.equal(dash.status, 200);
  assert.ok(!JSON.stringify(dash.json).includes('"name":"rep"'), 'nor on the CRM dashboard');
  const own = await call('amr', '/api/crm/dashboard');
  assert.ok(JSON.stringify(own.json).includes('"name":"rep"'), 'Amr does');
});

test('every member of staff is sent to the panel, and every customer is not', opts, async () => {
  const { isStaffRole } = await import('../../src/lib/roles');
  for (const role of ['ACCOUNT_MANAGER', 'SALES', 'FACTORY', 'LOGISTICS', 'ACCOUNTANT', 'SUPPORT', 'CONTENT_EDITOR', 'ADMIN', 'SUPER_ADMIN', 'STAFF']) {
    assert.equal(isStaffRole(role), true, role);
  }
  assert.equal(isStaffRole('CUSTOMER'), false);
  const me = await call('amr', '/api/auth/me');
  assert.equal(me.json.user.role, 'ACCOUNT_MANAGER');
  assert.equal(isStaffRole(me.json.user.role), true, 'Amr lands on the admin panel');
});
