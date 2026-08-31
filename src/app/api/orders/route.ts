import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Order from '@/models/Order';
import PromoCode from '@/models/PromoCode';
import PromoUsage from '@/models/PromoUsage';
import Referral from '@/models/Referral';
import User from '@/models/User';
import Notification from '@/models/Notification';
import { getSession } from '@/lib/auth';
import { can } from '@/lib/roles';
import { scopeFilterForRole } from '@/lib/orderWorkflow';
import { generateOrderNumber } from '@/lib/api-helpers';
import { sendEventEmail, adminUrl } from '@/lib/mailer';

const toNonNegNumber = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

export async function GET(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};

    if (can(user.role, 'orders.view')) {
      // Staff see the queue their role is responsible for. `orders.viewAll`
      // lifts that restriction; the factory, for instance, never sees an order
      // that has not been released to production.
      if (!can(user.role, 'orders.viewAll')) {
        const scope = scopeFilterForRole(user.role, user.id);
        if (scope) Object.assign(filter, scope);
      }
    } else {
      // Customers only ever see their own orders.
      filter.userId = user.id;
    }

    if (type) filter.type = type;
    // An explicit ?status= narrows within — never widens — the role scope.
    if (status) {
      const scoped = filter.status as { $in?: string[] } | undefined;
      if (!scoped?.$in || scoped.$in.includes(status)) filter.status = status;
    }
    const assignedTo = searchParams.get('assignedTo');
    if (assignedTo === 'me') {
      filter.$or = [
        { 'assignments.accountManagerId': user.id },
        { 'assignments.factoryUserId': user.id },
        { 'assignments.logisticsUserId': user.id },
      ];
    }

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('userId', 'name email company')
        .populate('promoCodeId', 'code type value')
        .populate('assignments.accountManagerId', 'name email role')
        .populate('assignments.factoryUserId', 'name email role')
        .populate('assignments.logisticsUserId', 'name email role')
        .lean(),
      Order.countDocuments(filter),
    ]);

    return NextResponse.json({
      orders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('Orders GET error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    // Ordering is restricted to accounts we created — no guests, no self-signup.
    const user = await getSession();
    if (!user) {
      return NextResponse.json(
        { error: 'You must be signed in with an account provided by KCC to place a request.' },
        { status: 401 }
      );
    }

    await connectDB();
    const body = await req.json();

    // Validate required fields
    if (!body.type || !['sample', 'bulk'].includes(body.type)) {
      return NextResponse.json(
        { error: 'type is required and must be "sample" or "bulk"' },
        { status: 400 }
      );
    }

    // Generate unique order number
    const orderNumber = generateOrderNumber(body.type);

    // Totals are coerced to safe non-negative numbers (never trust raw client input).
    const subtotal = toNonNegNumber(body.totals?.subtotal);

    // Process promo code if provided
    let promoCodeId = null;
    let discount = 0;

    if (body.promoCode && typeof body.promoCode === 'string') {
      const promo = await PromoCode.findOne({
        code: body.promoCode.toUpperCase(),
        isActive: true,
      });

      if (promo) {
        const isExpired = promo.expiresAt && new Date(promo.expiresAt) < new Date();
        const perUserLimit = promo.perUserLimit || 0;
        let perUserOk = true;
        if (user && perUserLimit > 0) {
          const used = await PromoUsage.countDocuments({ promoCodeId: promo._id, userId: user.id });
          perUserOk = used < perUserLimit;
        }

        if (!isExpired && perUserOk) {
          if (promo.type === 'percentage') {
            discount = (subtotal * promo.value) / 100;
            if (promo.maxDiscount > 0 && discount > promo.maxDiscount) discount = promo.maxDiscount;
          } else {
            discount = promo.value;
          }
          if (discount > subtotal) discount = subtotal;

          // Atomic, capacity-checked increment: only succeeds if the code isn't maxed out.
          const claimed = await PromoCode.findOneAndUpdate(
            {
              _id: promo._id,
              isActive: true,
              $or: [{ usageLimit: 0 }, { $expr: { $lt: ['$usedCount', '$usageLimit'] } }],
            },
            { $inc: { usedCount: 1 } },
            { new: true }
          );
          if (claimed) {
            promoCodeId = promo._id;
          } else {
            discount = 0; // code was exhausted between check and claim
          }
        }
      }
    }

    // Calculate totals server-side
    const tax = toNonNegNumber(body.totals?.tax) || Number((subtotal * 0.15).toFixed(2));
    const total = subtotal - discount + tax;

    const order = await Order.create({
      orderNumber,
      type: body.type,
      status: 'Submitted',
      userId: user?.id || undefined,
      surveyResponseId: body.surveyResponseId || undefined,
      surveyData: body.surveyData || undefined,
      customerInfo: body.customerInfo || {
        companyName: user?.company || '',
        personName: user?.name || '',
        email: user?.email || '',
      },
      totals: {
        subtotal,
        discount,
        tax,
        total: Math.max(0, total),
      },
      promoCodeId,
      referralCode: body.referralCode || undefined,
      paymentMethod: body.paymentMethod || 'cash',
      paymentStatus: 'pending',
      internalNotes: body.internalNotes || '',
      attachments: body.attachments || [],
      bulkDetails: body.bulkDetails || undefined,
      convertedFromSample: body.convertedFromSample || undefined,
      timeline: [
        {
          to: 'Submitted',
          byId: user.id,
          byName: user.name,
          byRole: user.role,
          at: new Date(),
        },
      ],
    });

    // Notify the admin team of the new order (feeds the admin notification bell)
    try {
      const who = order.customerInfo?.companyName || order.customerInfo?.personName || order.customerInfo?.email || 'A customer';
      await Notification.create({
        type: 'new_order',
        title: { en: `New ${order.type} order`, ar: `طلب ${order.type === 'sample' ? 'عينة' : 'جملة'} جديد` },
        message: {
          en: `${who} submitted order ${order.orderNumber}.`,
          ar: `${who} أرسل الطلب ${order.orderNumber}.`,
        },
        data: { orderId: order._id, orderNumber: order.orderNumber },
        isRead: false,
      });

      // …and by email, if the team asked for that under Settings.
      await sendEventEmail('emailNewOrder', {
        subject: `New ${order.type} order — ${order.orderNumber}`,
        heading: `New ${order.type} order`,
        intro: `${who} just submitted an order.`,
        rows: [
          ['Order', order.orderNumber],
          ['Type', order.type],
          ['Customer', who],
          ['Email', order.customerInfo?.email || '—'],
          ['Phone', order.customerInfo?.phone || '—'],
        ],
        actionUrl: adminUrl(`/admin/orders/${order._id}`),
        actionLabel: 'Open the order',
      });
    } catch { /* non-fatal */ }

    // Record promo usage (for accurate per-user limits going forward)
    if (promoCodeId && user) {
      try {
        await PromoUsage.create({
          promoCodeId, userId: user.id, orderId: order._id, discountAmount: discount,
        });
      } catch { /* non-fatal */ }
    }

    // Create a pending referral if a valid, non-self referral code was supplied
    if (body.referralCode && typeof body.referralCode === 'string') {
      try {
        const referrer = await User.findOne({ referralCode: body.referralCode.toUpperCase() });
        if (referrer && (!user || referrer._id.toString() !== user.id)) {
          const exists = await Referral.findOne({ referrerId: referrer._id, orderId: order._id });
          if (!exists) {
            await Referral.create({
              referrerId: referrer._id,
              referredId: user?.id || undefined,
              referralCode: body.referralCode.toUpperCase(),
              orderId: order._id,
              status: 'pending',
              creditAmount: 0,
            });
          }
        }
      } catch { /* non-fatal */ }
    }

    return NextResponse.json({ orderNumber: order.orderNumber, id: order._id }, { status: 201 });
  } catch (error: any) {
    console.error('Orders POST error:', error);

    if (error.code === 11000) {
      return NextResponse.json(
        { error: 'Order number conflict, please try again' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
