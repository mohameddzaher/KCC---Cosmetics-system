import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import SpecOptionMaster from '@/models/SpecOptionMaster';
import ProductSpecConfig from '@/models/ProductSpecConfig';
import { getSession } from '@/lib/auth';
import { can } from '@/lib/roles';

export const dynamic = 'force-dynamic';

/**
 * The master libraries behind the sample quiz — every oil, active, colour,
 * fragrance family and packaging part a customer can be offered.
 *
 * Per-product config decides WHICH of these a product shows; this decides what
 * exists at all. Only the first half ever had an admin screen, so the libraries
 * themselves — 51 oils, 70 actives, 26 fine actives — could not be edited
 * without a database client.
 *
 * Nothing is cached here and the quiz re-reads this endpoint on every load, so
 * an edit is live for the next customer with no deploy and no cache to clear.
 */

/** An option's key is what gets stored in orders and in product configs. */
function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
}

/** A key that is not already taken inside this category. */
function uniqueValue(base: string, taken: Set<string>): string {
  const root = base || 'option';
  if (!taken.has(root)) return root;
  for (let i = 2; i < 500; i++) {
    const candidate = `${root}-${i}`;
    if (!taken.has(candidate)) return candidate;
  }
  return `${root}-${Date.now()}`;
}

async function requireManage() {
  const user = await getSession();
  if (!can(user?.role, 'sampleQuiz.manage')) return null;
  return user;
}

/**
 * How many products currently offer each option, per category.
 *
 * The admin screen needs this to answer "is anything using this?" before an
 * option is removed, and to show which library entries are dormant.
 */
