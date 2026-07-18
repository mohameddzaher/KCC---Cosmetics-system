import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { hashPassword, createToken, AUTH_COOKIE_NAME, AUTH_MAX_AGE_SECONDS, SessionUser } from '@/lib/auth';
import { generateReferralCode } from '@/lib/api-helpers';
import { rateLimit } from '@/lib/rateLimit';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Public self-registration is disabled — accounts are provisioned by KCC only.
const SELF_REGISTRATION_ENABLED = false;

export async function POST(req: NextRequest) {
  try {
    if (!SELF_REGISTRATION_ENABLED) {
      return NextResponse.json(
        { error: 'Registration is by invitation only. Please contact KCC to get an account.' },
        { status: 403 }
      );
    }

    const limited = rateLimit(req, 'register', 5, 10 * 60 * 1000);
    if (limited) return limited;

    await connectDB();
    const { name, email, password, company, phone, country, city } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Name, email, and password are required' }, { status: 400 });
    }
    if (!EMAIL_RE.test(String(email))) {
      return NextResponse.json({ error: 'Please enter a valid email address' }, { status: 400 });
    }
    if (String(password).length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
    }

    const hashedPassword = await hashPassword(password);
    const referralCode = generateReferralCode(name);

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: 'CUSTOMER',
      company: company || '',
      phone: phone || '',
      country: country || '',
      city: city || '',
      referralCode,
      referralBalance: 0,
      languagePref: 'en',
      isActive: true,
    });

    const sessionUser: SessionUser = {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
      company: user.company,
    };

    const token = await createToken(sessionUser);

    const response = NextResponse.json({ user: sessionUser, message: 'Registration successful' });
    response.cookies.set(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: AUTH_MAX_AGE_SECONDS,
      path: '/',
    });

    return response;
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Registration failed' }, { status: 500 });
  }
}
