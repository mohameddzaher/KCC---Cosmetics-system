import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import ContactMessage from '@/models/ContactMessage';
import { getSession } from '@/lib/auth';
import { rateLimit } from '@/lib/rateLimit';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  try {
    const limited = rateLimit(req, 'contact', 5, 10 * 60 * 1000);
    if (limited) return limited;

    await connectDB();

    const body = await req.json();
    const name = String(body.name || '').trim().slice(0, 200);
    const email = String(body.email || '').trim().slice(0, 200);
    const phone = String(body.phone || '').trim().slice(0, 50);
    const company = String(body.company || '').trim().slice(0, 200);
    const message = String(body.message || '').trim().slice(0, 5000);

    if (!name || !email || !message) {
      return NextResponse.json({ error: 'Name, email, and message are required' }, { status: 400 });
    }
    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ error: 'Please enter a valid email address' }, { status: 400 });
    }

    const contactMessage = await ContactMessage.create({ name, email, phone, company, message });

    return NextResponse.json({ success: true, id: contactMessage._id }, { status: 201 });
  } catch {
    // Never leak internal error details to unauthenticated callers.
    return NextResponse.json({ error: 'Failed to submit your message. Please try again.' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user || !['SUPER_ADMIN', 'ADMIN'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    await connectDB();

    const messages = await ContactMessage.find().sort({ createdAt: -1 });
    return NextResponse.json(messages);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch contact messages' }, { status: 500 });
  }
}

// DELETE /api/contact?id=... -> admin remove a message
export async function DELETE(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user || !['SUPER_ADMIN', 'ADMIN'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    await connectDB();
    const id = new URL(req.url).searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }
    await ContactMessage.findByIdAndDelete(id);
    return NextResponse.json({ message: 'Deleted' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to delete' }, { status: 500 });
  }
}
