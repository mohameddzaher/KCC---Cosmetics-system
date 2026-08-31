import { NextResponse } from 'next/server';
import { getSession, createToken, AUTH_COOKIE_NAME, AUTH_MAX_AGE_SECONDS } from '@/lib/auth';
import { effectiveRolePermissions, type Role } from '@/lib/roles';

export async function GET() {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    const refreshedToken = await createToken(user);

    /*
     * The effective permission list travels with the session.
     *
     * The browser bundle has the shipped defaults compiled into it and no way
     * to know what a Super Admin has since changed, so client-side guards were
     * hiding pages a role had just been granted. `getSession()` has already
     * loaded the current configuration by this point — send it along, and the
     * admin UI shows exactly what the server will actually allow.
     */
    const response = NextResponse.json({
      user: { ...user, permissions: effectiveRolePermissions(user.role as Role) },
    });
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
