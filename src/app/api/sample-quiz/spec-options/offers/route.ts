import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import ProductSpecConfig from '@/models/ProductSpecConfig';
import SpecOptionMaster from '@/models/SpecOptionMaster';
import { getSession } from '@/lib/auth';
import { can } from '@/lib/roles';

export const dynamic = 'force-dynamic';

/**
 * Which products offer one library option — and turning that on or off.
 *
 * Adding an option to a library is only half the decision; each product keeps
 * its own allow-list, so "who offers this?" is a real question with a real
 * answer, and an admin who unticks the bulk attach needs somewhere to make
 * that choice deliberately.
 *
 * The one trap: an empty allow-list means "offer everything", so such a product
 * offers the option without naming it. Removing the option from that product
 * cannot be a pull — there is nothing to pull. The list has to be written out
 * in full, minus this one value, which is exactly what a customer-visible
 * "everything except that" requires.
 */

async function requireManage() {
  const session = await getSession();
  return can(session?.role, 'sampleQuiz.manage');
}

interface SpecRow {
  specKey: string;
  enabled: boolean;
  allowedOptions: string[];
}

export async function GET(req: NextRequest) {
  try {
    if (!(await requireManage())) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    await connectDB();

    const params = req.nextUrl.searchParams;
    const categoryKey = (params.get('categoryKey') || '').trim();
    const value = (params.get('value') || '').trim();
    if (!categoryKey || !value) {
      return NextResponse.json({ error: 'categoryKey and value are required' }, { status: 400 });
    }

    const configs = await ProductSpecConfig.find(
      { 'specs.specKey': categoryKey },
      { productKey: 1, itemName: 1, mainSlug: 1, subSlug: 1, specs: 1 }
    ).lean();

    const products = configs
      .map((c: Record<string, unknown>) => {
        const specs = (c.specs as SpecRow[]) || [];
        const spec = specs.find((s) => s.specKey === categoryKey);
        if (!spec) return null;
        const all = (spec.allowedOptions || []).length === 0;
        return {
          productKey: c.productKey as string,
          itemName: c.itemName as string,
          mainSlug: c.mainSlug as string,
          subSlug: c.subSlug as string,
          /** The spec itself can be switched off for this product. */
          specEnabled: !!spec.enabled,
          /** No allow-list at all — this product offers every option there is. */
          offersAll: all,
          offers: all || spec.allowedOptions.includes(value),
        };
      })
      .filter(Boolean)
      .sort((a, b) => {
        const x = a as { mainSlug: string; itemName: string };
        const y = b as { mainSlug: string; itemName: string };
        return x.mainSlug.localeCompare(y.mainSlug) || x.itemName.localeCompare(y.itemName);
      });

    return NextResponse.json(
      { categoryKey, value, products },
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
    const categoryKey = String(body.categoryKey || '').trim();
    const value = String(body.value || '').trim();
    const attach: string[] = Array.isArray(body.attach) ? body.attach.map(String) : [];
    const detach: string[] = Array.isArray(body.detach) ? body.detach.map(String) : [];

    if (!categoryKey || !value) {
      return NextResponse.json({ error: 'categoryKey and value are required' }, { status: 400 });
    }
    if (attach.length === 0 && detach.length === 0) {
      return NextResponse.json({ attached: 0, detached: 0 });
    }

    const master = await SpecOptionMaster.findOne({ categoryKey }).lean();
    if (!master) {
      return NextResponse.json({ error: 'Unknown option category' }, { status: 404 });
    }
    const everyValue: string[] = ((master as { options?: Array<{ value: string }> }).options || []).map(
      (o) => o.value
    );

    let attached = 0;
    let detached = 0;

    if (attach.length > 0) {
      // A product with no allow-list already offers everything, so it needs no
      // change — and writing one value into it would cut it down to that value.
      const res = await ProductSpecConfig.updateMany(
        {
          productKey: { $in: attach },
          specs: { $elemMatch: { specKey: categoryKey, 'allowedOptions.0': { $exists: true } } },
        },
        { $addToSet: { 'specs.$[spec].allowedOptions': value } },
        { arrayFilters: [{ 'spec.specKey': categoryKey, 'spec.allowedOptions.0': { $exists: true } }] }
      );
      attached = res.modifiedCount ?? 0;
    }

    if (detach.length > 0) {
      // Named lists: a plain pull.
      const pulled = await ProductSpecConfig.updateMany(
        {
          productKey: { $in: detach },
          specs: { $elemMatch: { specKey: categoryKey, 'allowedOptions.0': { $exists: true } } },
        },
        { $pull: { 'specs.$[spec].allowedOptions': value } },
        { arrayFilters: [{ 'spec.specKey': categoryKey, 'spec.allowedOptions.0': { $exists: true } }] }
      );

      // "Offers everything" lists: spell the list out, minus this option, or the
      // removal would be silently ignored.
      const spelled = await ProductSpecConfig.updateMany(
        {
          productKey: { $in: detach },
          specs: { $elemMatch: { specKey: categoryKey, allowedOptions: { $size: 0 } } },
        },
        { $set: { 'specs.$[spec].allowedOptions': everyValue.filter((v) => v !== value) } },
        { arrayFilters: [{ 'spec.specKey': categoryKey, 'spec.allowedOptions': { $size: 0 } }] }
      );

      detached = (pulled.modifiedCount ?? 0) + (spelled.modifiedCount ?? 0);
    }

    return NextResponse.json({ attached, detached });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
