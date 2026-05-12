import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import PromoCode from '@/models/PromoCode';
import { getSession } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user || !['SUPER_ADMIN', 'ADMIN'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    await connectDB();

    const promos = await PromoCode.find().sort({ createdAt: -1 });
    return NextResponse.json(promos);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch promo codes' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user || !['SUPER_ADMIN', 'ADMIN'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    await connectDB();

    const body = await req.json();
    const promo = await PromoCode.create(body);
    return NextResponse.json(promo, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create promo code' }, { status: 500 });
  }
}
