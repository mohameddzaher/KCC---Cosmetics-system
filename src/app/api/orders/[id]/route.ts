import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/db';
import Order from '@/models/Order';
import { getSession } from '@/lib/auth';
import { can } from '@/lib/roles';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(
  req: NextRequest,
  context: RouteContext
) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const { id } = await context.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
    }

    const order = await Order.findById(id)
      .populate('userId', 'name email company phone')
      .populate('promoCodeId', 'code type value')
      .populate('surveyResponseId')
      .populate('convertedFromSample', 'orderNumber type status')
      .populate('assignments.accountManagerId', 'name email role')
      .populate('assignments.factoryUserId', 'name email role')
      .populate('assignments.logisticsUserId', 'name email role')
      .populate('timeline.byId', 'name role');

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Staff with orders.view may open any order; customers only their own.
    const ownerId = order.userId?._id?.toString() ?? order.userId?.toString();
    if (!can(user.role, 'orders.view') && ownerId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(order);
  } catch (error: any) {
    console.error('Orders GET [id] error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  context: RouteContext
) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const { id } = await context.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
    }

    const existingOrder = await Order.findById(id);
    if (!existingOrder) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const body = await req.json();

    // Staff edits. `status` is deliberately NOT settable here — it moves only
    // through POST /api/orders/[id]/transition, which enforces the workflow
    // rules and writes the audit timeline.
    if (can(user.role, 'orders.edit')) {
      const update: Record<string, unknown> = {};

      if (body.internalNotes !== undefined) update.internalNotes = body.internalNotes;
      if (body.paymentStatus !== undefined) update.paymentStatus = body.paymentStatus;
      if (body.totals !== undefined) update.totals = body.totals;
      if (body.bulkDetails !== undefined) update.bulkDetails = body.bulkDetails;
      if (body.attachments !== undefined) update.attachments = body.attachments;
      if (body.customerInfo !== undefined) update.customerInfo = body.customerInfo;
      if (body.priority !== undefined) update.priority = body.priority;
      if (body.dueDate !== undefined) update.dueDate = body.dueDate || null;

      if (body.assignments !== undefined) {
        if (!can(user.role, 'orders.assign')) {
          return NextResponse.json(
            { error: 'Your role cannot reassign orders.' },
            { status: 403 }
          );
        }
        const a = body.assignments as Record<string, unknown>;
        update.assignments = {
          ...(existingOrder.assignments?.toObject?.() ?? existingOrder.assignments ?? {}),
          ...(a.accountManagerId !== undefined ? { accountManagerId: a.accountManagerId || null } : {}),
          ...(a.factoryUserId !== undefined ? { factoryUserId: a.factoryUserId || null } : {}),
          ...(a.logisticsUserId !== undefined ? { logisticsUserId: a.logisticsUserId || null } : {}),
          ...(a.courierName !== undefined ? { courierName: a.courierName } : {}),
          ...(a.courierPhone !== undefined ? { courierPhone: a.courierPhone } : {}),
          ...(a.trackingNumber !== undefined ? { trackingNumber: a.trackingNumber } : {}),
        };
      }

      if (body.status !== undefined && body.status !== existingOrder.status) {
        return NextResponse.json(
          { error: 'Use the workflow actions to change an order status.' },
          { status: 400 }
        );
      }

      const updatedOrder = await Order.findByIdAndUpdate(id, update, {
        new: true,
        runValidators: true,
      })
        .populate('userId', 'name email company')
        .populate('promoCodeId', 'code type value')
        .populate('assignments.accountManagerId', 'name email role')
        .populate('assignments.factoryUserId', 'name email role')
        .populate('assignments.logisticsUserId', 'name email role');

      return NextResponse.json(updatedOrder);
    }

    // Customer can only update their own orders
    if (existingOrder.userId.toString() !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Customer can only update if status is 'Submitted'
    if (existingOrder.status !== 'Submitted') {
      return NextResponse.json(
        { error: 'You can only modify orders that are in "Submitted" status' },
        { status: 400 }
      );
    }

    // Customer allowed fields
    const allowedCustomerFields: Record<string, unknown> = {};
    if (body.customerInfo !== undefined) allowedCustomerFields.customerInfo = body.customerInfo;
    if (body.attachments !== undefined) allowedCustomerFields.attachments = body.attachments;

    const updatedOrder = await Order.findByIdAndUpdate(id, allowedCustomerFields, {
      new: true,
      runValidators: true,
    })
      .populate('userId', 'name email company')
      .populate('promoCodeId', 'code type value');

    return NextResponse.json(updatedOrder);
  } catch (error: any) {
    console.error('Orders PUT [id] error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/orders/[id] -> admins only
export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    const user = await getSession();
    if (!user || !can(user.role, 'orders.delete')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    await connectDB();
    const { id } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
    }
    const order = await Order.findByIdAndDelete(id);
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Order deleted successfully' });
  } catch (error: any) {
    console.error('Orders DELETE [id] error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
