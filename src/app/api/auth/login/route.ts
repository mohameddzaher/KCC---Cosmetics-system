import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { authenticateUser, createToken, AccountDisabledError, AUTH_COOKIE_NAME, AUTH_MAX_AGE_SECONDS } from '@/lib/auth';
import { rateLimit } from '@/lib/rateLimit';
import { recordAudit, setAuditActor } from '@/lib/audit/context';
import { audited } from '@/lib/audit';

export const POST = audited(async function POST(req: NextRequest) {
  try {
    const limited = rateLimit(req, 'login', 10, 5 * 60 * 1000);
    if (limited) return limited;

    await connectDB();
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    let user;
    try {
      user = await authenticateUser(email, password);
    } catch (e) {
      if (e instanceof AccountDisabledError) {
        recordAudit({ action: 'login_failed', entity: 'Session', entityLabel: String(email), details: { reason: 'account disabled' } });
        return NextResponse.json({ error: 'This account has been disabled. Contact an administrator.' }, { status: 403 });
      }
      throw e;
    }
    if (!user) {
      recordAudit({ action: 'login_failed', entity: 'Session', entityLabel: String(email), details: { reason: 'wrong email or password' } });
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    setAuditActor(user);
    recordAudit({ action: 'login', entity: 'Session', entityId: user.id, entityLabel: user.email });

    const token = await createToken(user);

    const response = NextResponse.json({ user, message: 'Login successful' });
    response.cookies.set(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: AUTH_MAX_AGE_SECONDS,
      path: '/',
    });

    return response;
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Login failed' }, { status: 500 });
  }
});
