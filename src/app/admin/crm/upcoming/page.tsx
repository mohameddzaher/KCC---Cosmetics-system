'use client';

import { PageHeader } from '@/components/admin/ui';
import AccountsTable from '@/components/admin/crm/AccountsTable';
import { useLanguage } from '@/contexts/LanguageContext';

/**
 * The accounts nobody has been to yet — the work for the period ahead.
 *
 * This list is meant to shrink. Logging a visit, a call or anything else
 * against an account here moves it to the ones being worked, which is why there
 * is no "move" control: the move is a consequence of the work.
 */
export default function UpcomingClientsPage() {
  const { t, tx } = useLanguage();
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
        emptyTitle={tx('Every target has been worked')}
        emptyHint={tx('Nothing is waiting. Add an account, or look at the ones in progress.')}
      />
    </div>
  );
}
