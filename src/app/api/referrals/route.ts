import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Referral from '@/models/Referral';
import User from '@/models/User';
import { getSession } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    await connectDB();

    let filter: any = {};
    if (!['SUPER_ADMIN', 'ADMIN'].includes(user.role)) {
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

export async function POST(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    await connectDB();

    const body = await req.json();
    const { referralCode, orderId, creditAmount } = body;
    const isAdmin = ['SUPER_ADMIN', 'ADMIN'].includes(user.role);

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

    const amount = creditAmount || 0;

    const referral = await Referral.create({
      referrerId: referrer._id,
      referredId: user.id,
      referralCode,
      orderId,
      creditAmount: amount,
      status: 'credited',
      creditedAt: new Date(),
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
