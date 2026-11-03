import { NextResponse } from 'next/server';
import { Types } from 'mongoose';
import connectDB from '@/lib/db';
import CrmAccount from '@/models/CrmAccount';
import CrmActivity from '@/models/CrmActivity';
import User from '@/models/User';
import { getSession } from '@/lib/auth';
import { can } from '@/lib/roles';
import { audited } from '@/lib/audit';

export const dynamic = 'force-dynamic';

/**
 * The sales sheet was imported with its meetings credited to the rep who made
 * them, but the accounts themselves were left without an owner: the import
 * knew who visited, and never said whose the account was. A rep with no
 * accounts sees no pipeline, and his manager's screen says he owns nothing.
 *
 * GET  — who would get which accounts, without changing anything.
 * POST — give each unowned account to the rep who did its sheet meetings
 *        (the one with the most, if more than one did). Never takes an
 *        account from an owner.
 *
 * Admins only: it reassigns the whole target list in one go.
 */
async function plan() {
  const rows = await CrmActivity.aggregate([
    { $match: { backfilled: true, byId: { $ne: null }, type: { $in: ['meeting', 'visit'] } } },
    { $group: { _id: { account: '$accountId', rep: '$byId' }, n: { $sum: 1 } } },
    { $sort: { n: -1 } },
  ]);
  const best = new Map<string, { rep: string; n: number }>();
  for (const r of rows) {
    const acc = String(r._id.account);
    if (!best.has(acc)) best.set(acc, { rep: String(r._id.rep), n: r.n });
  }

  const unowned = await CrmAccount.find({
    _id: { $in: [...best.keys()].map((id) => new Types.ObjectId(id)) },
    $or: [{ ownerId: { $exists: false } }, { ownerId: null }],
  }).select('_id').lean();

  const reps = await User.find({ _id: { $in: [...new Set([...best.values()].map((b) => b.rep))] }, isActive: { $ne: false } })
    .select('name role').lean() as Array<{ _id: Types.ObjectId; name: string; role: string }>;
  const repById = new Map(reps.map((r) => [String(r._id), r]));

  const byRep = new Map<string, string[]>();
  for (const a of unowned) {
    const rep = best.get(String(a._id))?.rep;
    if (!rep || !repById.has(rep)) continue; // a rep who has left keeps nothing
    byRep.set(rep, [...(byRep.get(rep) || []), String(a._id)]);
  }
  return [...byRep].map(([rep, accounts]) => ({
    repId: rep, repName: repById.get(rep)!.name, role: repById.get(rep)!.role, accounts,
  }));
}

async function guard() {
  const user = await getSession();
  if (!user || !can(user.role, 'crm.viewAll') || !can(user.role, 'crm.edit')) return null;
  return user;
}

export async function GET() {
  try {
    if (!(await guard())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    await connectDB();
    const p = await plan();
    return NextResponse.json({ reps: p.map((r) => ({ ...r, accounts: r.accounts.length })), total: p.reduce((n, r) => n + r.accounts.length, 0) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal server error' }, { status: 500 });
  }
}

export const POST = audited(async function POST() {
  try {
    if (!(await guard())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    await connectDB();
    const p = await plan();
    let assigned = 0;
    for (const r of p) {
      const res = await CrmAccount.updateMany(
        // Re-checked in the write itself, so an owner set meanwhile is kept.
        { _id: { $in: r.accounts.map((id) => new Types.ObjectId(id)) }, $or: [{ ownerId: { $exists: false } }, { ownerId: null }] },
        { $set: { ownerId: new Types.ObjectId(r.repId), ownerName: r.repName } }
      );
      assigned += res.modifiedCount;
    }
    return NextResponse.json({ assigned, reps: p.map((r) => ({ repName: r.repName, accounts: r.accounts.length })) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal server error' }, { status: 500 });
  }
}, { action: 'assign', entity: 'CrmAccount' });
