import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import ProductSpecConfig from '@/models/ProductSpecConfig';
import SpecOptionMaster from '@/models/SpecOptionMaster';
import { getSession } from '@/lib/auth';
import { can } from '@/lib/roles';

export const dynamic = 'force-dynamic';

/**
 * Bulk spec configuration.
 *
 * Lets an admin configure the spec questions once for a whole main category
 * ("Baby Care") or a whole sub-family ("Bath & Shower") instead of opening
 * every product one at a time.
 *
 * SEMANTICS — deliberately write-through, not layered:
 *   Saving at a level WRITES the configuration onto every product document
 *   underneath it. There is no inheritance to resolve at read time, so
 *   "whatever was saved last wins" is literally true, the customer quiz keeps
 *   reading one document per product exactly as before, and there is never a
 *   stale layer hiding under a newer one.
 *
 *   • save on a main category  → overwrites every product in every sub-family
 *   • save on a sub-family     → overwrites every product in that sub-family
 *   • save on a single product → overwrites that product only
 *
 * GET seeds the editor from the most recently updated product underneath the
 * scope, so opening the bulk editor shows what is actually in force.
 */

type Scope = 'main' | 'sub';

function parseScope(sp: URLSearchParams) {
  const scope = sp.get('scope') as Scope | null;
  const scopeKey = (sp.get('scopeKey') || '').trim();
  if (scope !== 'main' && scope !== 'sub') return null;
  if (!scopeKey) return null;
  return { scope, scopeKey };
}

/** Mongo filter selecting every product config underneath a scope. */
function filterFor(scope: Scope, scopeKey: string): Record<string, string> | null {
  if (scope === 'main') return { mainSlug: scopeKey };
  const [mainSlug, subSlug] = scopeKey.split('__');
  if (!mainSlug || !subSlug) return null;
  return { mainSlug, subSlug };
}

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!can(session?.role, 'sampleQuiz.manage')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    await connectDB();

    const parsed = parseScope(req.nextUrl.searchParams);
    if (!parsed) return NextResponse.json({ error: 'Invalid scope' }, { status: 400 });

    const filter = filterFor(parsed.scope, parsed.scopeKey);
    if (!filter) return NextResponse.json({ error: 'Invalid scopeKey' }, { status: 400 });

    const [count, latest, masters] = await Promise.all([
      ProductSpecConfig.countDocuments(filter),
      ProductSpecConfig.findOne(filter).sort({ updatedAt: -1 }).lean(),
      SpecOptionMaster.find({ active: true }).lean(),
    ]);

    if (count === 0) {
      return NextResponse.json({ error: 'No products under this scope' }, { status: 404 });
    }

    // How consistent are the products underneath? The UI warns when they differ,
    // because saving will flatten them onto one configuration.
    const all = await ProductSpecConfig.find(filter).select('specs').lean();
    const fingerprint = (specs: unknown) => JSON.stringify(specs);
    const reference = fingerprint((latest as { specs?: unknown })?.specs ?? []);
    const identical = all.every((c) => fingerprint((c as { specs?: unknown }).specs ?? []) === reference);

    return NextResponse.json(
      {
        scope: parsed.scope,
        scopeKey: parsed.scopeKey,
        productCount: count,
        uniform: identical,
        specs: (latest as { specs?: unknown })?.specs ?? [],
        masters,
      },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getSession();
    if (!can(session?.role, 'sampleQuiz.manage')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    await connectDB();

    const body = await req.json();
    const scope = body.scope as Scope;
    const scopeKey = String(body.scopeKey || '').trim();
    const specs = body.specs;

    if ((scope !== 'main' && scope !== 'sub') || !scopeKey) {
      return NextResponse.json({ error: 'Invalid scope' }, { status: 400 });
    }
    if (!Array.isArray(specs)) {
      return NextResponse.json({ error: 'specs must be an array' }, { status: 400 });
    }

    const filter = filterFor(scope, scopeKey);
    if (!filter) return NextResponse.json({ error: 'Invalid scopeKey' }, { status: 400 });

    // Normalise sort order so every product ends up with the same sequence.
    const normalised = specs.map((s: Record<string, unknown>, i: number) => ({ ...s, sortOrder: i }));

    const res = await ProductSpecConfig.updateMany(filter, {
      $set: { specs: normalised, updatedAt: new Date() },
    });

    return NextResponse.json({
      updated: res.modifiedCount ?? 0,
      matched: res.matchedCount ?? 0,
      scope,
      scopeKey,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
