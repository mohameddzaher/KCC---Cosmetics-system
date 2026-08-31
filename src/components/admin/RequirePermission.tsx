'use client';

import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';
import { usePermission } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { EmptyState } from '@/components/admin/ui';
import type { Permission } from '@/lib/roles';

/**
 * Client-side page guard.
 *
 * Purely for UX — it stops a role seeing a page it has no business on and
 * explains why. Every API the page calls enforces the same permission
 * server-side, so this is never the only line of defence.
 */
export default function RequirePermission({
  permission,
  children,
}: {
  permission: Permission;
  children: React.ReactNode;
}) {
  const { can } = usePermission();
  const { t } = useLanguage();

  if (!can(permission)) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title={t('admin.noAccess')}
        hint={t('admin.noAccessHint')}
        action={
          <Link href="/admin" className="btn btn-outline btn-sm">
            {t('admin.backToDashboard')}
          </Link>
        }
      />
    );
  }

  return <>{children}</>;
}
