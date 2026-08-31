import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import BriefQuestion from '@/models/BriefQuestion';
import { getSession } from '@/lib/auth';
import { can } from '@/lib/roles';

export const dynamic = 'force-dynamic';

const SCOPES = ['general', 'main', 'sub', 'product'] as const;

/**
 * GET /api/sample-quiz/brief-questions
 *
 * Public — ordered questions for one scope. No caching, so admin edits are live.
 *
 * Query:
 *   scope=general|main|sub|product   (default 'general')
 *   scopeKey=<slug>                  (required for non-general scopes)
 *   includeInactive=true             admin only — returns hidden questions too
 *   all=true                         admin only — every scope in one call
 */
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const sp = req.nextUrl.searchParams;
    const includeInactive = sp.get('includeInactive') === 'true';
    const wantAll = sp.get('all') === 'true';

    if (includeInactive || wantAll) {
      const session = await getSession();
      if (!can(session?.role, 'sampleQuiz.manage')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const filter: Record<string, unknown> = {};
    if (!includeInactive) filter.active = true;

    if (!wantAll) {
      const scope = (sp.get('scope') || 'general') as (typeof SCOPES)[number];
      if (!SCOPES.includes(scope)) {
        return NextResponse.json({ error: 'Invalid scope' }, { status: 400 });
      }
      const scopeKey = scope === 'general' ? '' : (sp.get('scopeKey') || '').trim();
      if (scope !== 'general' && !scopeKey) {
        return NextResponse.json({ error: 'scopeKey is required for this scope' }, { status: 400 });
      }
      filter.scope = scope;
      filter.scopeKey = scopeKey;
    }

    const questions = await BriefQuestion.find(filter)
      .sort({ scope: 1, scopeKey: 1, order: 1 })
      .lean();

    return NextResponse.json(questions, {
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * POST /api/sample-quiz/brief-questions — create a question in any scope.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!can(session?.role, 'sampleQuiz.manage')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await connectDB();
    const body = await req.json();

    const scope = body.scope || 'general';
    if (!SCOPES.includes(scope)) {
      return NextResponse.json({ error: 'Invalid scope' }, { status: 400 });
    }
    const scopeKey = scope === 'general' ? '' : String(body.scopeKey || '').trim();
    if (scope !== 'general' && !scopeKey) {
      return NextResponse.json({ error: 'scopeKey is required for this scope' }, { status: 400 });
    }

    // Append to the end of its own scope rather than the global list.
    let order = body.order;
    if (typeof order !== 'number') {
      const last = await BriefQuestion.findOne({ scope, scopeKey }).sort({ order: -1 }).lean();
      order = last ? (last as { order: number }).order + 1 : 0;
    }

    const created = await BriefQuestion.create({ ...body, scope, scopeKey, order });
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    if ((error as { code?: number }).code === 11000) {
      return NextResponse.json(
        { error: 'A question with that key already exists in this scope.' },
        { status: 409 }
      );
    }
    const msg = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
