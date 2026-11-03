import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import CrmAccount from '@/models/CrmAccount';
import CrmActivity from '@/models/CrmActivity';
import CrmTarget from '@/models/CrmTarget';
import { getSession } from '@/lib/auth';
import { can } from '@/lib/roles';
import { CRM_CATEGORIES, CRM_CITIES } from '@/lib/crmVocab';
import { ENGAGEMENT_TYPES, STEP_ORDER } from '@/lib/crmProgress';
import { accountScope, activityScope } from '@/lib/crmScope';

export const dynamic = 'force-dynamic';

/**
 * Every number the CRM dashboard shows, counted once, here.
 *
 * Each figure is read from the accounts and their history rather than stored,
 * so a dashboard can never drift from the lists it summarises: the upcoming
 * count IS the number of accounts in the upcoming stage.
 *
 * Activities carried over from the spreadsheet are excluded from everything
 * measured over time — they record that a meeting happened but not when, and
 * counting them in "this week" would invent work.
 */

/** Sunday, the start of the working week here. */
function startOfWeek(now: Date): Date {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

/**
 * Whole-number shares that add up to the whole.
 *
 * Rounding each share on its own is the obvious way and the wrong one: six
 * sectors rounded independently came to 99%, and a breakdown that does not
 * total 100 reads as a bug in the figures rather than in the arithmetic. This
 * gives every row its floor and then hands the leftover points to the rows
 * with the largest remainders, so the parts sum to 100 whenever they cover
 * the whole. Rows are mutated in place, because the caller has already
 * assembled and sorted them.
 */
function assignShares<T extends { total: number; sharePct: number }>(rows: T[], whole: number) {
  if (!whole || rows.length === 0) return rows;
  const exact = rows.map((r) => (r.total / whole) * 100);
  const floors = exact.map((v) => Math.floor(v));
  // Only distribute points that the rows actually account for: if this is a
  // partial breakdown, its shares should not be inflated to 100.
  const covered = rows.reduce((n, r) => n + r.total, 0);
  const budget = Math.round((covered / whole) * 100) - floors.reduce((n, v) => n + v, 0);
  const order = exact
    .map((v, i) => ({ i, rem: v - Math.floor(v) }))
    .sort((a, b) => b.rem - a.rem);
  for (let k = 0; k < Math.max(0, budget) && k < order.length; k++) floors[order[k].i]++;
  rows.forEach((r, i) => { r.sharePct = floors[i]; });
  return rows;
}

export async function GET() {
  try {
    const user = await getSession();
    if (!can(user?.role, 'crm.view')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    await connectDB();

    const now = new Date();
    const dayStart = new Date(now); dayStart.setHours(0, 0, 0, 0);
    const weekStart = startOfWeek(now);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const live = { backfilled: { $ne: true } };
    /**
     * Work, as opposed to bookkeeping. Logging a visit also writes a
     * stage_change row, so counting every row would report two actions for one
     * visit and overstate the week by half.
     */
    const work = { ...live, type: { $in: [...ENGAGEMENT_TYPES] } };
    // Scoped the same way the lists are: a rep's dashboard describes the
    // accounts he can actually open, and a manager's describes the team's.
    const activeAccounts = { active: { $ne: false }, ...(await accountScope(user)) };
    /**
     * The headline figures describe the target list — the accounts the business
     * chose to work — and not the prospect pool behind it. Mixing 200 untouched
     * SFDA records into "what share of our accounts are distributors" answers a
     * question nobody asked: that share would describe the regulator's register
     * rather than any decision made here.
     */
    const targets = { ...activeAccounts, targetList: true };
    const mine = await activityScope(user);

    const [
      byStage, byCategory, byCity, stepCounts,
      actToday, actWeek, actMonth, byType,
      recent, attention, withOrders, backfilled,
      perRep, trend, target, targetCounts, reachRows, requestRows, poolCount,
    ] = await Promise.all([
      CrmAccount.aggregate([
        { $match: activeAccounts },
        { $group: { _id: '$stage', n: { $sum: 1 } } },
      ]),
      CrmAccount.aggregate([
        { $match: targets },
        {
          $group: {
            _id: '$category',
            n: { $sum: 1 },
            current: { $sum: { $cond: [{ $eq: ['$stage', 'current'] }, 1, 0] } },
            upcoming: { $sum: { $cond: [{ $eq: ['$stage', 'upcoming'] }, 1, 0] } },
            worked: { $sum: { $cond: [{ $gt: ['$activityCount', 0] }, 1, 0] } },
          },
        },
      ]),
      CrmAccount.aggregate([
        { $match: targets },
        {
          $group: {
            _id: '$city',
            n: { $sum: 1 },
            current: { $sum: { $cond: [{ $eq: ['$stage', 'current'] }, 1, 0] } },
          },
        },
        { $sort: { n: -1 } },
      ]),
      // How far accounts get through the six steps.
      CrmAccount.aggregate([
        { $match: targets },
        {
          $project: Object.fromEntries(
            STEP_ORDER.map((k) => [k, { $cond: [{ $ifNull: [`$steps.${k}`, false] }, 1, 0] }])
          ),
        },
        { $group: Object.fromEntries([['_id', null], ...STEP_ORDER.map((k) => [k, { $sum: `$${k}` }])]) },
      ]),

      CrmActivity.countDocuments({ ...work, ...mine, at: { $gte: dayStart } }),
      CrmActivity.countDocuments({ ...work, ...mine, at: { $gte: weekStart } }),
      CrmActivity.countDocuments({ ...work, ...mine, at: { $gte: monthStart } }),
      CrmActivity.aggregate([
        { $match: { ...live, ...mine } },
        { $group: { _id: '$type', n: { $sum: 1 } } },
        { $sort: { n: -1 } },
      ]),

      /**
       * The log, and unlike every count above it this one includes the rows
       * carried over from the sales sheet. A count over time must leave them
       * out — they have no date of their own. A log must not: those meetings
       * are most of what the team has done, and a history that hid them would
       * read as an empty CRM. Each is flagged so the screen can say the date
       * is the import's rather than the visit's.
       */
      CrmActivity.find({ ...mine, type: { $ne: 'stage_change' } })
        .populate('accountId', 'name nameAr stage category city')
        .select('type body outcome at byName backfilled accountId meetingIndex')
        .sort({ at: -1 })
        .limit(24)
        .lean(),

      // Being worked, but nobody has touched it in a fortnight.
      CrmAccount.find({
        ...activeAccounts,
        stage: 'current',
        $or: [
          { lastActionAt: { $lt: new Date(now.getTime() - 14 * 86400000) } },
          { lastActionAt: { $exists: false } },
        ],
      })
        .select('name nameAr category city lastActionAt ownerName activityCount')
        .sort({ lastActionAt: 1 })
        .limit(12)
        .lean(),

      CrmAccount.countDocuments({ ...activeAccounts, 'orderIds.0': { $exists: true } }),
      CrmActivity.countDocuments({ backfilled: true, type: { $in: [...ENGAGEMENT_TYPES] }, ...mine }),

      // Who did what this week.
      CrmActivity.aggregate([
        // Merged, not spread: a second byId key would replace the viewer's scope
        // and show a rep the whole company's week.
        { $match: { ...work, at: { $gte: weekStart }, byId: { $ne: null, ...((mine as { byId?: object }).byId || {}) } } },
        {
          $group: {
            _id: { id: '$byId', name: '$byName' },
            actions: { $sum: 1 },
            visits: { $sum: { $cond: [{ $in: ['$type', ['visit', 'meeting']] }, 1, 0] } },
            accounts: { $addToSet: '$accountId' },
          },
        },
        { $project: { actions: 1, visits: 1, accounts: { $size: '$accounts' } } },
        { $sort: { visits: -1 } },
      ]),

      // Four weeks of activity, for the shape of the trend.
      CrmActivity.aggregate([
        { $match: { ...work, ...mine, at: { $gte: new Date(now.getTime() - 28 * 86400000) } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$at' } },
            n: { $sum: 1 },
            visits: { $sum: { $cond: [{ $in: ['$type', ['visit', 'meeting']] }, 1, 0] } },
          },
        },
        { $sort: { _id: 1 } },
      ]),

      CrmTarget.findOne({ key: 'main' }).lean(),

      // On the list, and how many of them have been started.
      CrmAccount.aggregate([
        { $match: targets },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            worked: { $sum: { $cond: [{ $gt: ['$meetingCount', 0] }, 1, 0] } },
            visited: { $sum: { $cond: [{ $gt: ['$visitCount', 0] }, 1, 0] } },
          },
        },
      ]),

      // Which meeting each account stopped at — the sheet's "where did we get to".
      CrmAccount.aggregate([
        { $match: targets },
        {
          $group: {
            _id: { $min: ['$meetingCount', 3] },
            n: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),

      // What accounts have asked us for, and how many distinct accounts asked.
      CrmActivity.aggregate([
        { $match: { ...live, ...mine, type: { $in: ['sample_request', 'pricing_request'] } } },
        { $group: { _id: '$type', n: { $sum: 1 }, accounts: { $addToSet: '$accountId' } } },
        { $project: { n: 1, accounts: { $size: '$accounts' } } },
      ]),

      CrmAccount.countDocuments({ ...activeAccounts, targetList: { $ne: true } }),
    ]);

    const tc = (targetCounts[0] || {}) as Record<string, number>;
    const stages: Record<string, number> = {};
    for (const s of byStage) stages[s._id || 'upcoming'] = s.n;
    const accounts = Object.values(stages).reduce((a, b) => a + b, 0);

    /* ---- the visit mix: what was aimed at, against what is there ---- */
    const mixGroups = (target as { sectorMix?: Array<{ key: string; labelEn: string; labelAr: string; sharePct: number }> } | null)?.sectorMix || [];
    const groupOf = new Map(CRM_CATEGORIES.map((c) => [c.key, c.mixGroup]));
    const actualByGroup: Record<string, number> = {};
    for (const c of byCategory) {
      const g = groupOf.get(c._id) || 'scattered';
      actualByGroup[g] = (actualByGroup[g] || 0) + c.n;
    }
    // Over the target list, which is what `byCategory` now counts.
    const targetTotal = tc.total || 0;
    const mix = mixGroups.map((g) => ({
      key: g.key,
      labelEn: g.labelEn,
      labelAr: g.labelAr,
      targetPct: g.sharePct,
      accounts: actualByGroup[g.key] || 0,
      actualPct: targetTotal ? Math.round(((actualByGroup[g.key] || 0) / targetTotal) * 100) : 0,
    }));

    const steps = (stepCounts[0] || {}) as Record<string, number>;

    return NextResponse.json(
      {
        totals: {
          /** On the target list — the figure the percentages are taken over. */
          targets: tc.total || 0,
          targetsWorked: tc.worked || 0,
          targetsNotStarted: Math.max(0, (tc.total || 0) - (tc.worked || 0)),
          /** The wider pool, counted but kept out of the split. */
          prospects: poolCount,
          accounts,
          upcoming: stages.upcoming || 0,
          current: stages.current || 0,
          hold: stages.hold || 0,
          won: stages.won || 0,
          lost: stages.lost || 0,
          withOrders,
        },
        /** How far up the target list each account got, by meetings held. */
        reach: [0, 1, 2, 3].map((n) => ({
          meetings: n,
          accounts: (reachRows.find((r) => r._id === n)?.n as number) || 0,
        })),
        requests: {
          samples: (requestRows.find((r) => r._id === 'sample_request')?.n as number) || 0,
          sampleAccounts: (requestRows.find((r) => r._id === 'sample_request')?.accounts as number) || 0,
          pricing: (requestRows.find((r) => r._id === 'pricing_request')?.n as number) || 0,
          pricingAccounts: (requestRows.find((r) => r._id === 'pricing_request')?.accounts as number) || 0,
        },
        activity: {
          today: actToday,
          week: actWeek,
          month: actMonth,
          byType: Object.fromEntries(byType.map((t) => [t._id, t.n])),
          /** Meetings carried over from the sheet, with no date of their own. */
          undated: backfilled,
        },
        byCategory: assignShares(
          byCategory
            .map((c) => ({
              key: c._id || 'other',
              labelEn: CRM_CATEGORIES.find((x) => x.key === c._id)?.labelEn || c._id,
              labelAr: CRM_CATEGORIES.find((x) => x.key === c._id)?.labelAr || c._id,
              total: c.n, current: c.current, upcoming: c.upcoming, worked: c.worked,
              sharePct: 0,
            }))
            .sort((a, b) => b.total - a.total),
          (tc.total as number) || 0
        ),
        byCity: assignShares(
          byCity
            .map((c) => ({
              key: c._id || 'other',
              labelEn: CRM_CITIES.find((x) => x.key === c._id)?.labelEn || c._id,
              labelAr: CRM_CITIES.find((x) => x.key === c._id)?.labelAr || c._id,
              total: c.n, current: c.current,
              sharePct: 0,
            }))
            .sort((a, b) => b.total - a.total),
          (tc.total as number) || 0
        ),
        funnel: STEP_ORDER.map((k) => ({ key: k, accounts: steps[k] || 0 })),
        mix,
        recent,
        attention,
        reps: perRep.map((r) => ({
          id: String(r._id?.id || ''),
          name: r._id?.name || '—',
          actions: r.actions, visits: r.visits, accounts: r.accounts,
        })),
        trend,
        targets: target || null,
        generatedAt: now,
      },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
