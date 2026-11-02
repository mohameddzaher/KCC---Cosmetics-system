import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/db';
import Order from '@/models/Order';
import InventoryItem from '@/models/InventoryItem';
import InventoryMovement from '@/models/InventoryMovement';
import { getSession } from '@/lib/auth';
import { can } from '@/lib/roles';
import { audited } from '@/lib/audit';
import { StockError, shortagesFor, syncOrderMaterials } from '@/lib/inventory';
import { mergePlan, normalizePlan, CONSUMES_AT } from '@/lib/materialsPlan';
import { money2 } from '@/lib/invoiceStatus';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

const HIDDEN = '+materials +materialsConsumedAt +materialsCost';

/**
 * GET — the order's bill of materials: each line with what is on the shelf,
 *       what has been taken, what it cost, and the store movements behind it.
 *       ?copyFrom=ORD-… returns another order's list to start from.
 * PUT — replace the list. Before production it is a plan; once production has
 *       started the store takes or returns the difference in the same request.
 */
export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const user = await getSession();
    if (!user || !can(user.role, 'inventory.view') || !can(user.role, 'orders.view')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    await connectDB();
    const { id } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
    }

    const copyFrom = new URL(req.url).searchParams.get('copyFrom')?.trim();
    if (copyFrom) {
      const source = await Order.findOne({ orderNumber: copyFrom }).select(`orderNumber ${HIDDEN}`).lean() as any;
      if (!source) return NextResponse.json({ error: 'No order with that number.' }, { status: 404 });
      return NextResponse.json({
        orderNumber: source.orderNumber,
        lines: (source.materials || []).map((l: any) => ({ itemId: String(l.itemId), quantity: l.quantity })),
      });
    }

    const order = await Order.findById(id).select(`orderNumber status totals ${HIDDEN}`).lean() as any;
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    return NextResponse.json(await describe(order, can(user.role, 'accounting.view')));
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export const PUT = audited(async function PUT(req: NextRequest, context: RouteContext) {
  try {
    const user = await getSession();
    if (!user || !can(user.role, 'inventory.manage')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    await connectDB();
    const { id } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    let plan;
    try {
      plan = normalizePlan(body.lines);
    } catch (e) {
      return NextResponse.json({ error: (e as Error).message }, { status: 400 });
    }

    const known = await InventoryItem.countDocuments({ _id: { $in: plan.map((p) => p.itemId) } });
    if (known !== plan.length) {
      return NextResponse.json({ error: 'Pick a material from the store.' }, { status: 400 });
    }

    const order = await Order.findById(id).select(HIDDEN);
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

    order.materials = mergePlan(order.materials || [], plan) as any;

    if (order.materialsConsumedAt) {
      try {
        await syncOrderMaterials(order, { id: user.id, name: user.name });
      } catch (e) {
        if (e instanceof StockError) {
          return NextResponse.json({ error: e.message, shortages: e.shortages }, { status: e.status });
        }
        throw e;
      }
    } else {
      order.materials = order.materials.filter((l: { quantity: number }) => l.quantity > 0) as any;
    }

    await order.save();
    const fresh = await Order.findById(id).select(`orderNumber status totals ${HIDDEN}`).lean();
    return NextResponse.json(await describe(fresh, can(user.role, 'accounting.view')));
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
});

async function describe(order: any, seesMoney: boolean) {
  const lines = order.materials || [];
  const items = await InventoryItem.find({ _id: { $in: lines.map((l: any) => l.itemId) } })
    .select('sku name unit currentStock lowStockThreshold costPerUnit').lean() as any[];
  const byId = new Map(items.map((i) => [String(i._id), i]));
  const consumed = Boolean(order.materialsConsumedAt);
  const shortages = consumed ? [] : await shortagesFor(lines);
  const short = new Set(shortages.map((s) => s.itemId));

  const movements = await InventoryMovement.find({ 'reference.type': 'order', 'reference.id': String(order._id) })
    .populate('itemId', 'sku name unit').populate('createdBy', 'name').sort({ createdAt: -1 }).limit(200).lean() as any[];

  const net = money2((order.totals?.subtotal || 0) - (order.totals?.discount || 0));
  const estimate = money2(lines.reduce((s: number, l: any) => {
    const left = Math.max(0, l.quantity - (l.consumed || 0));
    return s + (l.cost || 0) + left * (byId.get(String(l.itemId))?.costPerUnit || 0);
  }, 0));

  return {
    orderNumber: order.orderNumber,
    status: order.status,
    consumesAt: CONSUMES_AT,
    consumedAt: order.materialsConsumedAt || null,
    lines: lines.map((l: any) => {
      const item = byId.get(String(l.itemId));
      return {
        itemId: String(l.itemId),
        sku: item?.sku || '—',
        name: item?.name || { en: 'Deleted item', ar: 'صنف محذوف' },
        unit: item?.unit || '',
        quantity: l.quantity,
        consumed: l.consumed || 0,
        inStock: item?.currentStock ?? 0,
        low: item ? item.currentStock <= item.lowStockThreshold : false,
        short: short.has(String(l.itemId)),
        ...(seesMoney ? { cost: l.cost || 0, unitCost: item?.costPerUnit || 0 } : {}),
      };
    }),
    shortages,
    movements: movements.map((m) => ({
      _id: m._id, type: m.type, quantity: m.quantity, at: m.createdAt, reason: m.reason,
      sku: m.itemId?.sku, name: m.itemId?.name, unit: m.itemId?.unit, by: m.createdBy?.name,
    })),
    ...(seesMoney
      ? {
          money: {
            cost: money2(order.materialsCost || 0),
            estimate,
            net,
            margin: net > 0 ? money2(net - (consumed ? order.materialsCost || 0 : estimate)) : null,
          },
        }
      : {}),
  };
}
