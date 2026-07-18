import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import {
  getSession, createToken, SessionUser,
  AUTH_COOKIE_NAME, AUTH_MAX_AGE_SECONDS,
} from '@/lib/auth';

// GET /api/auth/profile -> full profile of the signed-in user
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    await connectDB();
    const user = await User.findById(session.id).select('-password');
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    return NextResponse.json(user);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to load profile' }, { status: 500 });
  }
}

// PUT /api/auth/profile -> update the signed-in user's own profile details
export async function PUT(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    await connectDB();

    const body = await req.json();
    const update: Record<string, unknown> = {};
    const fields = [
      'name', 'email', 'phone', 'whatsapp', 'website',
      'company', 'country', 'city', 'address', 'languagePref',
    ];
    for (const f of fields) {
      if (body[f] !== undefined) update[f] = body[f];
    }

    if (typeof update.email === 'string') {
      update.email = update.email.toLowerCase().trim();
      if (!update.email) {
        return NextResponse.json({ error: 'Email cannot be empty' }, { status: 400 });
      }
      const clash = await User.findOne({ email: update.email, _id: { $ne: session.id } });
      if (clash) {
        return NextResponse.json({ error: 'That email is already in use' }, { status: 409 });
      }
    }
    if (update.name !== undefined && !String(update.name).trim()) {
      return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 });
    }

    const updated = await User.findByIdAndUpdate(session.id, update, {
      new: true,
      runValidators: true,
    }).select('-password');

    if (!updated) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Re-issue the auth cookie so the session snapshot reflects the new details
    const fresh: SessionUser = {
      id: updated._id.toString(),
      email: updated.email,
      name: updated.name,
      role: updated.role,
      company: updated.company,
      languagePref: updated.languagePref,
    };
    const token = await createToken(fresh);
    const res = NextResponse.json({ user: fresh, message: 'Profile updated' });
    res.cookies.set(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: AUTH_MAX_AGE_SECONDS,
      path: '/',
    });
    return res;
  } catch (error: any) {
    if (error.code === 11000) {
      return NextResponse.json({ error: 'That email is already in use' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message || 'Failed to update profile' }, { status: 500 });
  }
}
