import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/db';
import Order from '@/models/Order';
import OrderFeedback, { FEEDBACK_ASPECTS, type FeedbackAspect } from '@/models/OrderFeedback';
import Notification from '@/models/Notification';
import { getSession } from '@/lib/auth';
import { can } from '@/lib/roles';
import { statusMeta } from '@/lib/orderWorkflow';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

/** Feedback can only be given once the customer actually has the product. */
function isDelivered(status: string): boolean {
  const stage = statusMeta(status).stage;
  return stage === 'done';
}

function clampScore(v: unknown): number | undefined {
  const n = Number(v);
  if (!Number.isFinite(n)) return undefined;
  return Math.min(5, Math.max(1, Math.round(n)));
}

export async function GET(_req: NextRequest, context: RouteContext) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectDB();
    const { id } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
    }

    const order = await Order.findById(id).select('userId status').lean();
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

    const ownerId = (order as { userId?: { toString(): string } }).userId?.toString();
    const isStaff = can(session.role, 'orders.view');
    if (!isStaff && ownerId !== session.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const feedback = await OrderFeedback.findOne({ orderId: id })
      .populate('staffResponderId', 'name role')
      .lean();

    return NextResponse.json({
      feedback: feedback ?? null,
      canSubmit: !isStaff && ownerId === session.id && isDelivered((order as { status: string }).status),
      aspects: FEEDBACK_ASPECTS,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/** Customer submits (or revises) their feedback. */
export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectDB();
    const { id } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
    }

    const order = await Order.findById(id);
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

    if (order.userId?.toString() !== session.id) {
      return NextResponse.json({ error: 'This is not your order.' }, { status: 403 });
    }
    if (!isDelivered(order.status)) {
      return NextResponse.json(
        { error: 'You can share feedback once the order has been delivered.' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const rating = clampScore(body.rating);
    if (!rating) {
      return NextResponse.json({ error: 'An overall rating is required.' }, { status: 400 });
    }

    const aspects: Partial<Record<FeedbackAspect, number>> = {};
    for (const key of FEEDBACK_ASPECTS) {
      const v = clampScore(body.aspects?.[key]);
      if (v) aspects[key] = v;
    }

    const doc = await OrderFeedback.findOneAndUpdate(
      { orderId: id },
      {
        $set: {
          orderId: id,
          userId: session.id,
          rating,
          aspects,
          comment: typeof body.comment === 'string' ? body.comment.trim().slice(0, 4000) : undefined,
          wouldReorder: typeof body.wouldReorder === 'boolean' ? body.wouldReorder : undefined,
          allowPublish: !!body.allowPublish,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Tell the account manager — a low score should not sit unread.
    try {
      await Notification.create({
        type: 'order_feedback',
        title: {
          en: `Feedback on ${order.orderNumber}: ${rating}/5`,
          ar: `تقييم للطلب ${order.orderNumber}: ${rating}/5`,
        },
        message: {
          en: `${session.name} rated this order ${rating}/5.${doc.comment ? ` "${doc.comment.slice(0, 120)}"` : ''}`,
          ar: `${session.name} قيّم هذا الطلب ${rating}/5.${doc.comment ? ` «${doc.comment.slice(0, 120)}»` : ''}`,
        },
        data: { orderId: order._id, orderNumber: order.orderNumber, rating },
        isRead: false,
      });
    } catch {
      /* notification failure must never block the feedback */
    }

    return NextResponse.json(doc, { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/** Staff replies to the customer's feedback. */
export async function PUT(req: NextRequest, context: RouteContext) {
  try {
    const session = await getSession();
    if (!session || !can(session.role, 'orders.edit')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await connectDB();
    const { id } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
    }

    const body = await req.json();
    const response = typeof body.staffResponse === 'string' ? body.staffResponse.trim().slice(0, 4000) : '';
    if (!response) {
      return NextResponse.json({ error: 'A reply is required.' }, { status: 400 });
    }

    const doc = await OrderFeedback.findOneAndUpdate(
      { orderId: id },
      { $set: { staffResponse: response, staffResponderId: session.id, respondedAt: new Date() } },
      { new: true }
    );
    if (!doc) return NextResponse.json({ error: 'No feedback on this order yet.' }, { status: 404 });

    return NextResponse.json(doc);
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
