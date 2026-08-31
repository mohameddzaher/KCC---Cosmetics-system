'use client';

import OperationsQueue from '@/components/admin/OperationsQueue';
import RequirePermission from '@/components/admin/RequirePermission';
import { useLanguage } from '@/contexts/LanguageContext';

/** Dispatch desk. Assign a delivery rep, ship, and confirm delivery. */
export default function LogisticsPage() {
  const { t } = useLanguage();
  return (
    <RequirePermission permission="logistics.view">
      <OperationsQueue
        title={t('admin.logisticsTitle')}
        subtitle={t('admin.logisticsSubtitle')}
        emptyLabel={t('admin.logisticsEmpty')}
        nextStop={{ label: t('admin.ordersTitle'), href: '/admin/orders' }}
        columns={[
          { key: 'ready', label: t('admin.readyToShip'), statuses: ['Production Complete', 'Ready to Ship'] },
          { key: 'transit', label: t('admin.inTransit'), statuses: ['Shipped', 'Out for Delivery'] },
          { key: 'delivered', label: t('admin.deliveredToday'), statuses: ['Delivered', 'Closed'] },
        ]}
      />
    </RequirePermission>
  );
}
