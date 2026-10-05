import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { getSession } from '@/lib/auth';
import { evaluatePromo } from '@/lib/promo';

/**
 * Is this code usable by me, and what would it take off?
 *
 * Checks only — nothing is claimed here, so a customer typing a code to see
 * what it does cannot use up a limited one. The rules themselves live in
 * src/lib/promo.ts, shared with order creation and with a quotation.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    await connectDB();

    const body = await req.json();
    if (!body.code || typeof body.code !== 'string') {
      return NextResponse.json({ valid: false, error: 'Promo code is required' }, { status: 400 });
    }

    // The subtotal is what a percentage applies to and what `minOrder` is
    // measured against. A caller that does not know it yet gets the
    // eligibility answer without the amount.
    const subtotal = Number(body.subtotal);
    const decision = await evaluatePromo(
      body.code,
      user.id,
      Number.isFinite(subtotal) && subtotal > 0 ? subtotal : 0
    );

    if (!decision.ok) {
      return NextResponse.json({ valid: false, error: decision.error });
    }

    return NextResponse.json({
      valid: true,
      code: decision.code,
      discount: decision.discount,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to validate promo code';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
