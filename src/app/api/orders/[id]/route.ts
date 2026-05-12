import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/db';
import Order from '@/models/Order';
import { getSession, isAdmin } from '@/lib/auth';

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
      .populate('convertedFromSample', 'orderNumber type status');

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Customers can only see their own orders
    if (!isAdmin(user.role) && order.userId._id.toString() !== user.id) {
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

    // Admin can update any field
    if (isAdmin(user.role)) {
      const allowedAdminFields: Record<string, unknown> = {};

      if (body.status !== undefined) allowedAdminFields.status = body.status;
      if (body.internalNotes !== undefined) allowedAdminFields.internalNotes = body.internalNotes;
      if (body.paymentStatus !== undefined) allowedAdminFields.paymentStatus = body.paymentStatus;
      if (body.totals !== undefined) allowedAdminFields.totals = body.totals;
      if (body.bulkDetails !== undefined) allowedAdminFields.bulkDetails = body.bulkDetails;
      if (body.attachments !== undefined) allowedAdminFields.attachments = body.attachments;
      if (body.customerInfo !== undefined) allowedAdminFields.customerInfo = body.customerInfo;

      const updatedOrder = await Order.findByIdAndUpdate(id, allowedAdminFields, {
        new: true,
        runValidators: true,
      })
        .populate('userId', 'name email company')
        .populate('promoCodeId', 'code type value');

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
