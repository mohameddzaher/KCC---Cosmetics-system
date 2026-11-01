import { NextResponse } from 'next/server';
import { AUTH_COOKIE_NAME, getSession } from '@/lib/auth';
import { recordAudit } from '@/lib/audit/context';
import { audited } from '@/lib/audit';

export const POST = audited(async function POST() {
  // Read before the cookie is cleared, so the row can say whose session ended.
  const user = await getSession().catch(() => null);
  recordAudit({ action: 'logout', entity: 'Session', entityId: user?.id, entityLabel: user?.email });

  const response = NextResponse.json({ message: 'Logged out' });
  response.cookies.set(AUTH_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });
  return response;
});
