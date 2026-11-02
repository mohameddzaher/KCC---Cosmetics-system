import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/db';
import Category from '@/models/Category';
import ContactMessage from '@/models/ContactMessage';
import CustomerActivity from '@/models/CustomerActivity';
import CrmAccount from '@/models/CrmAccount';
import CrmActivity from '@/models/CrmActivity';
import InventoryItem from '@/models/InventoryItem';
import InventoryMovement from '@/models/InventoryMovement';
import KnowledgeArticle from '@/models/KnowledgeArticle';
import Order from '@/models/Order';
import PromoCode from '@/models/PromoCode';
import Referral from '@/models/Referral';
import User from '@/models/User';
import { getSession } from '@/lib/auth';
import { can, type Permission } from '@/lib/roles';
import { audited, recordAudit } from '@/lib/audit';
import { buildXlsx, type XlsxColumn } from '@/lib/xlsx';
import { scopeFilterForRole, statusLabel } from '@/lib/orderWorkflow';
import { clientProfile, loadClient } from '@/lib/clientProfile';
import { accountScope, mayOpenAccount } from '@/lib/crmScope';

export const dynamic = 'force-dynamic';

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Excel for every list in the admin panel.
 *
 * The screen filters in the browser, so it sends the ids of the rows it is
 * showing and this reads them again here, under the same permission the page
 * needs. That gives "what I am looking at" exactly, and a tampered list of ids
 * still cannot return anything this person could not open. With no ids it is
 * the whole list.
 */

const day = (d?: unknown) => (d ? new Date(d as string).toISOString().slice(0, 10) : '');
const text = (w: string, n: number) => ({ width: n, header: w });

interface Sheet {
  permission: Permission;
  title: string;
  columns: Array<Omit<XlsxColumn, 'key'> & { key?: string }>;
  rows: (ids: unknown[] | null, user: { id: string; role: string }) => Promise<Array<unknown[]>>;
}

const within = (ids: unknown[] | null, base: Record<string, unknown> = {}) =>
  (ids ? { ...base, _id: { $in: ids } } : base);

function orderSheet(title: string, statuses?: string[]): Sheet {
  return {
    permission: 'orders.view',
    title,
    columns: [
      text('Order', 22), text('Type', 8), text('Status', 20), text('Payment', 10), text('Company', 26), text('Contact', 20),
      text('Phone', 16), text('Account manager', 20), text('Courier', 16), text('Tracking', 16),
      { header: 'Total', type: 'money', width: 13 }, text('Created', 12),
    ],
    rows: async (ids, user) => {
      const scope = can(user.role, 'orders.viewAll') ? {} : scopeFilterForRole(user.role, user.id) || {};
      const docs = await Order.find(within(ids, { ...scope, ...(statuses ? { status: { $in: statuses } } : {}) }))
        .populate('assignments.accountManagerId', 'name').sort({ createdAt: -1 }).limit(20000).lean() as any[];
      return docs.map((o) => [
        o.orderNumber, o.type, statusLabel(o.status, 'en'), o.paymentStatus, o.customerInfo?.companyName, o.customerInfo?.personName,
        o.customerInfo?.phone, o.assignments?.accountManagerId?.name, o.assignments?.courierName, o.assignments?.trackingNumber,
        o.totals?.total || 0, day(o.createdAt),
      ]);
    },
  };
}

