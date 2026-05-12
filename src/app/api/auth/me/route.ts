import { NextResponse } from 'next/server';
import { getSession, createToken, AUTH_COOKIE_NAME, AUTH_MAX_AGE_SECONDS } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    const refreshedToken = await createToken(user);
    const response = NextResponse.json({ user });
    response.cookies.set(AUTH_COOKIE_NAME, refreshedToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: AUTH_MAX_AGE_SECONDS,
      path: '/',
    });
    return response;
  } catch {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
}
