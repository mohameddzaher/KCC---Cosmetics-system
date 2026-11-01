'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { PageHeader, Spinner } from '@/components/admin/ui';
import AccountsTable from '@/components/admin/crm/AccountsTable';
import { useLanguage } from '@/contexts/LanguageContext';

/**
 * The accounts nobody has been to yet — the work for the period ahead.
 *
 * This list is meant to shrink. Logging a visit, a call or anything else
 * against an account here moves it to the ones being worked, which is why there
 * is no "move" control: the move is a consequence of the work.
 */
function UpcomingClientsInner() {
  const { t, tx } = useLanguage();
  // A dashboard tile links here with ?list=target, so the page opens exactly
  // the rows the tile counted.
  const list = useSearchParams().get('list');
  return (
    <div>
      <PageHeader
        title={t('admin.crmUpcoming')}
        subtitle={t('admin.crmUpcomingDesc')}
        backHref="/admin/crm"
        backLabel={t('admin.crmTitle')}
      />
      <AccountsTable
        stage="upcoming"
        list={list === 'target' ? 'target' : list === 'pool' ? 'pool' : undefined}
        emptyTitle={tx('Every target has been worked')}
        emptyHint={tx('Nothing is waiting. Add an account, or look at the ones in progress.')}
      />
    </div>
  );
}

export default function UpcomingClientsPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <UpcomingClientsInner />
    </Suspense>
  );
}
