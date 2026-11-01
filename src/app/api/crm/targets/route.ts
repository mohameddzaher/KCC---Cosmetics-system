import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import CrmTarget from '@/models/CrmTarget';
import { getSession } from '@/lib/auth';
import { can } from '@/lib/roles';
import { DEFAULT_VISIT_CHECKLIST } from '@/lib/crmProgress';

export const dynamic = 'force-dynamic';

/**
 * The sales targets and the six-step process.
 *
 * Editable because they are the business's numbers: "4 to 5 visits a day" is a
 * decision someone made and may revise, and a target hardcoded into a dashboard
 * is a target nobody can correct.
 */

export async function GET() {
  try {
    const user = await getSession();
    if (!can(user?.role, 'crm.view')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    await connectDB();

    let doc = (await CrmTarget.findOneAndUpdate(
      { key: 'main' },
      { $setOnInsert: { key: 'main' } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean()) as Record<string, unknown> | null;

    // A Mongoose default only applies when a document is inserted. This one was
    // created before the checklist existed, so without filling it in here a rep
    // would be shown no call structure at all.
    const checklist = (doc?.visitChecklist as unknown[] | undefined) || [];
    if (checklist.length === 0) {
      doc = (await CrmTarget.findOneAndUpdate(
        { key: 'main' },
        { $set: { visitChecklist: DEFAULT_VISIT_CHECKLIST } },
        { new: true }
      ).lean()) as Record<string, unknown> | null;
    }

    return NextResponse.json(doc, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getSession();
    // The commercial manager owns how the team is asked to work — the visit
    // checklist, the targets, the sector split — so this is crm.edit rather
    // than settings.manage, which he would not have.
    if (!can(user?.role, 'crm.edit')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    await connectDB();

    const body = await req.json();
    const set: Record<string, unknown> = {};

    const pair = (v: unknown) => {
      const o = v as { min?: unknown; max?: unknown } | undefined;
      const min = Math.max(0, Number(o?.min) || 0);
      const max = Math.max(min, Number(o?.max) || min);
      return { min, max };
    };

    if (body.dailyVisits) set.dailyVisits = pair(body.dailyVisits);
    if (body.weeklyClients) set.weeklyClients = pair(body.weeklyClients);
    if (body.visitsPerAccountWeekly !== undefined) {
      set.visitsPerAccountWeekly = Math.max(0, Number(body.visitsPerAccountWeekly) || 0);
    }
    if (body.visitsPerAccountMonthly !== undefined) {
      set.visitsPerAccountMonthly = Math.max(0, Number(body.visitsPerAccountMonthly) || 0);
    }
    if (Array.isArray(body.sectorMix)) {
      set.sectorMix = body.sectorMix.map((g: Record<string, unknown>) => ({
        key: String(g.key || '').trim(),
        labelEn: String(g.labelEn || ''),
        labelAr: String(g.labelAr || ''),
        sharePct: Math.max(0, Math.min(100, Number(g.sharePct) || 0)),
        categories: Array.isArray(g.categories) ? g.categories.map(String) : [],
      })).filter((g: { key: string }) => g.key);
    }
    if (Array.isArray(body.steps)) {
      set.steps = body.steps.map((s: Record<string, unknown>, i: number) => ({
        key: String(s.key || '').trim(),
        order: Number(s.order) || i + 1,
        labelEn: String(s.labelEn || ''),
        labelAr: String(s.labelAr || ''),
        checklist: Array.isArray(s.checklist) ? s.checklist.map(String).filter(Boolean) : [],
      })).filter((s: { key: string }) => s.key);
    }
    if (Array.isArray(body.visitChecklist)) {
      set.visitChecklist = body.visitChecklist
        .map((c: Record<string, unknown>, i: number) => ({
          key: String(c.key || '').trim() || `step-${i + 1}`,
          order: Number(c.order) || i + 1,
          labelEn: String(c.labelEn || '').trim(),
          labelAr: String(c.labelAr || '').trim(),
          required: !!c.required,
        }))
        .filter((c: { labelEn: string; labelAr: string }) => c.labelEn || c.labelAr);
    }
    if (Array.isArray(body.statusOptions)) {
      set.statusOptions = body.statusOptions.map(String).filter(Boolean);
    }

    const doc = await CrmTarget.findOneAndUpdate(
      { key: 'main' },
      { $set: set },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();

    return NextResponse.json(doc);
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
