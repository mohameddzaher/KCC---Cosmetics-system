import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Expense from '@/models/Expense';
import Invoice from '@/models/Invoice';
import Payment from '@/models/Payment';
import { getSession } from '@/lib/auth';
import { can } from '@/lib/roles';
import { audited } from '@/lib/audit';
import { buildXlsx, type XlsxColumn } from '@/lib/xlsx';
import { computeReceivables, computeSummary } from '@/lib/accountingReports';
import { balanceOf, expenseCategoryLabel, INVOICE_STATUS_META, displayStatus, PAYMENT_METHODS, PAYMENT_STATUS_META } from '@/lib/invoiceStatus';

export const dynamic = 'force-dynamic';

const day = (d?: Date | string | null) => (d ? new Date(d).toISOString().slice(0, 10) : '');

/** One workbook per screen, re-run on the server from the same computation the screen used. */
export const GET = audited(async function GET(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user || !can(user.role, 'accounting.view')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    await connectDB();

    const p = req.nextUrl.searchParams;
    const what = p.get('what') || 'invoices';
    const now = new Date();
    const from = p.get('from') ? new Date(`${p.get('from')}T00:00:00`) : new Date(now.getFullYear(), 0, 1);
    const to = p.get('to') ? new Date(`${p.get('to')}T23:59:59.999`) : now;
    const range = { $gte: from, $lte: to };

    let columns: XlsxColumn[] = [];
    let rows: Array<Record<string, unknown>> = [];
    let totalsFor: string[] = [];
    let title = '';

    if (what === 'invoices') {
      const docs = await Invoice.find({ createdAt: range }).populate('userId', 'name company').populate('orderId', 'orderNumber').sort({ createdAt: -1 }).lean() as unknown as Array<Record<string, any>>;
      title = 'Invoices';
      columns = [
        { header: 'Invoice', key: 'number', width: 18 }, { header: 'Order', key: 'order', width: 22 },
        { header: 'Customer', key: 'customer', width: 26 }, { header: 'Issued', key: 'issued', width: 12 },
        { header: 'Due', key: 'due', width: 12 }, { header: 'Status', key: 'status', width: 12 },
        { header: 'Before VAT', key: 'net', type: 'money', width: 14 }, { header: 'VAT', key: 'tax', type: 'money', width: 12 },
        { header: 'Total', key: 'total', type: 'money', width: 14 }, { header: 'Paid', key: 'paid', type: 'money', width: 14 },
        { header: 'Balance', key: 'balance', type: 'money', width: 14 },
      ];
      totalsFor = ['net', 'tax', 'total', 'paid', 'balance'];
      rows = docs.map((d) => ({
        number: d.invoiceNumber, order: d.orderId?.orderNumber, customer: d.userId?.company || d.userId?.name,
        issued: day(d.issuedAt), due: day(d.dueDate), status: INVOICE_STATUS_META[displayStatus(d as { status: string })].en,
        net: (d.subtotal || 0) - (d.discount || 0), tax: d.tax, total: d.total, paid: d.amountPaid || 0, balance: balanceOf(d),
      }));
    } else if (what === 'payments') {
      const docs = await Payment.find({ createdAt: range }).populate('userId', 'name company').populate('invoiceId', 'invoiceNumber').sort({ createdAt: -1 }).lean() as unknown as Array<Record<string, any>>;
      title = 'Payments';
      columns = [
        { header: 'Date', key: 'date', width: 12 }, { header: 'Invoice', key: 'invoice', width: 18 },
        { header: 'Customer', key: 'customer', width: 26 }, { header: 'Method', key: 'method', width: 14 },
        { header: 'Reference', key: 'reference', width: 20 }, { header: 'Status', key: 'status', width: 12 },
        { header: 'Amount', key: 'amount', type: 'money', width: 14 },
      ];
      totalsFor = ['amount'];
      rows = docs.map((d) => ({
        date: day(d.paidAt || d.createdAt), invoice: d.invoiceId?.invoiceNumber, customer: d.userId?.company || d.userId?.name,
        method: PAYMENT_METHODS[d.method]?.en || d.method, reference: d.reference, status: PAYMENT_STATUS_META[d.status]?.en || d.status, amount: d.amount,
      }));
    } else if (what === 'expenses') {
      const docs = await Expense.find({ date: range }).populate('orderId', 'orderNumber').sort({ date: -1 }).lean() as unknown as Array<Record<string, any>>;
      title = 'Expenses';
      columns = [
        { header: 'Date', key: 'date', width: 12 }, { header: 'Category', key: 'category', width: 20 },
        { header: 'Description', key: 'description', width: 34 }, { header: 'Vendor', key: 'vendor', width: 22 },
        { header: 'Reference', key: 'reference', width: 18 }, { header: 'Order', key: 'order', width: 22 },
        { header: 'VAT', key: 'vat', type: 'money', width: 12 }, { header: 'Amount', key: 'amount', type: 'money', width: 14 },
      ];
      totalsFor = ['vat', 'amount'];
      rows = docs.map((d) => ({
        date: day(d.date), category: expenseCategoryLabel(d.category, 'en'), description: d.description?.en || d.description?.ar,
        vendor: d.vendor, reference: d.reference, order: d.orderId?.orderNumber, vat: d.vatAmount || 0, amount: d.amount,
      }));
    } else if (what === 'receivables') {
      const r = await computeReceivables();
      title = 'Receivables';
      columns = [
        { header: 'Customer', key: 'name', width: 28 }, { header: 'Invoices', key: 'invoices', type: 'number', width: 10 },
        { header: 'Not yet due', key: 'current', type: 'money', width: 14 }, { header: '1-30 days', key: 'd1_30', type: 'money', width: 14 },
        { header: '31-60 days', key: 'd31_60', type: 'money', width: 14 }, { header: '61-90 days', key: 'd61_90', type: 'money', width: 14 },
        { header: 'Over 90 days', key: 'd90plus', type: 'money', width: 14 }, { header: 'Balance', key: 'balance', type: 'money', width: 14 },
      ];
      totalsFor = ['current', 'd1_30', 'd31_60', 'd61_90', 'd90plus', 'balance'];
      rows = r.customers.map((c) => ({ name: c.company || c.name, invoices: c.invoices, balance: c.balance, ...c.buckets }));
    } else if (what === 'report') {
      const s = await computeSummary(from, to);
      title = `Profit & loss and VAT, ${day(from)} to ${day(to)}`;
      columns = [{ header: 'Line', key: 'line', width: 38 }, { header: 'Amount', key: 'amount', type: 'money', width: 16 }];
      rows = [
        { line: 'Sales before VAT', amount: s.sales.net },
        { line: 'Expenses before VAT', amount: s.expenses.net },
        { line: 'Profit earned', amount: s.profit.earned },
        { line: 'Money received', amount: s.collected.total },
        { line: 'Money spent', amount: s.expenses.gross },
        { line: 'Cash position for the period', amount: s.profit.cash },
        { line: 'VAT charged on sales', amount: s.vat.output },
        { line: 'VAT paid on expenses', amount: s.vat.input },
        { line: 'VAT due', amount: s.vat.due },
        ...s.byCategory.map((c) => ({ line: `Expense: ${expenseCategoryLabel(c.key, 'en')}`, amount: c.total })),
      ];
    } else {
      return NextResponse.json({ error: 'Unknown export' }, { status: 400 });
    }

    const stamp = now.toISOString().slice(0, 10);
    const book = buildXlsx({ sheetName: title.slice(0, 28), columns, rows, totalsFor, title: `KCC ${title}, exported ${stamp}` });
    return new NextResponse(new Uint8Array(book), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="kcc-${what}-${stamp}.xlsx"`,
        'Content-Length': String(book.length),
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}, { action: 'export', entity: 'AccountingReport' });
