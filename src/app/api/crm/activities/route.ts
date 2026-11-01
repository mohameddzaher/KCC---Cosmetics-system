import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import CrmActivity from '@/models/CrmActivity';
import { getSession } from '@/lib/auth';
import { can } from '@/lib/roles';
import { activityScope } from '@/lib/crmScope';

export const dynamic = 'force-dynamic';

/**
 * Logged work across every account — what the complaints screen, and anything
 * else that asks "what has been happening", reads.
 *
 * Scoped like every other CRM read: a manager sees his branch, a rep sees his
 * own. The type filter is what turns it into a complaints list, so there is one
 * query behind every view of the history rather than one per screen.
 */

export async function GET(req: NextRequest) {
  try {
    const user = await getSession();
    if (!can(user?.role, 'crm.view')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    await connectDB();

    const p = req.nextUrl.searchParams;
    const filter: Record<string, unknown> = { ...(await activityScope(user)) };

    const types = (p.get('type') || '').split(',').map((t) => t.trim()).filter(Boolean);
    if (types.length > 0) filter.type = { $in: types };

    const handled = p.get('handled');
    if (handled === 'yes') filter.done = true;
    if (handled === 'no') filter.done = { $ne: true };

    const from = p.get('from');
    const to = p.get('to');
    if (from || to) {
      const range: Record<string, Date> = {};
      if (from && !isNaN(Date.parse(from))) range.$gte = new Date(from);
      if (to && !isNaN(Date.parse(to))) {
        const end = new Date(to);
        end.setHours(23, 59, 59, 999);
        range.$lte = end;
      }
      if (Object.keys(range).length) filter.at = range;
    }

    // Rows carried over from the spreadsheet have no date of their own, so they
    // are left out of anything filtered or counted by time.
    if (p.get('includeUndated') !== 'true') filter.backfilled = { $ne: true };

    const limit = Math.min(Math.max(parseInt(p.get('limit') || '200', 10) || 200, 1), 1000);

    const items = await CrmActivity.find(filter)
      .populate('accountId', 'name nameAr category city stage ownerName keyPerson')
      .populate('orderId', 'orderNumber status')
      .sort({ at: -1 })
      .limit(limit)
      .lean();

    const byType = await CrmActivity.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$type',
          n: { $sum: 1 },
          handled: { $sum: { $cond: ['$done', 1, 0] } },
        },
      },
      { $sort: { n: -1 } },
    ]);

    const q = (p.get('q') || '').trim().toLowerCase();
    const rows = q
      ? items.filter((i: Record<string, unknown>) => {
          const acc = i.accountId as { name?: string; nameAr?: string } | undefined;
          return (
            String(i.body || '').toLowerCase().includes(q) ||
            String(acc?.name || '').toLowerCase().includes(q) ||
            String(acc?.nameAr || '').includes(q)
          );
        })
      : items;

    return NextResponse.json(
      {
        items: rows,
        total: rows.length,
        byType: Object.fromEntries(byType.map((t) => [t._id, { total: t.n, handled: t.handled }])),
      },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
