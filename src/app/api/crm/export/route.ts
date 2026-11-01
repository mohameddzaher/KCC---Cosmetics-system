import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import CrmAccount from '@/models/CrmAccount';
import CrmActivity from '@/models/CrmActivity';
import ProductCode from '@/models/ProductCode';
import { getSession } from '@/lib/auth';
import { can } from '@/lib/roles';
import { buildXlsx, type XlsxColumn } from '@/lib/xlsx';
import { accountScope, activityScope } from '@/lib/crmScope';
import { categoryMeta, cityMeta } from '@/lib/crmVocab';
import { STEP_ORDER } from '@/lib/crmProgress';
import { computeKpis } from '../kpis/route';
import { computePlans } from '../plan/route';

export const dynamic = 'force-dynamic';

/**
 * One place that turns a filtered CRM view into a workbook.
 *
 * It re-runs the screen's own filters on the server rather than taking rows
 * from the browser, so an export is the same data the screen showed and a
 * person cannot be handed a spreadsheet of something they are not allowed to
 * see. Headers are English whatever the screen language: these files go to
 * factories, partners and head office.
 */

function sheetFor(what: string, p: URLSearchParams) {
  const stamp = new Date().toISOString().slice(0, 10);
  const suffix = p.get('stage') || p.get('category') || '';
  return {
    file: `kcc-${what}${suffix ? `-${suffix}` : ''}-${stamp}.xlsx`,
    stamp,
  };
}

