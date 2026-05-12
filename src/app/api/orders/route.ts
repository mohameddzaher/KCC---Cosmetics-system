import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Order from '@/models/Order';
import PromoCode from '@/models/PromoCode';
import { getSession, isAdmin } from '@/lib/auth';
import { generateOrderNumber } from '@/lib/api-helpers';

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

    // Process promo code if provided
    let promoCodeId = null;
    let discount = 0;

    if (body.promoCode) {
      const promo = await PromoCode.findOne({
        code: body.promoCode.toUpperCase(),
        isActive: true,
      });

      if (promo) {
        // Check expiry
        const isExpired = promo.expiresAt && new Date(promo.expiresAt) < new Date();
        const isMaxedOut = promo.usageLimit > 0 && promo.usedCount >= promo.usageLimit;

        if (!isExpired && !isMaxedOut) {
          const subtotal = body.totals?.subtotal || 0;
          if (promo.type === 'percentage') {
            discount = (subtotal * promo.value) / 100;
            if (promo.maxDiscount > 0 && discount > promo.maxDiscount) {
              discount = promo.maxDiscount;
            }
          } else {
            discount = promo.value;
          }
          promoCodeId = promo._id;
          await PromoCode.findByIdAndUpdate(promo._id, { $inc: { usedCount: 1 } });
        }
      }
    }

    // Calculate totals
    const subtotal = body.totals?.subtotal || 0;
    const tax = body.totals?.tax || (subtotal * 0.15);
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
