import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import TeamMember from '@/models/TeamMember';

export async function GET() {
  try {
    await connectDB();
    const members = await TeamMember.find({ enabled: true }).sort({ section: 1, order: 1 }).lean();
    return NextResponse.json(members);
  } catch {
    return NextResponse.json([], { status: 500 });
  }
}
