import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Payment from '@/models/Payment';
import { getSession } from '@/lib/auth';
import { can } from '@/lib/roles';
import { computeReceivables, computeSummary, unbilledOrders } from '@/lib/accountingReports';

export const dynamic = 'force-dynamic';

/** The period's figures. Defaults to this calendar month. */
export async function GET(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user || !can(user.role, 'accounting.view')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    await connectDB();

    const p = req.nextUrl.searchParams;
    const now = new Date();
    const from = p.get('from') ? new Date(`${p.get('from')}T00:00:00`) : new Date(now.getFullYear(), now.getMonth(), 1);
    const to = p.get('to') ? new Date(`${p.get('to')}T23:59:59.999`) : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const [summary, receivables, unbilled, recent] = await Promise.all([
      computeSummary(from, to),
      computeReceivables(),
      unbilledOrders(),
      Payment.find({ status: 'completed' })
        .select('amount method paidAt invoiceId userId')
        .populate('invoiceId', 'invoiceNumber')
        .populate('userId', 'name')
        .sort({ paidAt: -1 })
        .limit(6)
        .lean(),
    ]);

    return NextResponse.json({
      ...summary,
      receivables: { total: receivables.total, buckets: receivables.buckets, overdue: receivables.invoices.filter((i) => i.bucket !== 'current').slice(0, 8) },
      unbilled,
      recent,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
