import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import CustomerActivity from '@/models/CustomerActivity';
import CrmAccount from '@/models/CrmAccount';
import CrmActivity from '@/models/CrmActivity';
import { accountScope } from '@/lib/crmScope';
import { getSession } from '@/lib/auth';
import { can } from '@/lib/roles';

const READ_PERM = 'crm.view' as const;
const WRITE_PERM = 'crm.edit' as const;

// GET /api/crm/tasks?status=open|done|all -> follow-up tasks across all contacts
export async function GET(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user || !can(user.role, READ_PERM)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    await connectDB();

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || 'open';

    const query: Record<string, unknown> = { type: 'task' };
    if (status === 'open') query.done = { $ne: true };
    else if (status === 'done') query.done = true;

    const contactTasks = await CustomerActivity.find(query)
      .populate('customerId', 'name email company phone whatsapp stage')
      .sort({ dueDate: 1, createdAt: -1 })
      .limit(500)
      .lean();

    // The follow-ups orders create, and any a rep logged on an account, limited
    // to the accounts this person may open.
    const scope = await accountScope(user);
    const visible = await CrmAccount.find({ active: { $ne: false }, ...scope }).select('name keyPerson customerId').lean();
    const byId = new Map(visible.map((a) => [String(a._id), a as unknown as Record<string, any>]));
    const accountTasks = await CrmActivity.find({ ...query, accountId: { $in: [...byId.keys()] } })
      .sort({ dueDate: 1, createdAt: -1 })
      .limit(500)
      .lean();

    const tasks = [
      ...contactTasks.map((t) => ({ ...t, source: 'contact' })),
      ...accountTasks.map((t) => {
        const a = byId.get(String(t.accountId));
        return {
          ...t,
          source: 'account',
          account: { _id: t.accountId, name: a?.name, phone: a?.keyPerson?.phone, email: a?.keyPerson?.email },
        };
      }),
    ].sort((a, b) => +new Date((a as { dueDate?: Date }).dueDate || 8640000000000000) - +new Date((b as { dueDate?: Date }).dueDate || 8640000000000000));

    return NextResponse.json(tasks);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch tasks' }, { status: 500 });
  }
}
