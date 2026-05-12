import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import InventoryItem from '@/models/InventoryItem';
import InventoryMovement from '@/models/InventoryMovement';
import Notification from '@/models/Notification';
import { getSession } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user || !['SUPER_ADMIN', 'ADMIN', 'STAFF'].includes(user.role)) {
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
      .populate('itemId', 'sku name')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit);

    return NextResponse.json(movements);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch movements' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user || !['SUPER_ADMIN', 'ADMIN', 'STAFF'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    await connectDB();

    const body = await req.json();
    const { itemId, type, quantity, reason, reference } = body;

    if (!itemId || !type || quantity === undefined) {
      return NextResponse.json({ error: 'itemId, type, and quantity are required' }, { status: 400 });
    }

    const item = await InventoryItem.findById(itemId);
    if (!item) {
      return NextResponse.json({ error: 'Inventory item not found' }, { status: 404 });
    }

    const previousStock = item.currentStock;
    let newStock: number;

    switch (type) {
      case 'IN':
        newStock = previousStock + quantity;
        break;
      case 'OUT':
        newStock = previousStock - quantity;
        break;
      case 'ADJUSTMENT':
        newStock = quantity;
        break;
      default:
        return NextResponse.json({ error: 'Invalid movement type' }, { status: 400 });
    }

    if (newStock < 0) {
      return NextResponse.json({ error: 'Insufficient stock for this operation' }, { status: 400 });
    }

    await InventoryItem.findByIdAndUpdate(itemId, { currentStock: newStock });

    const movement = await InventoryMovement.create({
      itemId,
      type,
      quantity,
      previousStock,
      newStock,
      reason,
      reference,
      createdBy: user.id,
    });

    if (newStock <= item.lowStockThreshold) {
      await Notification.create({
        type: 'low_stock',
        title: {
          en: `Low Stock Alert: ${item.name.en}`,
          ar: `تنبيه مخزون منخفض: ${item.name.ar}`,
        },
        message: {
          en: `${item.name.en} (SKU: ${item.sku}) stock is at ${newStock} units, below threshold of ${item.lowStockThreshold}.`,
          ar: `${item.name.ar} (SKU: ${item.sku}) المخزون عند ${newStock} وحدة، أقل من الحد الأدنى ${item.lowStockThreshold}.`,
        },
        data: { itemId: item._id, sku: item.sku, currentStock: newStock, threshold: item.lowStockThreshold },
      });
    }

    return NextResponse.json(movement, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create movement' }, { status: 500 });
  }
}
