import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * For the keep-alive ping and for anyone asking "is it up". Touching the
 * database here matters: it keeps the connection warm, so the first person after
 * a quiet spell is not the one who pays for reopening it.
 */
export async function GET() {
  const started = Date.now();
  try {
    await connectDB();
    await mongoose.connection.db?.admin().ping();
    return NextResponse.json({ ok: true, ms: Date.now() - started });
  } catch {
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}
