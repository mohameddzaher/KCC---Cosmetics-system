import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { can } from '@/lib/roles';
import { mailerStatus, sendTestEmail } from '@/lib/mailer';

export const dynamic = 'force-dynamic';

/**
 * GET — is outgoing mail actually set up?
 *
 * The notification toggles are meaningless without SMTP credentials, so the
 * settings screen asks here and says plainly when mail cannot be sent, rather
 * than letting someone tick boxes that do nothing.
 */
export async function GET() {
  const user = await getSession();
  if (!can(user?.role, 'settings.manage')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return NextResponse.json(mailerStatus());
}

/** POST — send a test message, so "it works" is something you can verify. */
export async function POST(req: NextRequest) {
  const user = await getSession();
  if (!can(user?.role, 'settings.manage')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const to = typeof body.to === 'string' ? body.to.trim() : '';
  if (!to.includes('@')) {
    return NextResponse.json({ error: 'A valid recipient address is required' }, { status: 400 });
  }

  const result = await sendTestEmail(to);
  if (!result.sent) {
    return NextResponse.json({ error: result.error || 'Send failed' }, { status: 502 });
  }
  return NextResponse.json({ sent: true, to });
}
