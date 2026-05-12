import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import ContactMessage from '@/models/ContactMessage';
import { getSession } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();
    const { name, email, phone, company, message } = body;

    if (!name || !email || !message) {
      return NextResponse.json({ error: 'Name, email, and message are required' }, { status: 400 });
    }

    const contactMessage = await ContactMessage.create({
      name,
      email,
      phone,
      company,
      message,
    });

    return NextResponse.json({ success: true, id: contactMessage._id }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to submit contact form' }, { status: 500 });
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
