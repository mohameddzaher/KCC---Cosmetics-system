import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import CrmAccount from '@/models/CrmAccount';
import InventoryItem from '@/models/InventoryItem';
import Invoice from '@/models/Invoice';
import Order from '@/models/Order';
import ProductCode from '@/models/ProductCode';
import User from '@/models/User';
import { getSession } from '@/lib/auth';
import { can } from '@/lib/roles';
import { escapeRegex } from '@/lib/api-helpers';
import { accountScope } from '@/lib/crmScope';
import { ACTIVE_INVOICE_STATUSES } from '@/lib/invoiceStatus';

export const dynamic = 'force-dynamic';

const LIMIT = 5;
interface Hit { type: string; id: string; title: string; subtitle?: string; href: string }

/**
 * One box that finds anything. Each kind is searched only for someone who may
 * see it, with the same scope the kind's own page applies, so this cannot be
 * used to read past a permission.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const q = (req.nextUrl.searchParams.get('q') || '').trim();
    if (q.length < 2) return NextResponse.json({ hits: [] });
    await connectDB();

    const rx = new RegExp(escapeRegex(q), 'i');
    const searches: Array<Promise<Hit[]>> = [];

    if (can(user.role, 'orders.viewAll')) {
      searches.push(
        Order.find({ $or: [{ orderNumber: rx }, { 'customerInfo.companyName': rx }, { 'customerInfo.personName': rx }] })
          .select('orderNumber status customerInfo').sort({ createdAt: -1 }).limit(LIMIT).lean()
          .then((rows) => (rows as unknown as Array<Record<string, any>>).map((o) => ({
            type: 'order', id: String(o._id), title: o.orderNumber,
            subtitle: o.customerInfo?.companyName || o.customerInfo?.personName, href: `/admin/orders/${o._id}`,
          })))
      );
    }
    if (can(user.role, 'customers.view')) {
      searches.push(
        User.find({ role: 'CUSTOMER', $or: [{ name: rx }, { email: rx }, { company: rx }, { phone: rx }] })
          .select('name email company').limit(LIMIT).lean()
          .then((rows) => (rows as unknown as Array<Record<string, any>>).map((c) => ({
            type: 'customer', id: String(c._id), title: c.name, subtitle: c.company || c.email, href: `/admin/customers/${c._id}`,
          })))
      );
    }
    if (can(user.role, 'crm.view')) {
      searches.push(
        accountScope(user).then((scope) =>
          CrmAccount.find({ active: { $ne: false }, ...scope, $and: [{ $or: [{ name: rx }, { nameAr: rx }, { brands: rx }, { 'keyPerson.name': rx }] }] })
            .select('name nameAr city stage').limit(LIMIT).lean())
          .then((rows) => (rows as unknown as Array<Record<string, any>>).map((a) => ({
            type: 'account', id: String(a._id), title: a.name, subtitle: a.nameAr, href: `/admin/crm/accounts/${a._id}`,
          })))
      );
      searches.push(
        ProductCode.find({ $or: [{ code: rx }, { product: rx }] }).select('code product').limit(LIMIT).lean()
          .then((rows) => (rows as unknown as Array<Record<string, any>>).map((p) => ({
            type: 'product', id: String(p._id), title: p.product || p.code, subtitle: p.code, href: '/admin/crm/catalogue',
          })))
      );
    }
    if (can(user.role, 'accounting.view')) {
      searches.push(
        Invoice.find({ invoiceNumber: rx, status: { $in: ACTIVE_INVOICE_STATUSES } })
          .select('invoiceNumber total').sort({ createdAt: -1 }).limit(LIMIT).lean()
          .then((rows) => (rows as unknown as Array<Record<string, any>>).map((i) => ({
            type: 'invoice', id: String(i._id), title: i.invoiceNumber, href: `/admin/accounting/invoices/${i._id}`,
          })))
      );
    }
    if (can(user.role, 'inventory.view')) {
      searches.push(
        InventoryItem.find({ $or: [{ 'name.en': rx }, { 'name.ar': rx }, { sku: rx }] }).select('name sku').limit(LIMIT).lean()
          .then((rows) => (rows as unknown as Array<Record<string, any>>).map((i) => ({
            type: 'stock', id: String(i._id), title: i.name?.en || i.name?.ar || i.sku, subtitle: i.sku, href: '/admin/inventory',
          })))
      );
    }

    return NextResponse.json({ hits: (await Promise.all(searches)).flat() });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
