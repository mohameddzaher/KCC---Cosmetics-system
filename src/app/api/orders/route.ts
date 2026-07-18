import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Order from '@/models/Order';
import PromoCode from '@/models/PromoCode';
import PromoUsage from '@/models/PromoUsage';
import Referral from '@/models/Referral';
import User from '@/models/User';
import Notification from '@/models/Notification';
import { getSession, isAdmin } from '@/lib/auth';
import { generateOrderNumber } from '@/lib/api-helpers';

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

    // Customers can only see their own orders
    if (!isAdmin(user.role)) {
      filter.userId = user.id;
    }

    if (type) filter.type = type;
    if (status) filter.status = status;

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('userId', 'name email company')
        .populate('promoCodeId', 'code type value')
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
    // Auth is optional for orders - guests can submit too
    const user = await getSession();

    await connectDB();
    const body = await req.json();

    // Validate required fields
    if (!body.type || !['sample', 'bulk'].includes(body.type)) {
      return NextResponse.json(
        { error: 'type is required and must be "sample" or "bulk"' },
        { status: 400 }
      );
    }

    // Require customer info for guest orders
    if (!user && !body.customerInfo?.email) {
      return NextResponse.json(
        { error: 'Customer information with email is required' },
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