const SHEETS: Record<string, Sheet> = {
  orders: orderSheet('Orders'),
  production: orderSheet('Production floor', ['Queued for Production', 'In Production', 'Quality Check', 'Production Complete']),
  logistics: orderSheet('Dispatch', ['Production Complete', 'Ready to Ship', 'Shipped', 'Out for Delivery', 'Delivered']),
  customers: {
    permission: 'customers.view',
    title: 'Customers',
    columns: [text('Name', 24), text('Company', 26), text('Email', 28), text('Phone', 16), text('City', 14), text('Stage', 12), text('Account manager', 20), text('Active', 8), text('Since', 12)],
    rows: async (ids) => {
      const docs = await User.find(within(ids, { role: 'CUSTOMER' })).populate('accountManagerId', 'name').sort({ createdAt: -1 }).lean() as any[];
      return docs.map((u) => [u.name, u.company, u.email, u.phone, u.city, u.stage, u.accountManagerId?.name, u.isActive === false ? 'No' : 'Yes', day(u.createdAt)]);
    },
  },
  messages: {
    permission: 'inbox.view',
    title: 'Inbox',
    columns: [text('Date', 12), text('Name', 22), text('Email', 26), text('Subject', 30), text('Message', 60), text('Status', 10)],
    rows: async (ids) => {
      const docs = await ContactMessage.find(within(ids)).sort({ createdAt: -1 }).limit(20000).lean() as any[];
      return docs.map((m) => [day(m.createdAt), m.name, m.email, m.subject, m.message, m.status]);
    },
  },
  inventory: {
    permission: 'inventory.view',
    title: 'Inventory',
    columns: [text('SKU', 16), text('Item', 28), text('Category', 16), { header: 'In stock', type: 'number', width: 10 }, text('Unit', 8), { header: 'Low stock at', type: 'number', width: 12 }, { header: 'Cost per unit', type: 'money', width: 13 }, { header: 'Stock value', type: 'money', width: 13 }],
    rows: async (ids) => {
      const docs = await InventoryItem.find(within(ids)).sort({ sku: 1 }).lean() as any[];
      return docs.map((i) => [i.sku, i.name?.en || i.name?.ar, i.category, i.currentStock, i.unit, i.lowStockThreshold, i.costPerUnit || 0, (i.currentStock || 0) * (i.costPerUnit || 0)]);
    },
  },
  movements: {
    permission: 'inventory.view',
    title: 'Stock movements',
    columns: [text('Date', 12), text('SKU', 16), text('Item', 28), text('Type', 12), { header: 'Quantity', type: 'number', width: 10 }, { header: 'Before', type: 'number', width: 10 }, { header: 'After', type: 'number', width: 10 }, text('Reason', 34), text('By', 20)],
    rows: async (ids) => {
      const docs = await InventoryMovement.find(within(ids)).populate('itemId', 'sku name').populate('createdBy', 'name').sort({ createdAt: -1 }).limit(20000).lean() as any[];
      return docs.map((m) => [day(m.createdAt), m.itemId?.sku, m.itemId?.name?.en, m.type, m.quantity, m.previousStock, m.newStock, m.reason, m.createdBy?.name]);
    },
  },
  promos: {
    permission: 'promos.manage',
    title: 'Promo codes',
    columns: [text('Code', 16), text('Type', 12), { header: 'Value', type: 'number', width: 10 }, { header: 'Used', type: 'number', width: 8 }, { header: 'Limit', type: 'number', width: 8 }, text('Expires', 12), text('Active', 8)],
    rows: async (ids) => {
      const docs = await PromoCode.find(within(ids)).sort({ createdAt: -1 }).lean() as any[];
      return docs.map((p) => [p.code, p.type, p.value, p.usedCount || 0, p.usageLimit, day(p.expiresAt), p.isActive ? 'Yes' : 'No']);
    },
  },
  referrals: {
    permission: 'referrals.manage',
    title: 'Referrals',
    columns: [text('Date', 12), text('Referred by', 24), text('New customer', 24), text('Code', 14), text('Status', 10), { header: 'Credit', type: 'money', width: 12 }, text('Order', 22)],
    rows: async (ids) => {
      const docs = await Referral.find(within(ids)).populate('referrerId', 'name').populate('referredId', 'name').populate('orderId', 'orderNumber').sort({ createdAt: -1 }).lean() as any[];
      return docs.map((r) => [day(r.createdAt), r.referrerId?.name, r.referredId?.name, r.referralCode, r.status, r.creditAmount || 0, r.orderId?.orderNumber]);
    },
  },
  users: {
    permission: 'users.view',
    title: 'Team',
    columns: [text('Name', 24), text('Email', 28), text('Role', 18), text('Reports to', 22), text('Active', 8), text('Since', 12)],
    rows: async (ids) => {
      const docs = await User.find(within(ids, { role: { $ne: 'CUSTOMER' } })).populate('managerId', 'name').sort({ name: 1 }).lean() as any[];
      return docs.map((u) => [u.name, u.email, u.role, u.managerId?.name, u.isActive === false ? 'No' : 'Yes', day(u.createdAt)]);
    },
  },
  tasks: {
    permission: 'crm.view',
    title: 'Follow-ups',
    columns: [text('Task', 44), text('Client', 26), text('Due', 12), text('Done', 8), text('By', 20)],
    rows: async (ids, user) => {
      const scope = await accountScope(user);
      const accounts = await CrmAccount.find({ active: { $ne: false }, ...scope }).select('name').lean() as any[];
      const names = new Map(accounts.map((a) => [String(a._id), a.name]));
      const [contact, account] = await Promise.all([
        CustomerActivity.find(within(ids, { type: 'task' })).populate('customerId', 'name company').limit(20000).lean() as Promise<any[]>,
        CrmActivity.find(within(ids, { type: 'task', accountId: { $in: accounts.map((a) => a._id) } })).limit(20000).lean() as Promise<any[]>,
      ]);
      return [
        ...contact.map((t) => [t.body, t.customerId?.company || t.customerId?.name, day(t.dueDate), t.done ? 'Yes' : 'No', t.authorName]),
        ...account.map((t) => [t.body, names.get(String(t.accountId)), day(t.dueDate), t.done ? 'Yes' : 'No', t.byName]),
      ].sort((a, b) => String(a[2]).localeCompare(String(b[2])));
    },
  },
  categories: {
    permission: 'categories.manage',
    title: 'Categories',
    columns: [text('Name', 28), text('Arabic name', 28), text('Slug', 24)],
    rows: async (ids) => {
      const docs = await Category.find(within(ids)).sort({ name: 1 }).lean() as any[];
      return docs.map((c) => [c.name, c.nameAr, c.slug]);
    },
  },
  knowledge: {
    permission: 'knowledge.manage',
    title: 'Knowledge base',
    columns: [text('Title', 40), text('Category', 20), text('Updated', 12)],
    rows: async (ids) => {
      const docs = await KnowledgeArticle.find(within(ids)).sort({ updatedAt: -1 }).lean() as any[];
      return docs.map((k) => [k.title?.en || k.title || k.question?.en || k.slug, k.category, day(k.updatedAt)]);
    },
  },
};

