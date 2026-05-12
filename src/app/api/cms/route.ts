import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import CmsSection from '@/models/CmsSection';
import { getSession } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');
    const slug = searchParams.get('slug');
    const enabled = searchParams.get('enabled');

    const filter: Record<string, unknown> = {};
    if (type) filter.type = type;
    if (slug) filter.slug = slug;
    if (enabled === 'true') filter.enabled = true;
    if (enabled === 'false') filter.enabled = false;

    const sections = await CmsSection.find(filter).sort({ order: 1 });
    return NextResponse.json(sections);
  } catch (error: any) {
    console.error('CMS GET error:', error);
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

    if (!body.type || !body.slug) {
      return NextResponse.json(
        { error: 'type and slug are required' },
        { status: 400 }
      );
    }

    const section = await CmsSection.create(body);
    return NextResponse.json(section, { status: 201 });
  } catch (error: any) {
    console.error('CMS POST error:', error);

    if (error.code === 11000) {
      return NextResponse.json(
        { error: 'A section with this slug already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
