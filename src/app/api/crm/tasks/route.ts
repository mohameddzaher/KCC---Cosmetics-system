import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import CustomerActivity from '@/models/CustomerActivity';
import { getSession } from '@/lib/auth';

const STAFF_ROLES = ['SUPER_ADMIN', 'ADMIN', 'STAFF'];

// GET /api/crm/tasks?status=open|done|all -> follow-up tasks across all contacts
export async function GET(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user || !STAFF_ROLES.includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    await connectDB();

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || 'open';

    const query: Record<string, unknown> = { type: 'task' };
    if (status === 'open') query.done = { $ne: true };
    else if (status === 'done') query.done = true;

    const tasks = await CustomerActivity.find(query)
      .populate('customerId', 'name email company phone whatsapp stage')
      .sort({ dueDate: 1, createdAt: -1 })
      .limit(500);

    return NextResponse.json(tasks);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch tasks' }, { status: 500 });
  }
}
