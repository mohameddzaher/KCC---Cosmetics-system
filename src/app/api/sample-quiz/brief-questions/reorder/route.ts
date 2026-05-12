import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import BriefQuestion from '@/models/BriefQuestion';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * POST /api/sample-quiz/brief-questions/reorder
 *
 * Admin only — bulk-update the `order` field on multiple questions.
 * Body: { ids: string[] }  -> position in array becomes the new order.
 *
 * Used by the drag-and-drop UI to persist a new sort in one call.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !['SUPER_ADMIN', 'ADMIN'].includes(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await connectDB();
    const { ids } = await req.json();

    if (!Array.isArray(ids) || ids.some((x) => typeof x !== 'string')) {
      return NextResponse.json({ error: 'ids must be an array of strings' }, { status: 400 });
    }

    await Promise.all(
      ids.map((id, index) =>
        BriefQuestion.findByIdAndUpdate(id, { order: index }, { new: false })
      )
    );

    return NextResponse.json({ ok: true, updated: ids.length });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
