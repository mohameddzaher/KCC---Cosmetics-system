import { Types } from 'mongoose';
import InventoryItem from '@/models/InventoryItem';
import InventoryMovement from '@/models/InventoryMovement';
import Expense from '@/models/Expense';
import Notification from '@/models/Notification';
import { sendEventEmail, adminUrl } from '@/lib/mailer';
import { money2 } from '@/lib/invoiceStatus';
import { materialDeltas, type MaterialLine } from '@/lib/materialsPlan';

/**
 * The store, kept honest in one place.
 *
 * Every change to a stock level goes through `moveStock`, which changes the
 * level atomically (a store cannot go below zero, even with two people taking
 * the last of something at once), writes the movement that explains it, and
 * raises the low-stock alarm when a threshold is crossed.
 *
 * Orders draw on the store through `syncOrderMaterials`. Before production an
 * order's material list is only a plan. The moment the factory starts it, the
 * list is taken from the shelves; from then on any change to the list takes or
 * returns exactly the difference, so the store and the order never disagree.
 */

type Id = string | Types.ObjectId;
interface Actor { id?: string; name?: string }

export class StockError extends Error {
  constructor(message: string, public shortages: Shortage[] = [], public status = 409) {
    super(message);
    this.name = 'StockError';
  }
}

export interface Shortage {
  itemId: string;
  sku: string;
  name: { en: string; ar: string };
  unit: string;
  needed: number;
  available: number;
}

interface ItemDoc {
  _id: Types.ObjectId;
  sku: string;
  name: { en: string; ar: string };
  unit: string;
  currentStock: number;
  lowStockThreshold: number;
  costPerUnit: number;
}

export interface MoveInput {
  itemId: Id;
  type: 'IN' | 'OUT' | 'ADJUSTMENT';
  quantity: number;
  reason?: string;
  reference?: { type: 'order' | 'purchase' | 'adjustment'; id?: string };
  /** Purchase price per unit for a receipt; folds into the item's average cost. */
  unitCost?: number;
  actor?: Actor;
}

/** Change one stock level and record why. Throws StockError rather than go negative. */
export async function moveStock(input: MoveInput) {
  const qty = Number(input.quantity);
  if (!Number.isFinite(qty) || qty < 0 || (input.type !== 'ADJUSTMENT' && qty === 0)) {
    throw new StockError('Enter a quantity above zero.', [], 400);
  }

  let before: ItemDoc | null;
  let after: ItemDoc | null;

  if (input.type === 'ADJUSTMENT') {
    // A count: the shelf holds what was counted, whatever the books said.
    before = await InventoryItem.findById(input.itemId).lean() as ItemDoc | null;
    if (!before) throw new StockError('Inventory item not found', [], 404);
    after = await InventoryItem.findByIdAndUpdate(input.itemId, { currentStock: qty }, { new: true }).lean() as ItemDoc | null;
  } else if (input.type === 'OUT') {
    after = await InventoryItem.findOneAndUpdate(
      { _id: input.itemId, currentStock: { $gte: qty } },
      { $inc: { currentStock: -qty } },
      { new: true }
    ).lean() as ItemDoc | null;
    if (!after) {
      const item = await InventoryItem.findById(input.itemId).lean() as ItemDoc | null;
      if (!item) throw new StockError('Inventory item not found', [], 404);
      throw new StockError('Insufficient stock for this operation', [shortageOf(item, qty)]);
    }
    before = { ...after, currentStock: after.currentStock + qty };
  } else {
    const unitCost = Number(input.unitCost);
    if (Number.isFinite(unitCost) && unitCost > 0) {
      // Weighted average: what is already on the shelf at its cost, plus what
      // arrived at the price paid. Done in one update so two receipts at once
      // cannot each average against a stale level.
      after = await InventoryItem.findOneAndUpdate(
        { _id: input.itemId },
        [{
          $set: {
            costPerUnit: {
              $round: [{
                $cond: [
                  { $gt: [{ $add: [{ $max: ['$currentStock', 0] }, qty] }, 0] },
                  {
                    $divide: [
                      { $add: [{ $multiply: [{ $max: ['$currentStock', 0] }, { $ifNull: ['$costPerUnit', 0] }] }, qty * unitCost] },
                      { $add: [{ $max: ['$currentStock', 0] }, qty] },
                    ],
                  },
                  unitCost,
                ],
              }, 4],
            },
            currentStock: { $add: ['$currentStock', qty] },
          },
        }],
        { new: true, updatePipeline: true }
      ).lean() as ItemDoc | null;
    } else {
      after = await InventoryItem.findByIdAndUpdate(input.itemId, { $inc: { currentStock: qty } }, { new: true }).lean() as ItemDoc | null;
    }
    if (!after) throw new StockError('Inventory item not found', [], 404);
    before = { ...after, currentStock: after.currentStock - qty };
  }

  const unitCost = input.type === 'IN' && Number(input.unitCost) > 0
    ? Number(input.unitCost)
    : before.costPerUnit || 0;

  const movement = await InventoryMovement.create({
    itemId: after!._id,
    type: input.type,
    quantity: qty,
    previousStock: before.currentStock,
    newStock: after!.currentStock,
    reason: input.reason,
    reference: input.reference,
    unitCost,
    createdBy: input.actor?.id,
  });

  if (after!.currentStock <= after!.lowStockThreshold && before.currentStock > after!.lowStockThreshold) {
    await alertLowStock(after!);
  }

  return { movement, item: after!, previousStock: before.currentStock, unitCost };
}

