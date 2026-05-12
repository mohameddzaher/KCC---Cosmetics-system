import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import BriefQuestion from '@/models/BriefQuestion';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/sample-quiz/brief-questions
 *
 * Public — returns ordered list of brief questions.
 * Customer quiz fetches this on entry (active only). No caching so admin edits go live instantly.
 *
 * ?includeInactive=true returns hidden questions too (admin requires it to manage them).
 */
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const includeInactive = req.nextUrl.searchParams.get('includeInactive') === 'true';

    if (includeInactive) {
      const session = await getSession();
      if (!session || !['SUPER_ADMIN', 'ADMIN'].includes(session.role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const filter = includeInactive ? {} : { active: true };
    const questions = await BriefQuestion.find(filter).sort({ order: 1 }).lean();
    return NextResponse.json(questions, {
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * POST /api/sample-quiz/brief-questions
 *
 * Admin only — creates a new brief question.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !['SUPER_ADMIN', 'ADMIN'].includes(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await connectDB();
    const body = await req.json();
    const created = await BriefQuestion.create(body);
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
