import PromoCode from '@/models/PromoCode';
import PromoUsage from '@/models/PromoUsage';

/**
 * Whether a promo code may be used, and what it takes off — in one place.
 *
 * These rules were written twice (the validate endpoint and order creation) and
 * were about to be written a third time for a quotation. Two copies had already
 * drifted: neither checked `minOrder`, a field the admin form offers and the
 * model stores, so a "spend 500 to use this" code worked on any amount.
 *
 * Capacity is claimed atomically and separately from the check, because between
 * reading a code and using it someone else may have taken the last one.
 */

export interface PromoEligible {
  ok: true;
  promoId: string;
  code: string;
  discount: number;
}
export interface PromoRejected {
  ok: false;
  error: string;
}
export type PromoDecision = PromoEligible | PromoRejected;

interface PromoDoc {
  _id: unknown;
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  minOrder?: number;
  maxDiscount?: number;
  expiresAt?: Date;
  usageLimit?: number;
  perUserLimit?: number;
  usedCount?: number;
  isActive?: boolean;
}

/** What this code takes off that subtotal, capped by its own ceiling and the bill. */
export function discountFor(promo: PromoDoc, subtotal: number): number {
  let discount =
    promo.type === 'percentage' ? (subtotal * promo.value) / 100 : promo.value;
  if (promo.maxDiscount && promo.maxDiscount > 0 && discount > promo.maxDiscount) {
    discount = promo.maxDiscount;
  }
  if (discount > subtotal) discount = subtotal;
  return Number(Math.max(0, discount).toFixed(2));
}

/**
 * Can this customer use this code on this amount? No capacity is taken here —
 * call `claimPromo` for that, and treat a false return as "someone beat you".
 */
export async function evaluatePromo(
  code: string,
  userId: string | undefined,
  subtotal: number
): Promise<PromoDecision> {
  const trimmed = (code || '').trim().toUpperCase();
  if (!trimmed) return { ok: false, error: 'Promo code is required' };

  const promo = (await PromoCode.findOne({ code: trimmed }).lean()) as PromoDoc | null;
  if (!promo) return { ok: false, error: 'Promo code not found' };
  if (!promo.isActive) return { ok: false, error: 'Promo code is no longer active' };
  if (promo.expiresAt && new Date(promo.expiresAt) < new Date()) {
    return { ok: false, error: 'Promo code has expired' };
  }
  if ((promo.usageLimit || 0) > 0 && (promo.usedCount || 0) >= (promo.usageLimit || 0)) {
    return { ok: false, error: 'Promo code usage limit reached' };
  }
  if ((promo.minOrder || 0) > 0 && subtotal < (promo.minOrder || 0)) {
    return {
      ok: false,
      error: `This code needs an order of at least ${promo.minOrder}`,
    };
  }
  if (userId && (promo.perUserLimit || 0) > 0) {
    const used = await PromoUsage.countDocuments({ promoCodeId: promo._id, userId });
    if (used >= (promo.perUserLimit || 0)) {
      return {
        ok: false,
        error: 'You have already used this promo code the maximum number of times',
      };
    }
  }

  return {
    ok: true,
    promoId: String(promo._id),
    code: promo.code,
    discount: discountFor(promo, subtotal),
  };
}

/**
 * Take one use of the code. Conditional on capacity, so two customers racing
 * for the last one cannot both win.
 *
 * @returns false when the code was exhausted between the check and here
 */
export async function claimPromo(promoId: string): Promise<boolean> {
  const claimed = await PromoCode.findOneAndUpdate(
    {
      _id: promoId,
      isActive: true,
      $or: [{ usageLimit: 0 }, { $expr: { $lt: ['$usedCount', '$usageLimit'] } }],
    },
    { $inc: { usedCount: 1 } },
    { new: true }
  );
  return !!claimed;
}

/** Give the use back when a code is lifted off an order before it is paid. */
export async function releasePromo(promoId: string): Promise<void> {
  await PromoCode.findOneAndUpdate(
    { _id: promoId, usedCount: { $gt: 0 } },
    { $inc: { usedCount: -1 } }
  );
}
