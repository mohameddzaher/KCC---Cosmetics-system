import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { getSession } from '@/lib/auth';
import { can } from '@/lib/roles';
import { computeReceivables } from '@/lib/accountingReports';

export const dynamic = 'force-dynamic';

/** Who owes what, and for how long. */
export async function GET() {
  try {
    const user = await getSession();
    if (!user || !can(user.role, 'accounting.view')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    await connectDB();
    return NextResponse.json(await computeReceivables());
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
