import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/db';
import ProductCode from '@/models/ProductCode';
import { getSession } from '@/lib/auth';
import { can } from '@/lib/roles';
import { readBody } from '../route';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, context: RouteContext) {
  try {
    const user = await getSession();
    if (!can(user?.role, 'crm.edit')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    await connectDB();

    const { id } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
    }

    const body = await req.json();
    const doc = readBody(body);

    if (doc.code) {
      const clash = await ProductCode.findOne({ code: doc.code, _id: { $ne: id } }).lean();
      if (clash) {
        return NextResponse.json({ error: `The code ${doc.code} is already used` }, { status: 409 });
      }
    }

    const updated = await ProductCode.findByIdAndUpdate(id, { $set: doc }, { new: true });
    if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(updated);
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/** Archived rather than erased: a code that shipped stays traceable. */
export async function DELETE(_req: NextRequest, context: RouteContext) {
  try {
    const user = await getSession();
    if (!can(user?.role, 'crm.edit')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    await connectDB();

    const { id } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
    }

    const archived = await ProductCode.findByIdAndUpdate(id, { $set: { active: false } }, { new: true });
    if (!archived) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ archived: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
