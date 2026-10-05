/**
 * How an order's money is worked out — in one place.
 *
 * The rule was written inline where orders are created. A quotation computes
 * the same figures at a different moment, so leaving it inline would mean two
 * copies of the arithmetic that decides what a customer owes.
 *
 * Everything is recomputed on the server from the stored subtotal and the
 * discount the server itself granted. A client is never trusted with a total.
 */

/** Saudi VAT. */
export const VAT_RATE = 0.15;

export interface OrderTotals {
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
}

const money = (n: number) => Number(Math.max(0, n).toFixed(2));

/**
 * @param subtotal   the quoted price before anything is taken off
 * @param discount   what the server granted (promo, credit); clamped to subtotal
 * @param taxOverride a figure entered by hand, when the business sets one
 */
export function computeTotals(
  subtotal: number,
  discount = 0,
  taxOverride?: number
): OrderTotals {
  const base = money(subtotal);
  const off = Math.min(money(discount), base);
  // Tax is on the price, not on the discounted price — matching how orders
  // have always been totalled, so a quotation and an order never disagree.
  // VAT is charged on what is actually payable, so a discount reduces the tax
  // with it. The arithmetic this replaced taxed the full price and then took
  // the discount off, which was invisible while every discount was zero and
  // would start overcharging the moment a promo code reduced a real quotation.
  const net = money(base - off);
  const tax = taxOverride !== undefined && taxOverride > 0 ? money(taxOverride) : money(net * VAT_RATE);
  return { subtotal: base, discount: off, tax, total: money(net + tax) };
}
