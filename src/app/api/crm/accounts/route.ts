import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import CrmAccount from '@/models/CrmAccount';
import { getSession } from '@/lib/auth';
import { can } from '@/lib/roles';
import { matchKeysFor, primaryKey } from '@/lib/crmMatch';
import { canonicalCategory, canonicalCity } from '@/lib/crmVocab';
import { accountScope } from '@/lib/crmScope';
import { audited } from '@/lib/audit';

export const dynamic = 'force-dynamic';

/**
 * The target accounts — one list, filtered.
 *
 * The upcoming and current screens are the same query with a different stage,
 * which is why neither can disagree with the dashboard: all three count the
 * same collection.
 */

export async function GET(req: NextRequest) {
  try {
    const user = await getSession();
    if (!can(user?.role, 'crm.view')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    await connectDB();

    const p = req.nextUrl.searchParams;
    // A manager sees his whole branch; a rep his own plus the unowned pool.
    const scope = await accountScope(user);
    const filter: Record<string, unknown> = { active: { $ne: false }, ...scope };

    const stage = p.get('stage');
    if (stage && stage !== 'all') filter.stage = stage;
    const category = p.get('category');
    if (category && category !== 'all') filter.category = category;
    const city = p.get('city');
    if (city && city !== 'all') filter.city = city;

    // So a dashboard tile can open exactly the rows it counted.
    const list = p.get('list');
    if (list === 'target') filter.targetList = true;
    if (list === 'pool') filter.targetList = { $ne: true };

    const owner = p.get('owner');
    if (owner === 'unassigned') filter.ownerId = { $exists: false };
    else if (owner && owner !== 'all') filter.ownerId = owner;

    const q = (p.get('q') || '').trim();
    if (q) {
      const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ name: rx }, { nameAr: rx }, { brands: rx }, { 'keyPerson.name': rx }];
    }

    const limit = Math.min(Math.max(parseInt(p.get('limit') || '50', 10) || 50, 1), 500);
    const page = Math.max(parseInt(p.get('page') || '1', 10) || 1, 1);

    const sortKey = p.get('sort') || 'recent';
    const sort: Record<string, 1 | -1> =
      sortKey === 'name' ? { name: 1 }
        : sortKey === 'progress' ? { activityCount: -1 }
          // An untouched target sorts to the top of the upcoming list, which is
          // where the work is.
          : { lastActionAt: -1, createdAt: -1 };

    const [items, total, stageFacets] = await Promise.all([
      CrmAccount.find(filter)
        // What the table draws. The notes, links and match keys of 200 accounts
        // were two thirds of this response and never reached the screen.
        .select('name nameAr category city segment brands keyPerson stage ownerId ownerName steps visitCount meetingCount activityCount lastActionAt')
        .populate('ownerId', 'name role')
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      CrmAccount.countDocuments(filter),
      // The tabs' own counts, unaffected by the stage filter in force.
      // The tabs count what this viewer can see, or a rep would be told there
      // are 233 upcoming and then shown a different number of rows.
      CrmAccount.aggregate([
        { $match: { active: { $ne: false }, ...scope } },
        { $group: { _id: '$stage', n: { $sum: 1 } } },
      ]),
    ]);

    const byStage: Record<string, number> = {};
    for (const f of stageFacets) byStage[f._id || 'upcoming'] = f.n;

    return NextResponse.json(
      { items, total, page, pages: Math.ceil(total / limit), byStage },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export const POST = audited(async function POST(req: NextRequest) {
  try {
    const user = await getSession();
    if (!can(user?.role, 'crm.edit')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    await connectDB();

    const body = await req.json();
    const name = String(body.name || '').trim();
    const nameAr = String(body.nameAr || '').trim();
    if (!name && !nameAr) {
      return NextResponse.json({ error: 'The account needs a name' }, { status: 400 });
    }

    const brands: string[] = Array.isArray(body.brands)
      ? body.brands.map(String).map((b: string) => b.trim()).filter(Boolean)
      : [];

    const keys = matchKeysFor({ name, nameAr, brands });

    // A duplicate account is worse than a rejected form: the dashboard would
    // count one company twice and the team would work it twice.
    const clash = keys.length ? await CrmAccount.findOne({ matchKeys: { $in: keys } }).lean() : null;
    if (clash) {
      const c = clash as { _id: unknown; name: string };
      return NextResponse.json(
        { error: `"${c.name}" is already in the CRM`, existingId: String(c._id) },
        { status: 409 }
      );
    }

    const account = await CrmAccount.create({
      name: name || nameAr,
      nameAr: nameAr && nameAr !== name ? nameAr : undefined,
      category: canonicalCategory(body.category),
      city: canonicalCity(body.city),
      segment: String(body.segment || '').trim() || undefined,
      source: String(body.source || 'manual').trim(),
      brands,
      links: Array.isArray(body.links) ? body.links.map(String).filter(Boolean) : [],
      keyPerson: {
        name: String(body.keyPerson?.name || '').trim() || undefined,
        position: String(body.keyPerson?.position || '').trim() || undefined,
        phone: String(body.keyPerson?.phone || '').trim() || undefined,
        email: String(body.keyPerson?.email || '').trim() || undefined,
      },
      stage: 'upcoming',
      ownerId: body.ownerId || undefined,
      steps: {},
      nameKey: primaryKey({ name: name || nameAr, nameAr }),
      matchKeys: keys,
    });

    return NextResponse.json(account, { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
});
