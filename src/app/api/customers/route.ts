import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import CustomerActivity from '@/models/CustomerActivity';
import { getSession, hashPassword } from '@/lib/auth';
import { generateReferralCode } from '@/lib/api-helpers';

const STAFF_ROLES = ['SUPER_ADMIN', 'ADMIN', 'STAFF'];

export async function GET(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user || !STAFF_ROLES.includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    await connectDB();

    const customers = await User.find({ role: 'CUSTOMER' })
      .select('-password')
      .populate('accountManagerId', 'name email')
      .sort({ createdAt: -1 });

    return NextResponse.json(customers);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch customers' }, { status: 500 });
  }
}

// POST /api/customers -> create a lead / contact directly from the CRM
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !STAFF_ROLES.includes(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    await connectDB();

    const body = await req.json();
    if (!body.name || !body.email) {
      return NextResponse.json({ error: 'Name and email are required' }, { status: 400 });
    }

    const email = String(body.email).toLowerCase().trim();
    const existing = await User.findOne({ email });
    if (existing) {
      return NextResponse.json({ error: 'A user with this email already exists' }, { status: 409 });
    }

    // Use the admin-provided password if given, else a random one they can reset later.
    const rawPwd = (body.password && String(body.password).length >= 6)
      ? String(body.password)
      : Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);

    const customer = await User.create({
      name: body.name,
      email,
      password: await hashPassword(rawPwd),
      role: 'CUSTOMER',
      company: body.company,
      phone: body.phone,
      whatsapp: body.whatsapp,
      website: body.website,
      country: body.country,
      city: body.city,
      address: body.address,
      stage: body.stage || 'lead',
      source: body.source || 'manual',
      tags: Array.isArray(body.tags) ? body.tags : [],
      accountManagerId: body.accountManagerId || undefined,
      referralCode: generateReferralCode(body.name),
      isActive: true,
    });

    await CustomerActivity.create({
      customerId: customer._id,
      type: 'system',
      body: `Contact created${body.source ? ` (source: ${body.source})` : ''}`,
      authorId: session.id,
      authorName: session.name,
    });

    const safe = customer.toObject();
    delete safe.password;
    return NextResponse.json(safe, { status: 201 });
  } catch (error: any) {
    if (error.code === 11000) {
      return NextResponse.json({ error: 'Email or referral code already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message || 'Failed to create contact' }, { status: 500 });
  }
}
