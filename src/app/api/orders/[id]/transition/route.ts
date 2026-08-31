import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/db';
import Order from '@/models/Order';
import Notification from '@/models/Notification';
import { getSession } from '@/lib/auth';
import { can } from '@/lib/roles';
import {
  allowedTransitions, canTransition, findTransition, isValidStatus, statusMeta,
} from '@/lib/orderWorkflow';
import { sendEventEmail, adminUrl } from '@/lib/mailer';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET  — which moves the signed-in user may make from the order's current status.
 * POST — perform one, recording who did it and why.
 *
 * This is the ONLY way an order status changes. The rules live in
 * src/lib/orderWorkflow.ts, so the account manager cannot start production and
 * the factory cannot mark an order delivered, no matter what the client sends.
 */
export async function GET(_req: NextRequest, context: RouteContext) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectDB();
    const { id } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
    }

    const order = await Order.findById(id).select('status').lean();
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

    const status = (order as { status: string }).status;
    const transitions = can(user.role, 'orders.advance')
      ? allowedTransitions(status, user.role)
      : [];

    return NextResponse.json({ status, meta: statusMeta(status), transitions });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!can(user.role, 'orders.advance')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await connectDB();
    const { id } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
    }

    const body = await req.json();
    const to = String(body.to || '');
    const note = typeof body.note === 'string' ? body.note.trim().slice(0, 2000) : '';

    if (!isValidStatus(to)) {
      return NextResponse.json({ error: 'Unknown target status' }, { status: 400 });
    }

    const order = await Order.findById(id);
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

    const from = order.status;
    if (from === to) {
      return NextResponse.json({ error: 'The order is already in that status.' }, { status: 400 });
    }
    if (!canTransition(from, to, user.role)) {
      return NextResponse.json(
        { error: `Your role cannot move an order from "${from}" to "${to}".` },
        { status: 403 }
      );
    }

    const rule = findTransition(from, to);
    if (rule?.requiresNote && !note) {
      return NextResponse.json({ error: 'This action requires a note.' }, { status: 400 });
    }
    if (rule?.requiresCourier && !order.assignments?.courierName) {
      return NextResponse.json(
        { error: 'Assign a delivery rep before shipping this order.' },
        { status: 400 }
      );
    }

    order.status = to;
    order.timeline.push({
      from,
      to,
      byId: new mongoose.Types.ObjectId(user.id),
      byName: user.name,
      byRole: user.role,
      note: note || undefined,
      at: new Date(),
    });

    // Record who took ownership at each hand-off, so "who started production?"
    // is answerable from the order alone.
    const meta = statusMeta(to);
    if (meta.owner === 'FACTORY' && !order.assignments?.factoryUserId && user.role === 'FACTORY') {
      order.assignments = { ...(order.assignments || {}), factoryUserId: new mongoose.Types.ObjectId(user.id) };
    }
    if (meta.owner === 'LOGISTICS' && !order.assignments?.logisticsUserId && user.role === 'LOGISTICS') {
      order.assignments = { ...(order.assignments || {}), logisticsUserId: new mongoose.Types.ObjectId(user.id) };
    }

    await order.save();

    // Tell the next desk it is their turn.
    try {
      await Notification.create({
        type: 'order_status',
        title: {
          en: `Order ${order.orderNumber}: ${statusMeta(to).labelEn}`,
          ar: `الطلب ${order.orderNumber}: ${statusMeta(to).labelAr}`,
        },
        message: {
          en: `${user.name} moved it from "${statusMeta(from).labelEn}" to "${statusMeta(to).labelEn}".`,
          ar: `${user.name} نقله من "${statusMeta(from).labelAr}" إلى "${statusMeta(to).labelAr}".`,
        },
        data: { orderId: order._id, orderNumber: order.orderNumber, status: to, owner: meta.owner },
        isRead: false,
      });

      await sendEventEmail('emailOrderStatusChange', {
        subject: `${order.orderNumber} → ${statusMeta(to).labelEn}`,
        heading: `Order ${order.orderNumber} moved to "${statusMeta(to).labelEn}"`,
        intro: `${user.name} moved it from "${statusMeta(from).labelEn}".`,
        rows: [
          ['Order', order.orderNumber],
          ['From', statusMeta(from).labelEn],
          ['To', statusMeta(to).labelEn],
          ['By', `${user.name} (${user.role})`],
          ['Now with', meta.owner || '—'],
        ],
        actionUrl: adminUrl(`/admin/orders/${order._id}`),
        actionLabel: 'Open the order',
      });
    } catch {
      /* notification failure must never block the transition */
    }

    return NextResponse.json({
      status: order.status,
      meta: statusMeta(order.status),
      transitions: allowedTransitions(order.status, user.role),
      timeline: order.timeline,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
