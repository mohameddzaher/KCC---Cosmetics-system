'use client';

import { useState } from 'react';
import { Download } from 'lucide-react';
import {
  Button, Card, DataTable, ErrorNote, PageHeader, PageSkeleton, SectionTitle, Td, Th,
} from '@/components/admin/ui';
import RequirePermission from '@/components/admin/RequirePermission';
import { MonthlyChart, PeriodPicker, thisMonth, useMoney } from '@/components/admin/accounting/shared';
import { useLanguage } from '@/contexts/LanguageContext';
import { useApi } from '@/lib/useApi';
import { downloadFile } from '@/lib/download';
import { expenseCategoryLabel } from '@/lib/invoiceStatus';

/* eslint-disable @typescript-eslint/no-explicit-any */

function Line({ label, value, strong, note }: { label: string; value: string; strong?: boolean; note?: string }) {
  return (
    <div className={`flex items-baseline justify-between gap-6 py-1.5 text-sm ${strong ? 'border-t border-line font-bold text-fg' : 'text-fg-muted'}`}>
      <span>{label}{note && <span className="block text-[11px] font-normal text-fg-subtle">{note}</span>}</span>
      <span className="shrink-0">{value}</span>
    </div>
  );
}

function Reports() {
  const { tx, locale } = useLanguage();
  const { money, month } = useMoney();
  const [period, setPeriod] = useState(thisMonth);
  const { data: d, ready, error } = useApi<any>(`/api/accounting/summary?from=${period.from}&to=${period.to}`);

  if (!ready) return <PageSkeleton rows={10} />;
  if (error && !d) return <ErrorNote>{error}</ErrorNote>;

  return (
    <div className="space-y-5">
      <PageHeader
        title={tx('Financial reports')}
        subtitle={tx('Profit, cash and VAT for any period.')}
        backHref="/admin/accounting"
        backLabel={tx('Accounting')}
        actions={<Button variant="outline" icon={Download} onClick={() => downloadFile(`/api/accounting/export?what=report&from=${period.from}&to=${period.to}`)}>{tx('Export to Excel')}</Button>}
      >
        <PeriodPicker from={period.from} to={period.to} onChange={(from, to) => setPeriod({ from, to })} />
      </PageHeader>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <SectionTitle title={tx('Profit and loss')} />
          <Line label={tx('Sales before VAT')} value={money(d.sales.net)} />
          <Line label={tx('Expenses before VAT')} value={`− ${money(d.expenses.net)}`} />
          <Line strong label={tx('Profit earned')} value={money(d.profit.earned)} />
        </Card>
        <Card>
          <SectionTitle title={tx('Cash')} />
          <Line label={tx('Money received')} value={money(d.collected.total)} />
          <Line label={tx('Money spent')} value={`− ${money(d.expenses.gross)}`} />
          <Line strong label={tx('Cash position')} value={money(d.profit.cash)} note={tx('For this period, VAT included')} />
        </Card>
        <Card>
          <SectionTitle title={tx('VAT')} />
          <Line label={tx('VAT charged on sales')} value={money(d.vat.output)} />
          <Line label={tx('VAT paid on expenses')} value={`− ${money(d.vat.input)}`} />
          <Line strong label={tx('VAT due')} value={money(d.vat.due)} />
        </Card>
      </div>

      <Card>
        <SectionTitle title={tx('Sales and expenses by month')} />
        <MonthlyChart months={d.months} />
      </Card>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div>
          <SectionTitle title={tx('Month by month')} />
          <DataTable>
            <thead><tr><Th>{tx('Month')}</Th><Th align="end">{tx('Sales')}</Th><Th align="end">{tx('Received')}</Th><Th align="end">{tx('Expenses')}</Th><Th align="end">{tx('Profit')}</Th></tr></thead>
            <tbody>
              {[...d.months].reverse().map((m: any) => (
                <tr key={m.key} className="border-t border-line">
                  <Td>{month(m.key)} {m.key.slice(0, 4)}</Td>
                  <Td align="end">{money(m.sales)}</Td><Td align="end">{money(m.collected)}</Td>
                  <Td align="end">{money(m.expenses)}</Td><Td align="end" className="font-semibold">{money(m.profit)}</Td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        </div>
        <Card>
          <SectionTitle title={tx('Expenses by category')} />
          {d.byCategory.length === 0 && <p className="text-sm text-fg-muted">{tx('No expenses found')}</p>}
          {d.byCategory.map((c: any) => <Line key={c.key} label={expenseCategoryLabel(c.key, locale)} value={money(c.total)} />)}
        </Card>
      </div>
    </div>
  );
}

export default function AccountingReportsPage() {
  return <RequirePermission permission="accounting.view"><Reports /></RequirePermission>;
}
