'use client';

import OperationsQueue from '@/components/admin/OperationsQueue';
import RequirePermission from '@/components/admin/RequirePermission';
import { useLanguage } from '@/contexts/LanguageContext';

/** Factory-facing board. Only orders released to production are visible here. */
export default function ProductionPage() {
  const { t } = useLanguage();
  return (
    <RequirePermission permission="production.view">
      <OperationsQueue
        title={t('admin.productionTitle')}
        subtitle={t('admin.productionSubtitle')}
        emptyLabel={t('admin.productionEmpty')}
        nextStop={{ label: t('admin.logisticsTitle'), href: '/admin/logistics' }}
        columns={[
          { key: 'queued', label: t('admin.productionQueue'), statuses: ['Queued for Production'] },
          { key: 'making', label: t('admin.inProduction'), statuses: ['In Production'] },
          { key: 'qc', label: t('admin.qualityCheck'), statuses: ['Quality Check'] },
          { key: 'done', label: t('admin.completed'), statuses: ['Production Complete'] },
        ]}
      />
    </RequirePermission>
  );
}
