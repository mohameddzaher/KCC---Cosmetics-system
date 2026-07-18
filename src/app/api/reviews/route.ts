import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Testimonial from '@/models/Testimonial';
import { getSession } from '@/lib/auth';
import { rateLimit } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

// POST /api/reviews -> public review submission (held for admin approval)
export async function POST(req: NextRequest) {
  try {
    const limited = rateLimit(req, 'reviews', 3, 10 * 60 * 1000);
    if (limited) return limited;

    await connectDB();
    const session = await getSession();
    const body = await req.json();

    const name = String(body.name || session?.name || '').trim().slice(0, 120);
    const content = String(body.content || '').trim().slice(0, 2000);
    const company = String(body.company || '').trim().slice(0, 160);
    const rating = Math.max(1, Math.min(5, Number(body.rating) || 5));
    const email = String(body.email || session?.email || '').trim().slice(0, 160);

    if (!name || !content) {
      return NextResponse.json({ error: 'Name and review text are required' }, { status: 400 });
    }

    await Testimonial.create({
      name: { en: name, ar: name },
      company: { en: company, ar: company },
      content: { en: content, ar: content },
      rating,
      email,
      status: 'pending',
      enabled: false, // hidden until an admin approves it
      order: 999,
    });

    return NextResponse.json({ message: 'Thank you! Your review was submitted and will appear after approval.' }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to submit review' }, { status: 500 });
  }
}
