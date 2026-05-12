import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Invoice from '@/models/Invoice';
import Payment from '@/models/Payment';
import Expense from '@/models/Expense';
import { getSession } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user || !['SUPER_ADMIN', 'ADMIN'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    await connectDB();

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');

    if (!type || !['revenue', 'outstanding', 'expenses', 'profit'].includes(type)) {
      return NextResponse.json({ error: 'Valid report type is required: revenue, outstanding, expenses, profit' }, { status: 400 });
    }

    let report: any;

    switch (type) {
      case 'revenue': {
        report = await Payment.aggregate([
          { $match: { status: 'completed' } },
          {
            $group: {
              _id: {
                year: { $year: '$paidAt' },
                month: { $month: '$paidAt' },
              },
              totalRevenue: { $sum: '$amount' },
              paymentCount: { $sum: 1 },
            },
          },
          {
            $sort: { '_id.year': -1, '_id.month': -1 },
          },
        ]);
        break;
      }

      case 'outstanding': {
        const outstandingResult = await Invoice.aggregate([
          { $match: { status: { $in: ['draft', 'sent', 'overdue'] } } },
          {
            $group: {
              _id: '$status',
              totalAmount: { $sum: '$total' },
              count: { $sum: 1 },
            },
          },
        ]);

        const totalOutstanding = outstandingResult.reduce(
          (sum: number, item: any) => sum + item.totalAmount,
          0
        );

        report = {
          breakdown: outstandingResult,
          totalOutstanding,
        };
        break;
      }

      case 'expenses': {
        report = await Expense.aggregate([
          {
            $group: {
              _id: '$category',
              totalAmount: { $sum: '$amount' },
              count: { $sum: 1 },
            },
          },
          { $sort: { totalAmount: -1 } },
        ]);
        break;
      }

      case 'profit': {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

        const [revenueResult, expenseResult] = await Promise.all([
          Payment.aggregate([
            {
              $match: {
                status: 'completed',
                paidAt: { $gte: startOfMonth, $lte: endOfMonth },
              },
            },
            { $group: { _id: null, total: { $sum: '$amount' } } },
          ]),
          Expense.aggregate([
            {
              $match: {
                date: { $gte: startOfMonth, $lte: endOfMonth },
              },
            },
            { $group: { _id: null, total: { $sum: '$amount' } } },
          ]),
        ]);

        const totalRevenue = revenueResult[0]?.total || 0;
        const totalExpenses = expenseResult[0]?.total || 0;

        report = {
          month: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
          revenue: totalRevenue,
          expenses: totalExpenses,
          profit: totalRevenue - totalExpenses,
        };
        break;
      }
    }

    return NextResponse.json({ type, report });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to generate report' }, { status: 500 });
  }
}
