import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import ProductCode from '@/models/ProductCode';
import { getSession } from '@/lib/auth';
import { can } from '@/lib/roles';

export const dynamic = 'force-dynamic';

/**
 * The code catalogue: the rows, the filter options, and the figures that
 * summarise them.
 *
 * The summary is computed from the rows the filters selected, not from the
 * whole collection — so narrowing to Hair Care shows what Hair Care costs,
 * which is the question somebody filtering is asking.
 */

export async function GET(req: NextRequest) {
  try {
    const user = await getSession();
    if (!can(user?.role, 'crm.view')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    await connectDB();

    const p = req.nextUrl.searchParams;
    const filter: Record<string, unknown> = { active: { $ne: false } };

    for (const [param, field] of [['category', 'category'], ['status', 'status'], ['package', 'package'], ['form', 'form']] as const) {
      const v = p.get(param);
      if (v && v !== 'all') filter[field] = v;
    }
    // "Costed" has to mean the same thing here as in the summary below, or the
    // filter and the figure beside it disagree. A cost of zero is not a cost —
    // several rows carry 0 where nobody has worked one out.
    const costed = p.get('costed');
    if (costed === 'yes') filter.cost = { $gt: 0 };
    if (costed === 'no') {
      filter.$or = [{ cost: null }, { cost: { $exists: false } }, { cost: 0 }];
    }

    const q = (p.get('q') || '').trim();
    if (q) {
      const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$and = [
        { $or: [{ product: rx }, { code: rx }, { ingredients: rx }, { benchmarkIntl: rx }, { benchmarkSaudi: rx }] },
      ];
    }

    const [items, facetRows, summary] = await Promise.all([
      ProductCode.find(filter).sort({ category: 1, product: 1 }).limit(1000).lean(),
      // Filter options come from everything, so narrowing never hides the way back.
      ProductCode.aggregate([
        { $match: { active: { $ne: false } } },
        {
          $group: {
            _id: null,
            categories: { $addToSet: '$category' },
            statuses: { $addToSet: '$status' },
            packages: { $addToSet: '$package' },
            forms: { $addToSet: '$form' },
          },
        },
      ]),
      ProductCode.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            confirmed: { $sum: { $cond: [{ $eq: ['$status', 'Confirmed'] }, 1, 0] } },
            withCost: { $sum: { $cond: [{ $gt: ['$cost', 0] }, 1, 0] } },
            withPrice: { $sum: { $cond: [{ $gt: ['$kccRecommendedSar', 0] }, 1, 0] } },
            avgCostRatio: { $avg: { $cond: [{ $gt: ['$costRatio', 0] }, '$costRatio', null] } },
            avgCost: { $avg: { $cond: [{ $gt: ['$cost', 0] }, '$cost', null] } },
            avgKcc: { $avg: { $cond: [{ $gt: ['$kccRecommendedSar', 0] }, '$kccRecommendedSar', null] } },
            avgBenchmark: { $avg: { $cond: [{ $gt: ['$rspSaudi', 0] }, '$rspSaudi', null] } },
          },
        },
      ]),
    ]);

    const byCategory = await ProductCode.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$category',
          n: { $sum: 1 },
          confirmed: { $sum: { $cond: [{ $eq: ['$status', 'Confirmed'] }, 1, 0] } },
          avgCostRatio: { $avg: { $cond: [{ $gt: ['$costRatio', 0] }, '$costRatio', null] } },
        },
      },
      { $sort: { n: -1 } },
    ]);

    const f = facetRows[0] || {};
    const s = (summary[0] || {}) as Record<string, number>;
    const clean = (a: unknown[]) => (a || []).filter((x) => !!x).sort() as string[];

    return NextResponse.json(
      {
        items,
        facets: {
          categories: clean(f.categories),
          statuses: clean(f.statuses),
          packages: clean(f.packages),
          forms: clean(f.forms),
        },
        summary: {
          total: s.total || 0,
          confirmed: s.confirmed || 0,
          inDevelopment: (s.total || 0) - (s.confirmed || 0),
          withCost: s.withCost || 0,
          withoutCost: (s.total || 0) - (s.withCost || 0),
          withPrice: s.withPrice || 0,
          avgCostRatio: s.avgCostRatio ? Number(s.avgCostRatio.toFixed(4)) : null,
          avgCost: s.avgCost ? Number(s.avgCost.toFixed(2)) : null,
          avgKcc: s.avgKcc ? Number(s.avgKcc.toFixed(2)) : null,
          avgBenchmark: s.avgBenchmark ? Number(s.avgBenchmark.toFixed(2)) : null,
        },
        byCategory,
      },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

const NUMERIC = ['volume', 'rspSaudi', 'priceEccEgp', 'bonnSar', 'alKamalUae', 'cost', 'rsp', 'kccRecommendedSar'] as const;
const TEXT = ['category', 'product', 'sizeCode', 'code', 'status', 'package', 'form', 'ingredients', 'benchmarkIntl', 'benchmarkEgypt', 'benchmarkSaudi', 'notes'] as const;

/** Shared by create and update so one rule governs what a figure may be. */
export function readBody(body: Record<string, unknown>): Record<string, unknown> {
  const doc: Record<string, unknown> = {};
  for (const k of TEXT) {
    if (typeof body[k] === 'string') doc[k] = (body[k] as string).trim();
  }
  for (const k of NUMERIC) {
    if (body[k] === '' || body[k] === null) {
      // Clearing a figure means "not worked out", which is not zero.
      doc[k] = null;
    } else if (body[k] !== undefined) {
      const n = Number(body[k]);
      if (Number.isFinite(n) && n >= 0) doc[k] = n;
    }
  }
  // The cost ratio is derived, never typed: it is cost divided by shelf price.
  const cost = Number(doc.cost ?? NaN);
  const rsp = Number(doc.rsp ?? NaN);
  if (Number.isFinite(cost) && Number.isFinite(rsp) && rsp > 0) {
    doc.costRatio = Number((cost / rsp).toFixed(4));
  }
  return doc;
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSession();
    if (!can(user?.role, 'crm.edit')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    await connectDB();

    const body = await req.json();
    const doc = readBody(body);
    if (!doc.product || !doc.category) {
      return NextResponse.json({ error: 'A product needs a name and a category' }, { status: 400 });
    }
    if (doc.code) {
      const clash = await ProductCode.findOne({ code: doc.code }).lean();
      if (clash) {
        return NextResponse.json({ error: `The code ${doc.code} is already used` }, { status: 409 });
      }
    }

    const created = await ProductCode.create({ ...doc, active: true });
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