export async function GET(req: NextRequest) {
  try {
    const user = await getSession();
    if (!can(user?.role, 'crm.view')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    await connectDB();

    const p = req.nextUrl.searchParams;
    const what = p.get('what') || 'accounts';
    const { file, stamp } = sheetFor(what, p);

    let columns: XlsxColumn[] = [];
    let rows: Array<Record<string, unknown>> = [];
    let title = '';
    let totalsFor: string[] = [];
    let sheetName = 'Export';

    /* ----------------------------- accounts ----------------------------- */
    if (what === 'accounts') {
      const filter: Record<string, unknown> = {
        active: { $ne: false },
        ...(await accountScope(user)),
      };
      for (const [param, field] of [['stage', 'stage'], ['category', 'category'], ['city', 'city']] as const) {
        const v = p.get(param);
        if (v && v !== 'all') filter[field] = v;
      }
      const q = (p.get('q') || '').trim();
      if (q) {
        const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        filter.$or = [{ name: rx }, { nameAr: rx }, { brands: rx }, { 'keyPerson.name': rx }];
      }

      const docs = await CrmAccount.find(filter).sort({ name: 1 }).limit(5000).lean();
      sheetName = 'Accounts';
      title = `KCC — CRM accounts (${stamp})`;
      columns = [
        { header: 'Company', key: 'name', width: 34 },
        { header: 'Company (Arabic)', key: 'nameAr', width: 30 },
        { header: 'Sector', key: 'sector', width: 22 },
        { header: 'City', key: 'city', width: 18 },
        { header: 'Segment', key: 'segment', width: 22 },
        { header: 'Brands', key: 'brands', width: 28 },
        { header: 'Stage', key: 'stage', width: 12 },
        { header: 'Owner', key: 'owner', width: 20 },
        { header: 'Key person', key: 'person', width: 22 },
        { header: 'Position', key: 'position', width: 18 },
        { header: 'Phone', key: 'phone', width: 18 },
        { header: 'Steps done', key: 'steps', width: 12, type: 'number' },
        { header: 'Visits', key: 'visits', width: 10, type: 'number' },
        { header: 'Meetings', key: 'meetings', width: 11, type: 'number' },
        { header: 'Last action', key: 'last', width: 14 },
        { header: 'Feedback', key: 'feedback', width: 24 },
        { header: 'What they need', key: 'requirement', width: 30 },
        { header: 'Next step', key: 'nextStep', width: 30 },
      ];
      totalsFor = ['visits', 'meetings'];
      rows = docs.map((a: Record<string, unknown>) => ({
        name: a.name,
        nameAr: a.nameAr || '',
        sector: categoryMeta(String(a.category || '')).labelEn,
        city: cityMeta(String(a.city || '')).labelEn,
        segment: a.segment || '',
        brands: Array.isArray(a.brands) ? (a.brands as string[]).join(', ') : '',
        stage: a.stage,
        owner: a.ownerName || '',
        person: (a.keyPerson as { name?: string })?.name || '',
        position: (a.keyPerson as { position?: string })?.position || '',
        phone: (a.keyPerson as { phone?: string })?.phone || '',
        steps: STEP_ORDER.filter((k) => (a.steps as Record<string, unknown>)?.[k]).length,
        visits: a.visitCount || 0,
        meetings: a.meetingCount || 0,
        last: a.lastActionAt ? new Date(a.lastActionAt as Date).toISOString().slice(0, 10) : '',
        feedback: a.feedback || '',
        requirement: a.requirement || '',
        nextStep: a.nextStep || '',
      }));
    }

    /* ----------------------------- catalogue ----------------------------- */
    else if (what === 'catalogue') {
      const filter: Record<string, unknown> = { active: { $ne: false } };
      for (const [param, field] of [['category', 'category'], ['status', 'status'], ['package', 'package']] as const) {
        const v = p.get(param);
        if (v && v !== 'all') filter[field] = v;
      }
      const costed = p.get('costed');
      if (costed === 'yes') filter.cost = { $gt: 0 };
      if (costed === 'no') filter.$or = [{ cost: null }, { cost: { $exists: false } }, { cost: 0 }];
      const q = (p.get('q') || '').trim();
      if (q) {
        const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        filter.$and = [{ $or: [{ product: rx }, { code: rx }, { ingredients: rx }] }];
      }

      const docs = await ProductCode.find(filter).sort({ category: 1, product: 1 }).limit(5000).lean();
      sheetName = 'Code Catalogue';
      title = `KCC — Code catalogue (${stamp})`;
      columns = [
        { header: 'Code', key: 'code', width: 14 },
        { header: 'Category', key: 'category', width: 22 },
        { header: 'Product', key: 'product', width: 48 },
        { header: 'Status', key: 'status', width: 16 },
        { header: 'Volume (ml)', key: 'volume', width: 12, type: 'number' },
        { header: 'Package', key: 'package', width: 18 },
        { header: 'Form', key: 'form', width: 18 },
        { header: 'International benchmark', key: 'benchmarkIntl', width: 42 },
        { header: 'Benchmark RSP (SAR)', key: 'rspSaudi', width: 18, type: 'money' },
        { header: 'Saudi benchmark brand', key: 'benchmarkSaudi', width: 34 },
        { header: 'Cost (SAR)', key: 'cost', width: 14, type: 'money' },
        { header: 'Shelf price (SAR)', key: 'rsp', width: 16, type: 'money' },
        { header: 'Cost / shelf price', key: 'costRatio', width: 16, type: 'percent' },
        { header: 'KCC recommended (SAR)', key: 'kccRecommendedSar', width: 20, type: 'money' },
        { header: 'ECC price (EGP)', key: 'priceEccEgp', width: 16, type: 'number' },
        { header: 'Bonn factory (SAR)', key: 'bonnSar', width: 17, type: 'money' },
        { header: 'Al Kamal UAE', key: 'alKamalUae', width: 14, type: 'number' },
        { header: 'Ingredients', key: 'ingredients', width: 60 },
      ];
      totalsFor = ['volume', 'cost', 'rsp', 'kccRecommendedSar'];
      rows = docs.map((i: Record<string, unknown>) => ({
        ...i,
        status: i.status || 'In development',
      }));
    }

    /* -------------------- complaints and suggestions -------------------- */
    else if (what === 'feedback') {
      const filter: Record<string, unknown> = { ...(await activityScope(user)), backfilled: { $ne: true } };
      const types = (p.get('type') || 'complaint,suggestion').split(',').map((t) => t.trim()).filter(Boolean);
      filter.type = { $in: types };
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
        filter.at = range;
      }

      const docs = await CrmActivity.find(filter)
        .populate('accountId', 'name nameAr category city ownerName')
        .sort({ at: -1 })
        .limit(5000)
        .lean();
      sheetName = 'Complaints and suggestions';
      title = `KCC — complaints and suggestions (${stamp})`;
      columns = [
        { header: 'Type', key: 'type', width: 14 },
        { header: 'Account', key: 'account', width: 34 },
        { header: 'Sector', key: 'sector', width: 22 },
        { header: 'City', key: 'city', width: 16 },
        { header: 'Owner', key: 'owner', width: 20 },
        { header: 'What they said', key: 'body', width: 60 },
        { header: 'Logged by', key: 'by', width: 20 },
        { header: 'Date', key: 'date', width: 14 },
        { header: 'Handled', key: 'handled', width: 12 },
        { header: 'What was done', key: 'outcome', width: 50 },
      ];
      rows = docs.map((r: Record<string, unknown>) => {
        const acc = r.accountId as Record<string, unknown> | undefined;
        return {
          type: r.type === 'complaint' ? 'Complaint' : 'Suggestion',
          account: acc?.name || '',
          sector: categoryMeta(String(acc?.category || '')).labelEn,
          city: cityMeta(String(acc?.city || '')).labelEn,
          owner: acc?.ownerName || '',
          body: r.body || '',
          by: r.byName || '',
          date: new Date(r.at as Date).toISOString().slice(0, 10),
          handled: r.done ? 'Yes' : 'No',
          outcome: r.outcome || '',
        };
      });
    }

    /* ------------------------------- KPIs ------------------------------- */
    else if (what === 'kpis') {
      const period = p.get('period') || 'week';
      const data = await computeKpis(user, period);
      const people = data.people as Array<Record<string, unknown>>;
      sheetName = 'Sales KPIs';
      title = `KCC — sales KPIs, ${period} to ${stamp}`;
      columns = [
        { header: 'Rep', key: 'name', width: 24 },
        { header: 'Role', key: 'role', width: 18 },
        { header: 'Visits', key: 'visits', width: 10, type: 'number' },
        { header: 'Meetings', key: 'meetings', width: 11, type: 'number' },
        { header: 'Calls', key: 'calls', width: 10, type: 'number' },
        { header: 'Samples asked', key: 'sampleRequests', width: 15, type: 'number' },
        { header: 'Complaints', key: 'complaints', width: 12, type: 'number' },
        { header: 'Suggestions', key: 'suggestions', width: 12, type: 'number' },
        { header: 'Accounts seen', key: 'accountsSeen', width: 14, type: 'number' },
        { header: 'Active days', key: 'activeDays', width: 12, type: 'number' },
        { header: 'Visits per day', key: 'visitsPerDay', width: 14, type: 'number' },
        { header: 'Daily target', key: 'target', width: 13 },
        { header: 'Attainment', key: 'attainment', width: 13, type: 'percent' },
        { header: 'Calls with the checklist', key: 'callsWithChecklist', width: 20, type: 'number' },
      ];
      totalsFor = ['visits', 'meetings', 'calls', 'sampleRequests', 'complaints', 'suggestions', 'accountsSeen'];
      rows = people.map((x) => ({
        name: x.name,
        role: x.role,
        visits: x.visits,
        meetings: x.meetings,
        calls: x.calls,
        sampleRequests: x.sampleRequests,
        complaints: x.complaints,
        suggestions: x.suggestions,
        accountsSeen: x.accountsSeen,
        activeDays: x.activeDays,
        visitsPerDay: x.visitsPerDay,
        target: `${(x.dailyTarget as { min: number }).min}-${(x.dailyTarget as { max: number }).max}`,
        attainment: Number(x.dailyAttainmentPct) / 100,
        callsWithChecklist: x.callsWithChecklist,
      }));
    }

    /* ---------------------------- journey plan ---------------------------- */
    else if (what === 'plan') {
      const data = await computePlans(user, p) as Record<string, unknown>;
      if (data.error) return NextResponse.json(data, { status: 403 });
      const plans = (data.plans || []) as Array<Record<string, unknown>>;
      sheetName = 'Journey plan';
      title = `KCC — journey plan, week of ${new Date(data.from as string).toISOString().slice(0, 10)}`;
      columns = [
        { header: 'Date', key: 'date', width: 14 },
        { header: 'Day', key: 'day', width: 14 },
        { header: 'Rep', key: 'rep', width: 24 },
        { header: 'Account', key: 'account', width: 34 },
        { header: 'City', key: 'city', width: 16 },
        { header: 'Visited', key: 'visited', width: 12 },
        { header: 'Note', key: 'note', width: 36 },
      ];
      const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      rows = plans.flatMap((pl) =>
        ((pl.items || []) as Array<Record<string, unknown>>).map((i) => {
          const acc = i.accountId as Record<string, unknown> | undefined;
          const day = new Date(pl.date as string);
          return {
            date: day.toISOString().slice(0, 10),
            day: DAYS[day.getDay()],
            rep: pl.ownerName || (pl.ownerId as { name?: string })?.name || '',
            account: acc?.name || '',
            city: cityMeta(String(acc?.city || '')).labelEn,
            visited: i.visited ? 'Yes' : 'No',
            note: i.note || '',
          };
        })
      );
    }

    else {
      return NextResponse.json({ error: `Nothing to export called "${what}"` }, { status: 400 });
    }

    const book = buildXlsx({ sheetName, columns, rows, totalsFor, title });

    return new NextResponse(new Uint8Array(book), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${file}"`,
        'Content-Length': String(book.length),
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
