/**
 * An order's bill of materials, as plain arithmetic: no database, so the rules
 * are tested on their own and the screen can preview what a save will do.
 */

export interface MaterialLine {
  itemId: string | { toString(): string };
  /** What the order needs, in the item's own unit. */
  quantity: number;
  /** What has already left the store for it. */
  consumed: number;
  cost?: number;
}

export interface PlanInput { itemId: string; quantity: number }

/** Statuses at which the factory takes the materials off the shelves. */
export const CONSUMES_AT = 'In Production';

/** Clean what the screen sent: known ids, real quantities, one line per item. */
export function normalizePlan(input: unknown): PlanInput[] {
  if (!Array.isArray(input)) throw new Error('Send the materials as a list.');
  const merged = new Map<string, number>();
  for (const raw of input) {
    const itemId = String((raw as PlanInput)?.itemId || '');
    const quantity = Number((raw as PlanInput)?.quantity);
    if (!/^[a-f0-9]{24}$/i.test(itemId)) throw new Error('Pick a material from the store.');
    if (!Number.isFinite(quantity) || quantity < 0) throw new Error('Enter a quantity of zero or more.');
    if (quantity > 1e9) throw new Error('That quantity is too large.');
    merged.set(itemId, round4((merged.get(itemId) || 0) + quantity));
  }
  return [...merged].map(([itemId, quantity]) => ({ itemId, quantity }));
}

/**
 * The new plan over the old lines. What was already used stays on record; an
 * item dropped from the plan keeps its line at zero so its stock can be
 * returned, and is cleared once nothing of it is held.
 */
export function mergePlan<T extends MaterialLine>(existing: T[], plan: PlanInput[]): MaterialLine[] {
  const wanted = new Map(plan.map((p) => [p.itemId, p.quantity]));
  const out: MaterialLine[] = [];
  for (const line of existing) {
    const id = String(line.itemId);
    out.push({
      itemId: line.itemId,
      quantity: wanted.has(id) ? wanted.get(id)! : 0,
      consumed: line.consumed || 0,
      cost: line.cost || 0,
    });
    wanted.delete(id);
  }
  for (const [itemId, quantity] of wanted) out.push({ itemId, quantity, consumed: 0, cost: 0 });
  return out.filter((l) => l.quantity > 0 || l.consumed > 0);
}

/** How much more each line must take from the store (negative: give back). */
export function materialDeltas(lines: MaterialLine[]): Array<{ itemId: string; delta: number }> {
  return lines.map((l) => ({ itemId: String(l.itemId), delta: round4((l.quantity || 0) - (l.consumed || 0)) }));
}

function round4(n: number) {
  return Math.round(n * 10000) / 10000;
}
