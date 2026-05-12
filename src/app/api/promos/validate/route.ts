import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import PromoCode from '@/models/PromoCode';
import PromoUsage from '@/models/PromoUsage';
import { getSession } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    await connectDB();

    const body = await req.json();
    const { code, userId } = body;

    if (!code) {
      return NextResponse.json({ valid: false, error: 'Promo code is required' }, { status: 400 });
    }

    const promo = await PromoCode.findOne({ code: code.toUpperCase() });

    if (!promo) {
      return NextResponse.json({ valid: false, error: 'Promo code not found' });
    }

    if (!promo.isActive) {
      return NextResponse.json({ valid: false, error: 'Promo code is no longer active' });
    }

    if (promo.expiresAt && new Date(promo.expiresAt) < new Date()) {
      return NextResponse.json({ valid: false, error: 'Promo code has expired' });
    }

    if (promo.usageLimit > 0 && promo.usedCount >= promo.usageLimit) {
      return NextResponse.json({ valid: false, error: 'Promo code usage limit reached' });
    }

    if (userId && promo.perUserLimit > 0) {
      const userUsageCount = await PromoUsage.countDocuments({
        promoCodeId: promo._id,
        userId,
      });
      if (userUsageCount >= promo.perUserLimit) {
        return NextResponse.json({ valid: false, error: 'You have already used this promo code the maximum number of times' });
      }
    }

    return NextResponse.json({
      valid: true,
      discount: {
        type: promo.type,
        value: promo.value,
        maxDiscount: promo.maxDiscount,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to validate promo code' }, { status: 500 });
  }
}