async function collectUsage() {
  const rows = await ProductSpecConfig.aggregate([
    { $unwind: '$specs' },
    { $unwind: '$specs.allowedOptions' },
    {
      $group: {
        _id: { k: '$specs.specKey', v: '$specs.allowedOptions' },
        n: { $sum: 1 },
      },
    },
  ]);

  const usage: Record<string, Record<string, number>> = {};
  for (const r of rows) {
    const k = r._id?.k;
    const v = r._id?.v;
    if (!k || !v) continue;
    (usage[k] ||= {})[v] = r.n;
  }

  // How many products carry each category at all, so a count reads as "9 of
  // 208" instead of a bare number.
  const totals = await ProductSpecConfig.aggregate([
    { $unwind: '$specs' },
    { $group: { _id: '$specs.specKey', total: { $sum: 1 } } },
  ]);
  const productTotals: Record<string, number> = {};
  for (const t of totals) if (t._id) productTotals[t._id] = t.total;

  return { usage, productTotals };
}

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const params = new URL(req.url).searchParams;

    // The quiz only ever wants live libraries; the admin screen wants all of
    // them, including any that have been switched off.
    const filter = params.get('all') === 'true' ? {} : { active: true };
    const masters = await SpecOptionMaster.find(filter).lean();

    const extra = params.get('usage') === 'true' ? await collectUsage() : {};

    return NextResponse.json(
      { categories: masters, ...extra },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * POST — add an option to a library.
 *
 * The key is derived rather than typed: it is a storage key, not a display
 * string, and letting someone type it invites typos in the one field that has
 * to stay stable. Packaging shapes pass their own `value` instead, because the
 * 3D studio draws those from code and only a known key resolves to a shape.
 *
 * `attachToProducts` is what makes the option actually reachable. Each product
 * keeps its own allow-list, so a new library entry that is not added to those
 * lists exists everywhere and is offered nowhere.
 */
export async function POST(req: NextRequest) {
  try {
    if (!(await requireManage())) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    await connectDB();

    const body = await req.json();
    const categoryKey = String(body.categoryKey || '');
    const labelEn = String(body.labelEn || '').trim();

    if (!categoryKey || !labelEn) {
      return NextResponse.json({ error: 'categoryKey and labelEn are required' }, { status: 400 });
    }

    const master = await SpecOptionMaster.findOne({ categoryKey });
    if (!master) {
      return NextResponse.json({ error: 'Unknown option category' }, { status: 404 });
    }

    const taken = new Set<string>(master.options.map((o: { value: string }) => o.value));
    const requested = slugify(String(body.value || '')) || slugify(labelEn);
    const value = uniqueValue(requested, taken);

    const option = {
      value,
      labelEn,
      labelAr: String(body.labelAr || '').trim() || undefined,
      meta: body.meta && typeof body.meta === 'object' ? body.meta : undefined,
    };

    master.options.push(option);
    master.markModified('options');
    await master.save();

    let productsUpdated = 0;
    if (body.attachToProducts !== false) {
      // Only products with an explicit allow-list are touched. An empty list
      // already means "everything", and pushing one value into it would flip
      // that product from offering every option to offering just this one.
      const res = await ProductSpecConfig.updateMany(
        { specs: { $elemMatch: { specKey: categoryKey, 'allowedOptions.0': { $exists: true } } } },
        { $addToSet: { 'specs.$[spec].allowedOptions': value } },
        { arrayFilters: [{ 'spec.specKey': categoryKey, 'spec.allowedOptions.0': { $exists: true } }] }
      );
      productsUpdated = res.modifiedCount ?? 0;
    }

    return NextResponse.json({ option, total: master.options.length, productsUpdated }, { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * PUT — edit an option's labels or meta, reorder a library, or retitle it.
 *
 * An option's `value` is deliberately not editable. It is written into every
 * product config that allows it and into the answers of every order ever placed
 * with it; renaming it would orphan both, and the orders cannot be rewritten
 * because they record what the customer actually chose.
 */
export async function PUT(req: NextRequest) {
  try {
    if (!(await requireManage())) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    await connectDB();

    const body = await req.json();
    const categoryKey = String(body.categoryKey || '');
    const master = await SpecOptionMaster.findOne({ categoryKey });
    if (!master) {
      return NextResponse.json({ error: 'Unknown option category' }, { status: 404 });
    }

    // Reorder: the client sends the keys in their new order.
    if (Array.isArray(body.order)) {
      const order = body.order as string[];
      const byValue = new Map<string, unknown>(
        master.options.map((o: { value: string }) => [o.value, o])
      );
      const next = order.map((v) => byValue.get(v)).filter(Boolean);
      // Anything the client did not mention keeps its place at the end, so a
      // stale tab can never silently drop options.
      for (const o of master.options) {
        if (!order.includes(o.value)) next.push(o);
      }
      master.options = next as typeof master.options;
    }

    if (body.option && typeof body.option === 'object') {
      const target = master.options.find((o: { value: string }) => o.value === body.option.value);
      if (!target) {
        return NextResponse.json({ error: 'Unknown option' }, { status: 404 });
      }
      if (typeof body.option.labelEn === 'string') target.labelEn = body.option.labelEn.trim();
      if (typeof body.option.labelAr === 'string') {
        const ar = body.option.labelAr.trim();
        target.labelAr = ar || undefined;
      }
      if (body.option.meta && typeof body.option.meta === 'object') {
        target.meta = { ...(target.meta || {}), ...body.option.meta };
      }
    }

    for (const field of [
      'defaultTitleEn',
      'defaultTitleAr',
      'defaultSubtitleEn',
      'defaultSubtitleAr',
    ] as const) {
      if (typeof body[field] === 'string') master[field] = body[field];
    }
    if (typeof body.active === 'boolean') master.active = body.active;

    master.markModified('options');
    await master.save();

    return NextResponse.json({ categoryKey, total: master.options.length });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * DELETE — remove an option from a library, and from every product that
 * allowed it.
 *
 * Without the second half the product configs would go on listing a key that
 * resolves to nothing: the spec would count one more choice than it can show.
 * Past orders keep the raw value — they are a record, not a live reference.
 */
export async function DELETE(req: NextRequest) {
  try {
    if (!(await requireManage())) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    await connectDB();

    const params = new URL(req.url).searchParams;
    const categoryKey = params.get('categoryKey') || '';
    const value = params.get('value') || '';

    if (!categoryKey || !value) {
      return NextResponse.json({ error: 'categoryKey and value are required' }, { status: 400 });
    }

    const master = await SpecOptionMaster.findOne({ categoryKey });
    if (!master) {
      return NextResponse.json({ error: 'Unknown option category' }, { status: 404 });
    }

    const before = master.options.length;
    master.options = master.options.filter((o: { value: string }) => o.value !== value);
    if (master.options.length === before) {
      return NextResponse.json({ error: 'Unknown option' }, { status: 404 });
    }
    master.markModified('options');
    await master.save();

    const cascade = await ProductSpecConfig.updateMany(
      { 'specs.specKey': categoryKey },
      { $pull: { 'specs.$[spec].allowedOptions': value } },
      { arrayFilters: [{ 'spec.specKey': categoryKey }] }
    );

    return NextResponse.json({
      removed: value,
      remaining: master.options.length,
      productsUpdated: cascade.modifiedCount ?? 0,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
