import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Referral from '@/models/Referral';
import User from '@/models/User';
import { getSession } from '@/lib/auth';
import { can } from '@/lib/roles';
import mongoose from 'mongoose';
import SiteSettings from '@/models/SiteSettings';
import Order from '@/models/Order';

export async function GET(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    await connectDB();

    let filter: any = {};
    if (!can(user.role, 'referrals.manage')) {
      filter.referrerId = user.id;
    }

    const referrals = await Referral.find(filter)
      .populate('referrerId', 'name email referralCode')
      .populate('referredId', 'name email')
      .populate('orderId', 'orderNumber')
      .sort({ createdAt: -1 });

    return NextResponse.json(referrals);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch referrals' }, { status: 500 });
  }
}

/**
 * The referral rules the admin set under Settings → Referral Program.
 *
 * These were configurable but never read: a referral was credited whatever the
 * caller passed, the programme's on/off switch did nothing, and the per-user
 * cap was decorative. Everything the settings screen offers is applied here.
 */
async function referralRules() {
  const doc = (await SiteSettings.findOne({ key: 'main' }).lean()) as {
    referral?: {
      enabled?: boolean;
      creditAmount?: number;
      minOrderForCredit?: number;
      maxCreditsPerUser?: number;
      expirationDays?: number;
    };
  } | null;
  const r = doc?.referral || {};
  return {
    enabled: r.enabled !== false,
    creditAmount: Number(r.creditAmount ?? 0),
    minOrderForCredit: Number(r.minOrderForCredit ?? 0),
    maxCreditsPerUser: Number(r.maxCreditsPerUser ?? 0),
    expirationDays: Number(r.expirationDays ?? 0),
  };
}

/** What a referrer has already earned, against the programme's ceiling. */
async function earnedSoFar(referrerId: string): Promise<number> {
  const rows = await Referral.aggregate([
    { $match: { referrerId: new mongoose.Types.ObjectId(referrerId), status: 'credited' } },
    { $group: { _id: null, total: { $sum: '$creditAmount' } } },
  ]);
  return rows[0]?.total || 0;
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    await connectDB();

    const body = await req.json();
    const { referralCode, orderId } = body;
    const isAdmin = can(user.role, 'referrals.manage');

    // ── Admin manual creation: pick referrer (by code) + referred (by email) ──
    if (isAdmin && body.manual) {
      if (!body.referralCode || !body.referredEmail) {
        return NextResponse.json({ error: 'Referrer code and referred email are required' }, { status: 400 });
      }
      const referrerUser = await User.findOne({ referralCode: body.referralCode });
      if (!referrerUser) {
        return NextResponse.json({ error: 'Invalid referrer code' }, { status: 404 });
      }
      const referredUser = await User.findOne({ email: String(body.referredEmail).toLowerCase() });
      if (!referredUser) {
        return NextResponse.json({ error: 'No user found with that referred email' }, { status: 404 });
      }
      if (referrerUser._id.toString() === referredUser._id.toString()) {
        return NextResponse.json({ error: 'Referrer and referred cannot be the same person' }, { status: 400 });
      }
      const status = body.status === 'credited' ? 'credited' : 'pending';
      const amount = Number(body.creditAmount) || 0;
      const referral = await Referral.create({
        referrerId: referrerUser._id,
        referredId: referredUser._id,
        referralCode: body.referralCode,
        creditAmount: amount,
        status,
        creditedAt: status === 'credited' ? new Date() : undefined,
      });
      if (status === 'credited' && amount > 0) {
        await User.findByIdAndUpdate(referrerUser._id, { $inc: { referralBalance: amount } });
      }
      const populated = await Referral.findById(referral._id)
        .populate('referrerId', 'name email referralCode')
        .populate('referredId', 'name email');
      return NextResponse.json(populated, { status: 201 });
    }

    if (!referralCode || !orderId) {
      return NextResponse.json({ error: 'referralCode and orderId are required' }, { status: 400 });
    }

    const referrer = await User.findOne({ referralCode });
    if (!referrer) {
      return NextResponse.json({ error: 'Invalid referral code' }, { status: 404 });
    }

    if (referrer._id.toString() === user.id) {
      return NextResponse.json({ error: 'You cannot use your own referral code' }, { status: 400 });
    }

    const existingReferral = await Referral.findOne({
      referredId: user.id,
      orderId,
    });
    if (existingReferral) {
      return NextResponse.json({ error: 'Referral already applied for this order' }, { status: 400 });
    }

    const rules = await referralRules();
    if (!rules.enabled) {
      return NextResponse.json({ error: 'The referral programme is currently switched off' }, { status: 403 });
    }

    if (rules.minOrderForCredit > 0) {
      const order = await Order.findById(orderId).select('pricing totalAmount').lean();
      const value = Number(
        (order as { pricing?: { total?: number }; totalAmount?: number } | null)?.pricing?.total ??
          (order as { totalAmount?: number } | null)?.totalAmount ??
          0
      );
      if (value > 0 && value < rules.minOrderForCredit) {
        return NextResponse.json(
          { error: `Orders must be at least ${rules.minOrderForCredit} to earn a referral credit` },
          { status: 400 }
        );
      }
    }

    // The admin's configured credit is the rule; a caller cannot name its own
    // price. Admins still set amounts by hand through the manual branch above.
    let amount = rules.creditAmount;

    if (rules.maxCreditsPerUser > 0) {
      const already = await earnedSoFar(referrer._id.toString());
      amount = Math.max(0, Math.min(amount, rules.maxCreditsPerUser - already));
    }

    const referral = await Referral.create({
      referrerId: referrer._id,
      referredId: user.id,
      referralCode,
      orderId,
      creditAmount: amount,
      status: 'credited',
      creditedAt: new Date(),
      expiresAt:
        rules.expirationDays > 0
          ? new Date(Date.now() + rules.expirationDays * 24 * 60 * 60 * 1000)
          : undefined,
    });

    if (amount > 0) {
      await User.findByIdAndUpdate(referrer._id, {
        $inc: { referralBalance: amount },
      });
    }

    return NextResponse.json(referral, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to apply referral' }, { status: 500 });
  }
}
