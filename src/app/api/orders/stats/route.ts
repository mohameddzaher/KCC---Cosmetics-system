import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Order from '@/models/Order';
import { getSession, isAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET /api/orders/stats -> aggregated order analytics for the admin orders dashboard
export async function GET() {
  try {
    const user = await getSession();
    if (!user || !['SUPER_ADMIN', 'ADMIN', 'STAFF'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    await connectDB();

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [total, byType, byStatus, byPayment, revenueAgg, monthCount, last6] = await Promise.all([
      Order.countDocuments({}),
      Order.aggregate([{ $group: { _id: '$type', count: { $sum: 1 } } }]),
      Order.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Order.aggregate([{ $group: { _id: '$paymentStatus', count: { $sum: 1 } } }]),
      Order.aggregate([{ $group: { _id: null, total: { $sum: '$totals.total' } } }]),
      Order.countDocuments({ createdAt: { $gte: startOfMonth } }),
      Order.aggregate([
        { $match: { createdAt: { $gte: new Date(now.getFullYear(), now.getMonth() - 5, 1) } } },
        { $group: { _id: { y: { $year: '$createdAt' }, m: { $month: '$createdAt' } }, count: { $sum: 1 } } },
        { $sort: { '_id.y': 1, '_id.m': 1 } },
      ]),
    ]);

    const asMap = (arr: any[]) => Object.fromEntries(arr.map((x) => [x._id || 'unknown', x.count]));

    return NextResponse.json({
      total,
      thisMonth: monthCount,
      revenue: revenueAgg[0]?.total || 0,
      byType: asMap(byType),
      byStatus: asMap(byStatus),
      byPayment: asMap(byPayment),
      monthly: last6.map((x) => ({
        label: new Date(x._id.y, x._id.m - 1, 1).toLocaleDateString('en-US', { month: 'short' }),
        count: x.count,
      })),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to compute stats' }, { status: 500 });
  }
}