export const POST = audited(async function POST(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await connectDB();

    const body = await req.json();
    const what = String(body.what || '');

    /* One client's whole story is the one sheet that is not a list of records. */
    if (what === 'client') {
      if (!can(user.role, 'crm.view') && !can(user.role, 'customers.view')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      const refs = { customerId: body.customerId as string | undefined, accountId: body.accountId as string | undefined };
      if (!can(user.role, 'customers.view')) {
        const { account } = await loadClient(refs);
        if (!(await mayOpenAccount(user, account as { ownerId?: unknown } | null))) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
      }
      const profile = await clientProfile(refs, { money: can(user.role, 'accounting.view') });
      if (!profile) return NextResponse.json({ error: 'Client not found' }, { status: 404 });
      const wanted = Array.isArray(body.ids) ? new Set(body.ids) : null;
      const rows = profile.events.filter((e) => !wanted || wanted.has(e.id)).map((e) => ({
        date: day(e.at), kind: e.kind, what: e.text, by: e.by, due: day(e.dueDate), amount: e.amount ?? '',
      }));
      const name = profile.account?.name || profile.customer?.company || profile.customer?.name || 'client';
      recordAudit({ action: 'export', entity: 'ClientProfile', entityLabel: name, details: { rows: rows.length } });
      const book = buildXlsx({
        sheetName: 'Client history',
        title: `KCC client history: ${name}`,
        columns: [
          { header: 'Date', key: 'date', width: 12 }, { header: 'Kind', key: 'kind', width: 12 }, { header: 'What happened', key: 'what', width: 60 },
          { header: 'By', key: 'by', width: 20 }, { header: 'Due', key: 'due', width: 12 }, { header: 'Amount', key: 'amount', width: 14 },
        ],
        rows,
      });
      return file(book, 'client-history');
    }

    const sheet = SHEETS[what];
    if (!sheet) return NextResponse.json({ error: 'Unknown export' }, { status: 400 });
    if (!can(user.role, sheet.permission)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const ids = Array.isArray(body.ids)
      ? body.ids.filter((i: unknown) => mongoose.Types.ObjectId.isValid(String(i))).map((i: string) => new mongoose.Types.ObjectId(i))
      : null;
    const data = await sheet.rows(ids, user);
    const columns = sheet.columns.map((c, i) => ({ ...c, key: `c${i}` })) as XlsxColumn[];
    const rows = data.map((r) => Object.fromEntries(r.map((v, i) => [`c${i}`, v ?? ''])));

    recordAudit({ action: 'export', entity: sheet.title, entityLabel: ids ? `${rows.length} filtered rows` : `All ${rows.length} rows`, details: { what, filtered: !!ids, rows: rows.length } });
    return file(buildXlsx({ sheetName: sheet.title.slice(0, 28), columns, rows, title: `KCC ${sheet.title}` }), what);
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
});

function file(book: Buffer, name: string) {
  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(new Uint8Array(book), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="kcc-${name}-${stamp}.xlsx"`,
      'Content-Length': String(book.length),
      'Cache-Control': 'no-store',
    },
  });
}
