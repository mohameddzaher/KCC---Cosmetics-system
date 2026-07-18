import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/db';
import { getSession } from '@/lib/auth';
import Service from '@/models/Service';
import Testimonial from '@/models/Testimonial';
import Certificate from '@/models/Certificate';
import Factory from '@/models/Factory';
import PortfolioItem from '@/models/PortfolioItem';
import FAQ from '@/models/FAQ';
import NewsPost from '@/models/NewsPost';

export const dynamic = 'force-dynamic';

const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN'];

const MODELS: Record<string, any> = {
  services: Service,
  testimonials: Testimonial,
  certificates: Certificate,
  factories: Factory,
  portfolio: PortfolioItem,
  faqs: FAQ,
  news: NewsPost,
};

type Ctx = { params: Promise<{ type: string; id: string }> };

export async function PUT(req: NextRequest, context: Ctx) {
  try {
    const user = await getSession();
    if (!user || !ADMIN_ROLES.includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const { type, id } = await context.params;
    const Model = MODELS[type];
    if (!Model) return NextResponse.json({ error: 'Unknown content type' }, { status: 404 });
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
    }
    await connectDB();
    const body = await req.json();
    const updated = await Model.findByIdAndUpdate(id, body, { new: true, runValidators: true });
    if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(updated);
  } catch (error: any) {
    if (error.code === 11000) {
      return NextResponse.json({ error: 'A record with that unique field already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message || 'Failed to update' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, context: Ctx) {
  try {
    const user = await getSession();
    if (!user || !ADMIN_ROLES.includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const { type, id } = await context.params;
    const Model = MODELS[type];
    if (!Model) return NextResponse.json({ error: 'Unknown content type' }, { status: 404 });
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
    }
    await connectDB();
    const deleted = await Model.findByIdAndDelete(id);
    if (!deleted) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ message: 'Deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to delete' }, { status: 500 });
  }
}
