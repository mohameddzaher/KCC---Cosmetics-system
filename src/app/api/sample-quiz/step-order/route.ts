import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import ProductSpecConfig from '@/models/ProductSpecConfig';
import SpecOptionMaster from '@/models/SpecOptionMaster';
import { getSession } from '@/lib/auth';
import { can } from '@/lib/roles';
import {
  PACKAGING_PART_KEYS,
  PACKAGING_STEP_KEY,
  buildStepSequence,
} from '@/lib/sample-quiz/packagingParts';

export const dynamic = 'force-dynamic';

/**
 * The order the quiz asks its spec questions in.
 *
 * The order lives on each product (`specs[].sortOrder`), which is what the quiz
 * reads — so it was editable one product at a time and nowhere globally. This
 * is that global view: read the sequence every product shares, and write a new
 * one across all of them.
 *
 * Write-through on purpose, like the bulk spec editor: there is no inherited
 * layer to resolve at read time, so "the last save wins" is literally true and
 * the customer quiz keeps reading one document per product exactly as before.
 */

async function requireManage() {
  const session = await getSession();
  return can(session?.role, 'sampleQuiz.manage');
}

/** The packaging studio's tabs, in their current relative order. */
function partKeysInOrder(byKey: Map<string, number>): string[] {
  return Object.keys(PACKAGING_PART_KEYS).sort(
    (a, b) => (byKey.get(a) ?? 99) - (byKey.get(b) ?? 99)
  );
}

export async function GET() {
  try {
    if (!(await requireManage())) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    await connectDB();

    // The products agree on an order; the lowest sortOrder seen for a spec is
    // that order, and a stray product cannot shift the whole screen.
    const rows = await ProductSpecConfig.aggregate([
      { $unwind: '$specs' },
      {
        $group: {
          _id: '$specs.specKey',
          sortOrder: { $min: '$specs.sortOrder' },
          products: { $sum: 1 },
          enabled: { $sum: { $cond: ['$specs.enabled', 1, 0] } },
        },
      },
    ]);

    const byKey = new Map<string, number>(rows.map((r) => [r._id as string, r.sortOrder as number]));
    const masters = await SpecOptionMaster.find({}, { categoryKey: 1, defaultTitleEn: 1, defaultTitleAr: 1 }).lean();
    const titles = new Map(
      masters.map((m: Record<string, unknown>) => [
        m.categoryKey as string,
        { en: (m.defaultTitleEn as string) || '', ar: (m.defaultTitleAr as string) || '' },
      ])
    );

    const steps = rows
      .filter((r) => !PACKAGING_PART_KEYS[r._id as string])
      .sort((a, b) => (a.sortOrder as number) - (b.sortOrder as number))
      .map((r) => ({
        specKey: r._id as string,
        titleEn: titles.get(r._id as string)?.en || (r._id as string),
        titleAr: titles.get(r._id as string)?.ar || '',
        products: r.products as number,
        enabled: r.enabled as number,
        /** The studio step carries the cap / label / finish / colour tabs. */
        carriesParts: r._id === PACKAGING_STEP_KEY,
      }));

    return NextResponse.json(
      { steps, parts: partKeysInOrder(byKey) },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    if (!(await requireManage())) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    await connectDB();

    const body = await req.json();
    if (!Array.isArray(body.order)) {
      return NextResponse.json({ error: 'order must be an array of spec keys' }, { status: 400 });
    }

    const known = new Set<string>(
      (await SpecOptionMaster.find({}, { categoryKey: 1 }).lean()).map(
        (m: Record<string, unknown>) => m.categoryKey as string
      )
    );

    const rows = await ProductSpecConfig.aggregate([
      { $unwind: '$specs' },
      { $group: { _id: '$specs.specKey', sortOrder: { $min: '$specs.sortOrder' } } },
    ]);
    const byKey = new Map<string, number>(rows.map((r) => [r._id as string, r.sortOrder as number]));

    const sequence = buildStepSequence(body.order as string[], known, byKey);

    let updated = 0;
    for (let i = 0; i < sequence.length; i++) {
      const res = await ProductSpecConfig.updateMany(
        { 'specs.specKey': sequence[i] },
        { $set: { 'specs.$[s].sortOrder': i } },
        { arrayFilters: [{ 's.specKey': sequence[i] }] }
      );
      updated = Math.max(updated, res.matchedCount ?? 0);
    }

    return NextResponse.json({ sequence, products: updated });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