function shortageOf(item: ItemDoc, needed: number): Shortage {
  return {
    itemId: String(item._id), sku: item.sku, name: item.name, unit: item.unit,
    needed, available: item.currentStock,
  };
}

/** Tell the team, once, that something has run low. Never blocks the move. */
export async function alertLowStock(item: ItemDoc) {
  try {
    await Notification.create({
      type: 'low_stock',
      title: {
        en: `Low Stock Alert: ${item.name.en}`,
        ar: `تنبيه مخزون منخفض: ${item.name.ar}`,
      },
      message: {
        en: `${item.name.en} (SKU: ${item.sku}) stock is at ${item.currentStock} ${item.unit}, below threshold of ${item.lowStockThreshold}.`,
        ar: `${item.name.ar} (SKU: ${item.sku}) المخزون عند ${item.currentStock} ${item.unit}، أقل من الحد الأدنى ${item.lowStockThreshold}.`,
      },
      data: { itemId: item._id, sku: item.sku, currentStock: item.currentStock, threshold: item.lowStockThreshold },
    });

    await sendEventEmail('emailLowStock', {
      subject: `Low stock: ${item.name.en} (${item.sku})`,
      heading: 'Stock has fallen below its threshold',
      rows: [
        ['Item', item.name.en],
        ['SKU', item.sku],
        ['In stock', String(item.currentStock)],
        ['Threshold', String(item.lowStockThreshold)],
      ],
      actionUrl: adminUrl('/admin/inventory'),
      actionLabel: 'Open inventory',
    });
  } catch (e) {
    console.error('[inventory] low-stock alert failed', item.sku, e);
  }
}

/**
 * A receipt that was paid for is a cost. Recorded as the purchase, so the
 * accounts show the money leaving on the day it left; using the material later
 * is a cost of the order it went into, not a second expense.
 */
export async function recordPurchaseExpense(input: {
  item: { sku: string; name: { en: string; ar: string }; category?: string };
  quantity: number;
  unitCost: number;
  vatAmount?: number;
  vendor?: string;
  reference?: string;
  actor?: Actor;
}) {
  const amount = money2(input.quantity * input.unitCost + (Number(input.vatAmount) || 0));
  if (amount <= 0) return null;
  const packaging = /pack|bottle|jar|cap|label|box|tube|عبو|غطا|علب|ملصق|تغليف/i.test(
    `${input.item.category || ''} ${input.item.name.en} ${input.item.name.ar}`
  );
  return Expense.create({
    category: packaging ? 'packaging' : 'raw_materials',
    description: {
      en: `Stock received: ${input.quantity} × ${input.item.name.en} (${input.item.sku})`,
      ar: `استلام مخزون: ${input.quantity} × ${input.item.name.ar} (${input.item.sku})`,
    },
    amount,
    vatAmount: money2(Number(input.vatAmount) || 0),
    date: new Date(),
    vendor: input.vendor,
    reference: input.reference,
    createdBy: input.actor?.id,
    notes: `Recorded automatically from the stock receipt by ${input.actor?.name || 'the system'}.`,
  });
}

/* ------------------------------------------------------------------ */
/* Orders                                                              */
/* ------------------------------------------------------------------ */

