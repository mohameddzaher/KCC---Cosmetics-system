import { NextRequest, NextResponse } from 'next/server';
import { getSession, isAdmin, isStaff, SessionUser } from './auth';
import connectDB from './db';

export function jsonResponse(data: any, status = 200) {
  return NextResponse.json(data, { status });
}

export function errorResponse(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function withAuth(
  handler: (req: NextRequest, user: SessionUser) => Promise<NextResponse>,
  roles?: string[]
) {
  return async (req: NextRequest) => {
    try {
      await connectDB();
      const user = await getSession();
      if (!user) return errorResponse('Unauthorized', 401);
      if (roles && !roles.includes(user.role)) return errorResponse('Forbidden', 403);
      return handler(req, user);
    } catch (error: any) {
      console.error('API Error:', error);
      return errorResponse(error.message || 'Internal server error', 500);
    }
  };
}

export async function withDB(
  handler: (req: NextRequest) => Promise<NextResponse>
) {
  return async (req: NextRequest) => {
    try {
      await connectDB();
      return handler(req);
    } catch (error: any) {
      console.error('API Error:', error);
      return errorResponse(error.message || 'Internal server error', 500);
    }
  };
}

/** Escape a user-supplied string so it is safe to use inside a Mongo $regex (prevents ReDoS/injection). */
export function escapeRegex(input: string): string {
  return String(input).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function generateOrderNumber(type: 'sample' | 'bulk'): string {
  const prefix = type === 'sample' ? 'SMP' : 'BLK';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

export function generateReferralCode(name: string): string {
  const clean = name.replace(/[^a-zA-Z]/g, '').substring(0, 4).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${clean}${random}`;
}

export function generateInvoiceNumber(): string {
  const date = new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `INV-${y}${m}-${random}`;
}
