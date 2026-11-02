import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { getSession } from '@/lib/auth';
import { canAny, STAFF_ROLES } from '@/lib/roles';

export const dynamic = 'force-dynamic';

/**
 * Names and roles of the team, for choosing an owner or a manager. Separate
 * from /api/users, which is for those who administer accounts and returns far
 * more: the people who assign work have no business with that, and were being
 * shown an empty dropdown because of it.
 */
export async function GET() {
  try {
    const user = await getSession();
    if (!user || !canAny(user.role, ['crm.view', 'customers.view', 'orders.assign', 'users.view'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    await connectDB();
    const team = await User.find({ role: { $in: STAFF_ROLES }, isActive: { $ne: false } })
      .select('name role')
      .sort({ name: 1 })
      .lean();
    return NextResponse.json(team);
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