interface OrderLike {
  _id: Types.ObjectId;
  orderNumber: string;
  materials: Array<MaterialLine & { cost?: number }>;
  materialsConsumedAt?: Date;
  materialsCost?: number;
}

/** What the plan still needs that the shelves do not hold. Reads only. */
export async function shortagesFor(lines: MaterialLine[]): Promise<Shortage[]> {
  const needs = materialDeltas(lines).filter((d) => d.delta > 0);
  if (needs.length === 0) return [];
  const items = await InventoryItem.find({ _id: { $in: needs.map((n) => n.itemId) } }).lean() as unknown as ItemDoc[];
  const byId = new Map(items.map((i) => [String(i._id), i]));
  const out: Shortage[] = [];
  for (const n of needs) {
    const item = byId.get(n.itemId);
    if (!item) {
      out.push({ itemId: n.itemId, sku: '—', name: { en: 'Deleted item', ar: 'صنف محذوف' }, unit: '', needed: n.delta, available: 0 });
    } else if (item.currentStock < n.delta) {
      out.push(shortageOf(item, n.delta));
    }
  }
  return out;
}

/**
 * Bring the store in line with the order's list. Takes what the list added,
 * returns what it dropped, and prices what was taken at the average cost of
 * the day. All or nothing: if one material runs out half way, everything
 * already taken for this call goes back and the order is left as it was.
 *
 * Mutates `order.materials` and `order.materialsCost`; the caller saves.
 */
export async function syncOrderMaterials(order: OrderLike, actor?: Actor) {
  const shortages = await shortagesFor(order.materials);
  if (shortages.length) throw new StockError('Not enough stock for this order.', shortages);

  const done: Array<{ itemId: string; delta: number }> = [];
  try {
    for (const d of materialDeltas(order.materials)) {
      if (d.delta === 0) continue;
      const line = order.materials.find((l) => String(l.itemId) === d.itemId)!;
      const taking = d.delta > 0;
      // Returns go back at what they cost when they left, not today's average.
      const returnCost = !taking && line.consumed > 0 ? (line.cost || 0) / line.consumed : undefined;
      const { unitCost } = await moveStock({
        itemId: d.itemId,
        type: taking ? 'OUT' : 'IN',
        quantity: Math.abs(d.delta),
        reason: taking ? `Used in production of ${order.orderNumber}` : `Returned from ${order.orderNumber}`,
        reference: { type: 'order', id: String(order._id) },
        unitCost: returnCost,
        actor,
      });
      done.push(d);

      const perUnit = returnCost ?? unitCost;
      line.cost = money2((line.cost || 0) + d.delta * perUnit);
      line.consumed = (line.consumed || 0) + d.delta;
    }
  } catch (e) {
    for (const d of done.reverse()) {
      await moveStock({
        itemId: d.itemId,
        type: d.delta > 0 ? 'IN' : 'OUT',
        quantity: Math.abs(d.delta),
        reason: `Reversed: ${order.orderNumber} could not be updated`,
        reference: { type: 'order', id: String(order._id) },
        actor,
      }).catch((err) => console.error('[inventory] reversal failed', order.orderNumber, d, err));
    }
    if (e instanceof StockError && e.shortages.length) {
      throw new StockError('Not enough stock for this order.', e.shortages);
    }
    throw e;
  }

  order.materials = order.materials.filter((l) => l.quantity > 0 || l.consumed > 0);
  order.materialsCost = money2(order.materials.reduce((s, l) => s + (l.cost || 0), 0));
  return { moved: done.length };
}

/** Raw materials used across orders in a period, at what they cost. */
export async function materialsUsed(from: Date, to: Date) {
  const rows = await InventoryMovement.aggregate([
    { $match: { 'reference.type': 'order', createdAt: { $gte: from, $lte: to } } },
    {
      $group: {
        _id: null,
        out: { $sum: { $cond: [{ $eq: ['$type', 'OUT'] }, { $multiply: ['$quantity', { $ifNull: ['$unitCost', 0] }] }, 0] } },
        back: { $sum: { $cond: [{ $eq: ['$type', 'IN'] }, { $multiply: ['$quantity', { $ifNull: ['$unitCost', 0] }] }, 0] } },
      },
    },
  ]);
  return money2((rows[0]?.out || 0) - (rows[0]?.back || 0));
}
