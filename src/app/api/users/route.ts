import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { getSession, hashPassword } from '@/lib/auth';
import { generateReferralCode } from '@/lib/api-helpers';

const MANAGE_ROLES = ['SUPER_ADMIN', 'ADMIN'];
const ALL_ROLES = ['SUPER_ADMIN', 'ADMIN', 'STAFF', 'CUSTOMER'];
const PRIVILEGED_ROLES = ['SUPER_ADMIN', 'ADMIN'];

// GET /api/users?role=&search=  -> list users (admin/super-admin only)
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !MANAGE_ROLES.includes(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    await connectDB();

    const { searchParams } = new URL(req.url);
    const role = searchParams.get('role');
    const search = searchParams.get('search')?.trim();

    const query: Record<string, unknown> = {};
    if (role && ALL_ROLES.includes(role)) {
      query.role = role;
    } else {
      // The Users page manages staff/admins by default, not customers
      query.role = { $in: ['SUPER_ADMIN', 'ADMIN', 'STAFF'] };
    }

    if (search) {
      const rx = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      query.$or = [{ name: rx }, { email: rx }, { company: rx }];
    }

    const users = await User.find(query)
      .select('-password')
      .populate('accountManagerId', 'name email')
      .sort({ createdAt: -1 });

    return NextResponse.json(users);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch users' }, { status: 500 });
  }
}

// POST /api/users  -> create a user with a role
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !MANAGE_ROLES.includes(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    await connectDB();

    const body = await req.json();
    const { name, email, password, role = 'STAFF' } = body;

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Name, email and password are required' }, { status: 400 });
    }
    if (!ALL_ROLES.includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }
    // Only SUPER_ADMIN may create privileged (ADMIN / SUPER_ADMIN) accounts
    if (PRIVILEGED_ROLES.includes(role) && session.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Only a Super Admin can assign Admin roles' }, { status: 403 });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return NextResponse.json({ error: 'Email is already registered' }, { status: 409 });
    }

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password: await hashPassword(password),
      role,
      company: body.company,
      phone: body.phone,
      country: body.country,
      city: body.city,
      isActive: body.isActive ?? true,
      languagePref: body.languagePref || 'en',
      referralCode: generateReferralCode(name),
    });

    const safe = user.toObject();
    delete safe.password;
    return NextResponse.json(safe, { status: 201 });
  } catch (error: any) {
    if (error.code === 11000) {
      return NextResponse.json({ error: 'Email or referral code already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message || 'Failed to create user' }, { status: 500 });
  }
}
