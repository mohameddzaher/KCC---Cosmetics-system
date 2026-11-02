import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import InventoryItem from '@/models/InventoryItem';
import { getSession } from '@/lib/auth';
import { escapeRegex } from '@/lib/api-helpers';
import { can } from '@/lib/roles';
import { audited } from '@/lib/audit';
import { moveStock } from '@/lib/inventory';

export async function GET(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user || !can(user.role, 'inventory.view')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    await connectDB();

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');
    const lowStock = searchParams.get('lowStock');

    let filter: any = {};
    if (search) {
      const safe = escapeRegex(search);
      filter.$or = [
        { 'name.en': { $regex: safe, $options: 'i' } },
        { 'name.ar': { $regex: safe, $options: 'i' } },
        { sku: { $regex: safe, $options: 'i' } },
      ];
    }
    if (lowStock === 'true') {
      filter.$expr = { $lte: ['$currentStock', '$lowStockThreshold'] };
    }

    const items = await InventoryItem.find(filter).sort({ createdAt: -1 });
    return NextResponse.json(items);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch inventory' }, { status: 500 });
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
    // Stock only ever changes through a movement, the opening count included,
    // so the movements always add up to what is on the shelf.
    const opening = Math.max(0, Number(body.currentStock) || 0);
    const item = await InventoryItem.create({ ...body, currentStock: 0 });
    if (opening > 0) {
      const { item: stocked } = await moveStock({
        itemId: item._id, type: 'IN', quantity: opening, reason: 'Opening stock',
        reference: { type: 'adjustment' },
        unitCost: Number(body.costPerUnit) > 0 ? Number(body.costPerUnit) : undefined,
        actor: { id: user.id, name: user.name },
      });
      return NextResponse.json(stocked, { status: 201 });
    }
    return NextResponse.json(item, { status: 201 });
  } catch (error: any) {
    if (error.code === 11000) {
      return NextResponse.json({ error: 'An item with this SKU already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message || 'Failed to create inventory item' }, { status: 500 });
  }
});
