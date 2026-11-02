import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/db';
import CrmAccount from '@/models/CrmAccount';
import { getSession } from '@/lib/auth';
import { can } from '@/lib/roles';
import { audited } from '@/lib/audit';
import { ConvertError, convertAccount } from '@/lib/crmFlow';
import { mayOpenAccount } from '@/lib/crmScope';

type RouteContext = { params: Promise<{ id: string }> };

export const POST = audited(async function POST(req: NextRequest, context: RouteContext) {
  try {
    const user = await getSession();
    if (!user || !can(user.role, 'crm.edit') || !can(user.role, 'customers.edit')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    await connectDB();
    const { id } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
    }
    const account = await CrmAccount.findById(id).select('ownerId').lean();
    if (!(await mayOpenAccount(user, account as { ownerId?: unknown } | null))) {
      return NextResponse.json({ error: 'This account belongs to another rep.' }, { status: 403 });
    }
    const body = await req.json().catch(() => ({}));
    const customer = await convertAccount(id, { email: body.email, name: body.name });
    return NextResponse.json({ customerId: customer._id }, { status: 201 });
  } catch (error) {
    if (error instanceof ConvertError) return NextResponse.json({ error: error.message }, { status: 400 });
    const msg = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
});
