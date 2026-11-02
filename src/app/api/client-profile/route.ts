import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/db';
import { getSession } from '@/lib/auth';
import { can, canAny } from '@/lib/roles';
import { clientProfile, loadClient } from '@/lib/clientProfile';
import { mayOpenAccount } from '@/lib/crmScope';

export const dynamic = 'force-dynamic';

/** Everything about one client. Money only for those who may see the accounts. */
export async function GET(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user || !canAny(user.role, ['crm.view', 'customers.view'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    await connectDB();

    const p = req.nextUrl.searchParams;
    const customerId = p.get('customerId') || undefined;
    const accountId = p.get('accountId') || undefined;
    const id = customerId || accountId;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
    }

    // Reaching a client through the CRM keeps the CRM's own rule about whose
    // accounts a rep may open. Customers staff see every customer regardless.
    if (!can(user.role, 'customers.view')) {
      const { account } = await loadClient({ customerId, accountId });
      if (!(await mayOpenAccount(user, account as { ownerId?: unknown } | null))) {
        return NextResponse.json({ error: 'This account belongs to another rep.' }, { status: 403 });
      }
    }

    const profile = await clientProfile({ customerId, accountId }, { money: can(user.role, 'accounting.view') });
    if (!profile) return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    return NextResponse.json(profile);
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
