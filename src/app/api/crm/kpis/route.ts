import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import CrmAccount from '@/models/CrmAccount';
import CrmActivity from '@/models/CrmActivity';
import CrmTarget from '@/models/CrmTarget';
import User from '@/models/User';
import { getSession } from '@/lib/auth';
import { can } from '@/lib/roles';
import { CRM_CATEGORIES } from '@/lib/crmVocab';
import { ENGAGEMENT_TYPES } from '@/lib/crmProgress';

export const dynamic = 'force-dynamic';

/**
 * Each sales rep against the targets in the KPIs sheet.
 *
 * The targets are per rep per period — "4 to 5 visits a day", "20 to 25 clients
 * a week" — so the figures are per rep too, and a rep with no actions still
 * appears: a KPI screen that only lists people who did something cannot show
 * who did nothing.
 *
 * Only dated activity counts. The meetings carried over from the spreadsheet
 * have no date of their own, and attributing them to the week of the import
 * would credit work to whoever ran it.
 */

function startOfWeek(now: Date): Date {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

/** Roles that carry a visit target. */
const SALES_ROLES = ['SALES', 'ACCOUNT_MANAGER', 'SUPER_ADMIN', 'ADMIN'];

export async function GET(req: NextRequest) {
  try {
    const user = await getSession();
    if (!can(user?.role, 'crm.view')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    await connectDB();

    const now = new Date();
    const period = req.nextUrl.searchParams.get('period') || 'week';
    const dayStart = new Date(now); dayStart.setHours(0, 0, 0, 0);
    const weekStart = startOfWeek(now);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const from = period === 'day' ? dayStart : period === 'month' ? monthStart : weekStart;

    // Only work counts towards a target: a stage change is written by the system
    // when a visit is logged, and crediting both would double every rep's day.
    const live = { backfilled: { $ne: true }, type: { $in: [...ENGAGEMENT_TYPES] } };
    const groupOf = new Map(CRM_CATEGORIES.map((c) => [c.key, c.mixGroup]));

    const [target, reps, rows, owned] = await Promise.all([
      CrmTarget.findOne({ key: 'main' }).lean(),
      User.find({ role: { $in: SALES_ROLES }, isActive: { $ne: false } })
        .select('name email role')
        .lean(),
      // Everything each rep did in the period, with the account's sector so the
      // 60/30/10 split can be measured rather than assumed.
      CrmActivity.aggregate([
        { $match: { ...live, at: { $gte: from }, byId: { $ne: null } } },
        {
          $lookup: {
            from: 'crmaccounts', localField: 'accountId', foreignField: '_id',
            as: 'acc', pipeline: [{ $project: { category: 1, city: 1 } }],
          },
        },
        { $unwind: { path: '$acc', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            byId: 1, byName: 1, type: 1, accountId: 1,
            category: '$acc.category',
            day: { $dateToString: { format: '%Y-%m-%d', date: '$at' } },
          },
        },
      ]),
      CrmAccount.aggregate([
        { $match: { active: { $ne: false }, ownerId: { $ne: null } } },
        { $group: { _id: { owner: '$ownerId', stage: '$stage' }, n: { $sum: 1 } } },
      ]),
    ]);

    const t = (target || {}) as {
      dailyVisits?: { min: number; max: number };
      weeklyClients?: { min: number; max: number };
      sectorMix?: Array<{ key: string; labelEn: string; labelAr: string; sharePct: number }>;
    };
    const daily = t.dailyVisits || { min: 4, max: 5 };
    const weekly = t.weeklyClients || { min: 20, max: 25 };

    /* ---- fold the rows up per rep ---- */
    interface Bucket {
      actions: number; visits: number; meetings: number; calls: number;
      samples: number; accounts: Set<string>; days: Set<string>;
      mix: Record<string, number>;
    }
    const empty = (): Bucket => ({
      actions: 0, visits: 0, meetings: 0, calls: 0, samples: 0,
      accounts: new Set(), days: new Set(), mix: {},
    });
    const buckets = new Map<string, Bucket>();
    const names = new Map<string, string>();

    for (const r of rows) {
      const id = String(r.byId);
      if (!buckets.has(id)) buckets.set(id, empty());
      const b = buckets.get(id)!;
      if (r.byName) names.set(id, r.byName);
      b.actions++;
      if (r.type === 'visit' || r.type === 'meeting') {
        b.visits++;
        b.days.add(r.day);
        const g = groupOf.get(r.category) || 'scattered';
        b.mix[g] = (b.mix[g] || 0) + 1;
      }
      if (r.type === 'meeting') b.meetings++;
      if (r.type === 'call' || r.type === 'whatsapp') b.calls++;
      if (r.type === 'sample_request') b.samples++;
      if (r.accountId) b.accounts.add(String(r.accountId));
    }

    const ownedBy = new Map<string, Record<string, number>>();
    for (const o of owned) {
      const id = String(o._id.owner);
      const m = ownedBy.get(id) || {};
      m[o._id.stage] = o.n;
      ownedBy.set(id, m);
    }

    /** Working days so far this period, to judge a daily target fairly. */
    const daysElapsed =
      period === 'day' ? 1
        : period === 'week' ? Math.max(1, now.getDay() + 1)
          : now.getDate();

    const people = reps.map((r: Record<string, unknown>) => {
      const id = String(r._id);
      const b = buckets.get(id) || empty();
      const visitsPerDay = b.visits / daysElapsed;
      const accountsSeen = b.accounts.size;

      return {
        id,
        name: (r.name as string) || '—',
        role: r.role as string,
        actions: b.actions,
        visits: b.visits,
        meetings: b.meetings,
        calls: b.calls,
        sampleRequests: b.samples,
        accountsSeen,
        activeDays: b.days.size,
        visitsPerDay: Number(visitsPerDay.toFixed(1)),
        /** Against the sheet's own numbers. */
        dailyTarget: daily,
        weeklyClientTarget: weekly,
        dailyAttainmentPct: daily.min ? Math.round((visitsPerDay / daily.min) * 100) : 0,
        weeklyClientAttainmentPct:
          period === 'week' && weekly.min ? Math.round((accountsSeen / weekly.min) * 100) : null,
        mix: (t.sectorMix || []).map((g) => ({
          key: g.key,
          labelEn: g.labelEn,
          labelAr: g.labelAr,
          targetPct: g.sharePct,
          visits: b.mix[g.key] || 0,
          actualPct: b.visits ? Math.round(((b.mix[g.key] || 0) / b.visits) * 100) : 0,
        })),
        accountsOwned: ownedBy.get(id) || {},
      };
    });

    // Someone outside the sales roles logged work: show them rather than lose
    // the actions, which otherwise would not add up to the dashboard's total.
    for (const [id, b] of buckets) {
      if (people.some((p) => p.id === id)) continue;
      people.push({
        id,
        name: names.get(id) || '—',
        role: 'other',
        actions: b.actions, visits: b.visits, meetings: b.meetings, calls: b.calls,
        sampleRequests: b.samples, accountsSeen: b.accounts.size, activeDays: b.days.size,
        visitsPerDay: Number((b.visits / daysElapsed).toFixed(1)),
        dailyTarget: daily, weeklyClientTarget: weekly,
        dailyAttainmentPct: daily.min ? Math.round((b.visits / daysElapsed / daily.min) * 100) : 0,
        weeklyClientAttainmentPct: null,
        mix: [],
        accountsOwned: ownedBy.get(id) || {},
      });
    }

    people.sort((a, b) => b.visits - a.visits || a.name.localeCompare(b.name));

    return NextResponse.json(
      {
        period,
        from,
        daysElapsed,
        targets: { dailyVisits: daily, weeklyClients: weekly, sectorMix: t.sectorMix || [] },
        team: {
          visits: people.reduce((n, p) => n + p.visits, 0),
          actions: people.reduce((n, p) => n + p.actions, 0),
          accountsSeen: new Set(rows.filter((r) => r.accountId).map((r) => String(r.accountId))).size,
        },
        people,
      },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
