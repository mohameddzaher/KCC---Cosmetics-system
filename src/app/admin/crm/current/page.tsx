'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { PageHeader, Spinner } from '@/components/admin/ui';
import AccountsTable from '@/components/admin/crm/AccountsTable';
import { useLanguage } from '@/contexts/LanguageContext';

/**
 * The accounts being worked — everything with at least one action recorded.
 *
 * Nothing is put here by hand. An account arrives the moment a visit or a call
 * is logged against it, and the history on its page says when and by whom.
 */
function CurrentClientsInner() {
  const { t, tx } = useLanguage();
  // A dashboard tile links here with ?list=target, so the page opens exactly
  // the rows the tile counted.
  const list = useSearchParams().get('list');
  return (
    <div>
      <PageHeader
        title={t('admin.crmCurrent')}
        subtitle={t('admin.crmCurrentDesc')}
        backHref="/admin/crm"
        backLabel={t('admin.crmTitle')}
      />
      <AccountsTable
        stage="current"
        list={list === 'target' ? 'target' : list === 'pool' ? 'pool' : undefined}
        emptyTitle={tx('No account is being worked yet')}
        emptyHint={tx('Log a visit against anything in the upcoming list and it will appear here.')}
      />
    </div>
  );
}

export default function CurrentClientsPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <CurrentClientsInner />
    </Suspense>
  );
}
