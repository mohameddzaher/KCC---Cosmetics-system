import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import SpecOptionMaster from '@/models/SpecOptionMaster';
import ProductSpecConfig from '@/models/ProductSpecConfig';
import { getSession } from '@/lib/auth';
import { can } from '@/lib/roles';

export const dynamic = 'force-dynamic';

/**
 * Whole libraries: creating one, and removing one.
 *
 * Editing a library's own name lives on the parent route's PUT. This is the
 * level above the options — "I want a new question with its own list of
 * answers" — which previously required a seed script.
 *
 * A new library reaches nobody until products carry it, so creating one offers
 * to attach it to every product at once. That attach writes the spec with an
 * empty allow-list on purpose: empty means "offer everything in the library",
 * so the list stays correct as options are added later.
 */

const WIDGETS = [
  'chips-multi',
  'chips-single',
  'color-swatches',
  'icon-cards',
  'visual-cards',
  'fragrance-flow',
];

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

async function requireManage() {
  const session = await getSession();
  return can(session?.role, 'sampleQuiz.manage');
}

export async function POST(req: NextRequest) {
  try {
    if (!(await requireManage())) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    await connectDB();

    const body = await req.json();
    const titleEn = String(body.defaultTitleEn || '').trim();
    const widget = String(body.widget || 'chips-multi');

    if (!titleEn) {
      return NextResponse.json({ error: 'defaultTitleEn is required' }, { status: 400 });
    }
    if (!WIDGETS.includes(widget)) {
      return NextResponse.json({ error: 'Unknown widget' }, { status: 400 });
    }

    const categoryKey = slugify(String(body.categoryKey || '') || titleEn);
    if (!categoryKey) {
      return NextResponse.json({ error: 'Could not derive a key from that name' }, { status: 400 });
    }

    if (await SpecOptionMaster.findOne({ categoryKey })) {
      return NextResponse.json({ error: `A library named "${categoryKey}" already exists` }, { status: 409 });
    }

    const master = await SpecOptionMaster.create({
      categoryKey,
      defaultTitleEn: titleEn,
      defaultTitleAr: String(body.defaultTitleAr || '').trim() || undefined,
      defaultSubtitleEn: String(body.defaultSubtitleEn || '').trim() || undefined,
      defaultSubtitleAr: String(body.defaultSubtitleAr || '').trim() || undefined,
      widget,
      options: [],
      active: true,
    });

    // Always attached, never optional. A library that no product carries is
    // invisible to every customer AND unreachable from the admin panel — no
    // screen adds a missing category back to a product config — so "do not
    // attach" was an answer that led nowhere. Switched off is the safe part:
    // nothing is asked until someone turns it on for that product.
    let productsUpdated = 0;
    if (body.attachToProducts !== false) {
      // Appended last and switched off, so a half-built library cannot appear in
      // front of a customer the moment it is created.
      const highest = await ProductSpecConfig.findOne({}, { specs: 1 })
        .sort({ 'specs.sortOrder': -1 })
        .lean();
      const sortOrder = ((highest as { specs?: Array<{ sortOrder?: number }> } | null)?.specs?.length ?? 0) + 10;

      const res = await ProductSpecConfig.updateMany(
        { 'specs.specKey': { $ne: categoryKey } },
        {
          $push: {
            specs: {
              specKey: categoryKey,
              enabled: false,
              maxSelect: widget.endsWith('-single') ? 1 : 5,
              isRequired: false,
              sortOrder,
              allowedOptions: [],
            },
          },
        }
      );
      productsUpdated = res.modifiedCount ?? 0;
    }

    return NextResponse.json({ categoryKey: master.categoryKey, productsUpdated }, { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    if (!(await requireManage())) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    await connectDB();

    const categoryKey = (req.nextUrl.searchParams.get('categoryKey') || '').trim();
    if (!categoryKey) {
      return NextResponse.json({ error: 'categoryKey is required' }, { status: 400 });
    }

    const master = await SpecOptionMaster.findOne({ categoryKey });
    if (!master) {
      return NextResponse.json({ error: 'Unknown option category' }, { status: 404 });
    }

    // Deleting a library that products still ask about would leave those specs
    // pointing at nothing, and the customer would meet an empty question.
    // Switching it off is the reversible way to retire one.
    if (master.options.length > 0) {
      return NextResponse.json(
        { error: 'Remove its options first, or switch the library off instead' },
        { status: 409 }
      );
    }

    await SpecOptionMaster.deleteOne({ categoryKey });
    const res = await ProductSpecConfig.updateMany(
      { 'specs.specKey': categoryKey },
      { $pull: { specs: { specKey: categoryKey } } }
    );

    return NextResponse.json({ removed: categoryKey, productsUpdated: res.modifiedCount ?? 0 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
