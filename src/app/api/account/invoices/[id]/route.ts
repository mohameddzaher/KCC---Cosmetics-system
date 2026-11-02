import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/db';
import Invoice from '@/models/Invoice';
import Payment from '@/models/Payment';
import SiteSettings from '@/models/SiteSettings';
import { getSession } from '@/lib/auth';
import { sellerDetails } from '@/lib/accounting';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

/**
 * A customer's own invoice. "Not found", never "forbidden", for anyone else's:
 * the answer should not confirm that an id exists. A draft is not the customer's
 * to see until it is issued.
 */
export async function GET(_req: NextRequest, context: RouteContext) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await connectDB();

    const { id } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const invoice = await Invoice.findOne({ _id: id, userId: user.id, status: { $ne: 'draft' } })
      .select('-notes')
      .populate('userId', 'name email company')
      .populate('orderId', 'orderNumber type')
      .lean();
    if (!invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const [payments, settings] = await Promise.all([
      Payment.find({ invoiceId: id, status: { $in: ['completed', 'refunded'] } })
        .select('amount method status paidAt')
        .sort({ paidAt: -1 })
        .lean(),
      SiteSettings.findOne({ key: 'main' }).lean(),
    ]);

    return NextResponse.json({ invoice, payments, ...(await sellerDetails(invoice as never, settings)) });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
