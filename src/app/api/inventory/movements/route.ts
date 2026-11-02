import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import mongoose from 'mongoose';
import InventoryMovement from '@/models/InventoryMovement';
import Order from '@/models/Order';
import { getSession } from '@/lib/auth';
import { can } from '@/lib/roles';
import { audited } from '@/lib/audit';
import { moveStock, recordPurchaseExpense, StockError } from '@/lib/inventory';

export async function GET(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user || !can(user.role, 'inventory.view')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    await connectDB();

    const { searchParams } = new URL(req.url);
    const itemId = searchParams.get('itemId');
    const type = searchParams.get('type');
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    let filter: any = {};
    if (itemId) filter.itemId = itemId;
    if (type && ['IN', 'OUT', 'ADJUSTMENT'].includes(type)) filter.type = type;

    const movements = await InventoryMovement.find(filter)
      .populate('itemId', 'sku name unit')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(Math.min(Math.max(limit || 50, 1), 1000))
      .lean() as any[];

    // A movement made by an order names it, so the store links back to the job.
    const orderIds = movements
      .filter((m) => m.reference?.type === 'order' && mongoose.Types.ObjectId.isValid(m.reference.id))
      .map((m) => m.reference.id);
    const orders = orderIds.length
      ? await Order.find({ _id: { $in: orderIds } }).select('orderNumber').lean() as any[]
      : [];
    const numberOf = new Map(orders.map((o) => [String(o._id), o.orderNumber]));

    return NextResponse.json(movements.map((m) => ({
      ...m,
      orderNumber: m.reference?.type === 'order' ? numberOf.get(m.reference.id) : undefined,
    })));
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch movements' }, { status: 500 });
  }
}

export const POST = audited(async function POST(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user || !can(user.role, 'inventory.manage')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    await connectDB();

    const body = await req.json();
    const { itemId, type, reason } = body;
    const quantity = Number(body.quantity);

    if (!itemId || !type || body.quantity === undefined || body.quantity === '') {
      return NextResponse.json({ error: 'itemId, type, and quantity are required' }, { status: 400 });
    }
    if (!['IN', 'OUT', 'ADJUSTMENT'].includes(type)) {
      return NextResponse.json({ error: 'Invalid movement type' }, { status: 400 });
    }
    if (!mongoose.Types.ObjectId.isValid(itemId)) {
      return NextResponse.json({ error: 'Inventory item not found' }, { status: 404 });
    }

    // The screen sends a reference as the paper's number; older callers sent
    // the stored shape. Both mean the same thing.
    const refText = typeof body.reference === 'string' ? body.reference.trim() : body.reference?.id;
    const reference = refText
      ? { type: type === 'IN' ? 'purchase' : 'adjustment', id: String(refText).slice(0, 120) } as const
      : undefined;
    const unitCost = type === 'IN' ? Number(body.unitCost) || 0 : 0;

    const { movement, item } = await moveStock({
      itemId, type, quantity, reason, reference,
      unitCost: unitCost > 0 ? unitCost : undefined,
      actor: { id: user.id, name: user.name },
    });

    // A paid receipt is money out, so it reaches the accounts without anyone
    // re-typing it. Unticked for stock that arrived free or was already booked.
    let expense = null;
    if (type === 'IN' && unitCost > 0 && body.recordExpense !== false) {
      expense = await recordPurchaseExpense({
        item, quantity, unitCost,
        vatAmount: Number(body.vatAmount) || 0,
        vendor: typeof body.vendor === 'string' ? body.vendor.trim().slice(0, 200) : undefined,
        reference: refText,
        actor: { id: user.id, name: user.name },
      });
    }

    return NextResponse.json({ ...movement.toObject(), expenseId: expense?._id }, { status: 201 });
  } catch (error: any) {
    if (error instanceof StockError) {
      return NextResponse.json({ error: error.message, shortages: error.shortages }, { status: error.status === 409 ? 400 : error.status });
    }
    return NextResponse.json({ error: error.message || 'Failed to create movement' }, { status: 500 });
  }
});
