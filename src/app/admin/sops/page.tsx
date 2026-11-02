'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Bot, CheckCircle2, Hand, Printer, UserRound } from 'lucide-react';
import { Badge, Button, Card, PageHeader, SectionTitle } from '@/components/admin/ui';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { roleLabel, type Role } from '@/lib/roles';
import { FLOW, ROLE_SOPS } from '@/lib/sops';
import { statusLabel, TRANSITIONS, type OrderStatus } from '@/lib/orderWorkflow';

/** The whole cycle, and each desk's part in it, where the team can always find it. */
export default function SopsPage() {
  const { tx, locale } = useLanguage();
  const { user } = useAuth();
  const mineFirst = [...ROLE_SOPS].sort((a, b) => Number(b.role === user?.role) - Number(a.role === user?.role));
  const [tab, setTab] = useState<'flow' | 'roles' | 'moves'>('flow');
  const tabs = [
    { key: 'flow' as const, label: tx('The full cycle') },
    { key: 'roles' as const, label: tx('By role') },
    { key: 'moves' as const, label: tx('Who moves an order') },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title={tx('Workflow & SOPs')}
        subtitle={tx('How a client travels from a name on a list to a repeat order, and who does what.')}
        actions={<Button variant="outline" icon={Printer} onClick={() => window.print()}>{tx('Print / PDF')}</Button>}
      />

      <div className="flex flex-wrap gap-1.5 print:hidden">
        {tabs.map((x) => (
          <button key={x.key} type="button" onClick={() => setTab(x.key)} className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${tab === x.key ? 'border-brand bg-brand-soft text-brand-soft-fg' : 'border-line text-fg-muted hover:text-fg'}`}>
            {x.label}
          </button>
        ))}
      </div>

      {tab === 'flow' && FLOW.map((s) => (
        <Card key={s.key} className="break-inside-avoid">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-bold text-fg">{s.title[locale]}</h2>
            <Link href={s.page.href} className="text-xs font-medium text-brand hover:underline print:hidden">{s.page.label[locale]}</Link>
          </div>
          <div className="mb-3 flex flex-wrap items-center gap-1.5">
            <UserRound size={13} className="text-fg-muted" />
            {s.who.map((r) => <Badge key={r}>{roleLabel(r, locale)}</Badge>)}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-fg-muted"><Hand size={13} />{tx('What you do')}</p>
              <ol className="list-inside list-decimal space-y-1 text-sm text-fg">{s.doThis.map((d) => <li key={d.en}>{d[locale]}</li>)}</ol>
            </div>
            <div>
              <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-fg-muted"><Bot size={13} />{tx('What the system does by itself')}</p>
              <ul className="list-inside list-disc space-y-1 text-sm text-fg-muted">{s.system.map((d) => <li key={d.en}>{d[locale]}</li>)}</ul>
            </div>
          </div>
          <p className="mt-3 flex items-center gap-1.5 border-t border-line pt-2 text-xs text-fg-muted">
            <CheckCircle2 size={13} className="text-ok-soft-fg" />{tx('Done when')}: <span className="text-fg">{s.doneWhen[locale]}</span>
          </p>
        </Card>
      ))}

      {tab === 'roles' && (
        <div className="grid gap-4 lg:grid-cols-2">
          {mineFirst.map((r) => (
            <Card key={r.role} className="break-inside-avoid">
              <SectionTitle title={`${roleLabel(r.role, locale)}${r.role === user?.role ? ` (${tx('your role')})` : ''}`} />
              <ol className="list-inside list-decimal space-y-1 text-sm text-fg">{r.daily.map((d) => <li key={d.en}>{d[locale]}</li>)}</ol>
              <div className="mt-3 flex flex-wrap gap-2 print:hidden">
                {r.pages.map((p) => <Link key={p.href} href={p.href} className="text-xs font-medium text-brand hover:underline">{p.label[locale]}</Link>)}
              </div>
            </Card>
          ))}
        </div>
      )}

      {tab === 'moves' && (
        <Card padded={false} className="overflow-x-auto">
          <table className="w-full min-w-[40rem] text-sm">
            <thead className="bg-surface-2 text-xs text-fg-muted">
              <tr><th className="px-4 py-2 text-start">{tx('From')}</th><th className="px-4 py-2 text-start">{tx('Action')}</th><th className="px-4 py-2 text-start">{tx('To')}</th><th className="px-4 py-2 text-start">{tx('Who')}</th></tr>
            </thead>
            <tbody>
              {(Object.keys(TRANSITIONS) as OrderStatus[]).flatMap((from) =>
                TRANSITIONS[from].map((m) => (
                  <tr key={`${from}${m.to}`} className="border-t border-line">
                    <td className="px-4 py-2 text-fg-muted">{statusLabel(from, locale)}</td>
                    <td className="px-4 py-2 text-fg">{locale === 'ar' ? m.actionAr : m.actionEn}{m.requiresNote && <span className="text-[11px] text-fg-subtle"> · {tx('needs a note')}</span>}</td>
                    <td className="px-4 py-2 text-fg-muted">{statusLabel(m.to, locale)}</td>
                    <td className="px-4 py-2 text-xs text-fg-muted">{m.roles.map((r: Role) => roleLabel(r, locale)).join('، ')}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
