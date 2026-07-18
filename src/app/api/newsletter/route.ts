import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import mongoose from 'mongoose';
import { rateLimit } from '@/lib/rateLimit';

// Simple newsletter subscriber schema
const subscriberSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    subscribedAt: { type: Date, default: Date.now },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Subscriber =
  mongoose.models.Subscriber || mongoose.model('Subscriber', subscriberSchema);

export async function POST(req: NextRequest) {
  try {
    const limited = rateLimit(req, 'newsletter', 5, 10 * 60 * 1000);
    if (limited) return limited;

    const body = await req.json();
    const email = body.email?.trim()?.toLowerCase();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });
    }

    // Persist for real — only report success if the write actually succeeds.
    await connectDB();
    await Subscriber.findOneAndUpdate(
      { email },
      { email, active: true },
      { upsert: true, new: true }
    );

    return NextResponse.json({ message: 'Subscribed successfully' });
  } catch {
    return NextResponse.json({ error: 'Failed to subscribe. Please try again.' }, { status: 500 });
  }
}
