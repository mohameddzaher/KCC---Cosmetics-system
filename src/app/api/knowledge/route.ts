import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import KnowledgeArticle from '@/models/KnowledgeArticle';
import { getSession } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q');
    const category = searchParams.get('category');
    const all = searchParams.get('all');

    const filter: Record<string, unknown> = {};

    // By default, only show enabled articles (public). Admin can pass ?all=true to see all.
    if (all === 'true') {
      const user = await getSession();
      if (!user || !['SUPER_ADMIN', 'ADMIN', 'STAFF'].includes(user.role)) {
        filter.enabled = true; // fallback to public filter if not admin
      }
    } else {
      filter.enabled = true;
    }

    if (category) {
      filter.category = category;
    }

    if (q) {
      const searchTerms = q.toLowerCase().split(/\s+/).filter(Boolean);

      // Search across keywords, question, and answer fields
      filter.$or = [
        { keywords: { $in: searchTerms } },
        { 'question.en': { $regex: q, $options: 'i' } },
        { 'question.ar': { $regex: q, $options: 'i' } },
        { 'answer.en': { $regex: q, $options: 'i' } },
        { 'answer.ar': { $regex: q, $options: 'i' } },
      ];
    }

    const articles = await KnowledgeArticle.find(filter).sort({ order: 1 });
    return NextResponse.json(articles);
  } catch (error: any) {
    console.error('Knowledge GET error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user || !['SUPER_ADMIN', 'ADMIN'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await connectDB();
    const body = await req.json();

    if (!body.question?.en || !body.question?.ar || !body.answer?.en || !body.answer?.ar) {
      return NextResponse.json(
        { error: 'question (en/ar) and answer (en/ar) are required' },
        { status: 400 }
      );
    }

    const article = await KnowledgeArticle.create(body);
    return NextResponse.json(article, { status: 201 });
  } catch (error: any) {
    console.error('Knowledge POST error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
