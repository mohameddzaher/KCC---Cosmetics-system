import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/db';
import Order from '@/models/Order';
import PromoCode from '@/models/PromoCode';
import PromoUsage from '@/models/PromoUsage';
import User from '@/models/User';
import { getSession } from '@/lib/auth';
import { can } from '@/lib/roles';
import { computeTotals } from '@/lib/orderTotals';
import { claimPromo, discountFor, evaluatePromo, releasePromo } from '@/lib/promo';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

/**
 * What the customer may change about their own bill: a promo code, and their
 * referral credit.
 *
 * Both only matter once there is a price to reduce, which on a sample arrives
 * with the quotation — so this refuses to touch an order that has not been
 * quoted, and refuses once it has been paid.
 *
 * Nothing here trusts a number from the client: the code is re-evaluated, the
 * credit is capped by the balance and by the bill, and the totals are recomputed
 * by the same rule that priced the quotation.
 */

/** Money may still move while the order is waiting to be paid, and not after. */
const OPEN_STATUSES = new Set(['Quotation Sent', 'Awaiting Payment']);

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectDB();
    const { id } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
    }

    const order = await Order.findById(id);
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

    const isOwner = order.userId?.toString() === user.id;
    if (!isOwner && !can(user.role, 'orders.edit')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const subtotal = order.totals?.subtotal || 0;
    if (subtotal <= 0) {
      return NextResponse.json(
        { error: 'This order has no price yet — a quotation has to be sent first.' },
        { status: 409 }
      );
    }
    if (order.paymentStatus === 'paid') {
      return NextResponse.json(
        { error: 'This order is already paid.' },
        { status: 409 }
      );
    }
    if (!OPEN_STATUSES.has(order.status)) {
      return NextResponse.json(
        { error: 'This order is not open for payment changes.' },
        { status: 409 }
      );
    }

    const body = await req.json();
    const balanceOwner = order.userId?.toString();

    /* ---------------------------- promo code ---------------------------- */
    if (body.promoCode !== undefined) {
      const wanted = typeof body.promoCode === 'string' ? body.promoCode.trim() : '';

      // Lifting the old code off first returns its use to the pool, so trying
      // several codes cannot quietly eat a limited code's capacity.
      if (order.promoCodeId) {
        await releasePromo(String(order.promoCodeId));
        await PromoUsage.deleteMany({ promoCodeId: order.promoCodeId, orderId: order._id });
        order.promoCodeId = undefined;
      }

      if (wanted) {
        const decision = await evaluatePromo(wanted, balanceOwner, subtotal);
        if (!decision.ok) {
          await order.save();
          return NextResponse.json({ error: decision.error }, { status: 400 });
        }
        if (!(await claimPromo(decision.promoId))) {
          await order.save();
          return NextResponse.json(
            { error: 'That code has just run out.' },
            { status: 409 }
          );
        }
        order.promoCodeId = new mongoose.Types.ObjectId(decision.promoId);
        await PromoUsage.create({
          promoCodeId: decision.promoId,
          userId: balanceOwner,
          orderId: order._id,
          discountAmount: decision.discount,
        });
      }
    }

    /* -------------------------- referral credit -------------------------- */
    // Recomputed from the code now on the order, never from the client.
    let promoDiscount = 0;
    if (order.promoCodeId) {
      const promo = await PromoCode.findById(order.promoCodeId).lean();
      if (promo) promoDiscount = discountFor(promo as never, subtotal);
    }

    if (body.useCredit === false && (order.creditApplied || 0) > 0) {
      await User.findByIdAndUpdate(balanceOwner, {
        $inc: { referralBalance: order.creditApplied || 0 },
      });
      order.creditApplied = 0;
    }

    if (body.useCredit === true) {
      const customer = await User.findById(balanceOwner).select('referralBalance').lean();
      const balance = Math.max(0, (customer as { referralBalance?: number } | null)?.referralBalance || 0);
      const room = Math.max(0, subtotal - promoDiscount - (order.creditApplied || 0));
      const take = Number(Math.min(balance, room).toFixed(2));
      if (take > 0) {
        // Held, not just displayed: taken out of the balance now, so the same
        // credit cannot be promised to two orders at once.
        await User.findByIdAndUpdate(balanceOwner, { $inc: { referralBalance: -take } });
        order.creditApplied = Number(((order.creditApplied || 0) + take).toFixed(2));
      }
    }

    order.totals = computeTotals(subtotal, promoDiscount + (order.creditApplied || 0));
    await order.save();

    const after = await User.findById(balanceOwner).select('referralBalance').lean();

    return NextResponse.json({
      totals: order.totals,
      creditApplied: order.creditApplied || 0,
      promoCode: order.promoCodeId ? (await PromoCode.findById(order.promoCodeId).select('code').lean() as { code?: string } | null)?.code : null,
      creditBalance: (after as { referralBalance?: number } | null)?.referralBalance || 0,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
