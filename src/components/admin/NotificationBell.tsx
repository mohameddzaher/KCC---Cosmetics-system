'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { Bell, Check, ChevronRight, Loader2, Inbox } from 'lucide-react';
import { useLivePoll } from '@/lib/useLivePoll';
import { useLanguage } from '@/contexts/LanguageContext';

interface Notif {
  _id: string;
  type: string;
  title?: { en?: string; ar?: string };
  message?: { en?: string; ar?: string };
  isRead: boolean;
  createdAt: string;
  /** Whatever the notification is about — an order id, a stock item … */
  data?: { orderId?: string; itemId?: string; sku?: string } | null;
}

/**
 * Where a notification takes you.
 *
 * Every notification is raised about something; marking it read without going
 * there makes the bell a dead end. Anything we cannot place stays a plain,
 * non-clickable row rather than sending someone to a broken page.
 */
function hrefFor(n: Notif): string | null {
  const orderId = n.data?.orderId;
  switch (n.type) {
    case 'new_order':
    case 'order_status':
    case 'order_feedback':
    case 'payment':
      return orderId ? `/admin/orders/${orderId}` : '/admin/orders';
    case 'low_stock':
      // The inventory page has no deep link to a single SKU yet, so this lands
      // on the list rather than pretending to filter it.
      return '/admin/inventory';
    default:
      return null;
  }
}

const typeColor: Record<string, string> = {
  new_order: 'text-blue-400',
  order_status: 'text-purple-400',
  order_feedback: 'text-amber-500',
  low_stock: 'text-red-400',
  payment: 'text-green-400',
  system: 'text-fg-muted',
};

export default function NotificationBell({ locale = 'en' }: { locale?: string }) {
  const { tx } = useLanguage();
  const [items, setItems] = useState<Notif[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch('/api/notifications', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setItems(Array.isArray(data) ? data : []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useLivePoll(useCallback(() => load(true), [load]), 30000);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const unread = items.filter((n) => !n.isRead).length;

  const markRead = async (id: string) => {
    setItems((prev) => prev.map((n) => (n._id === id ? { ...n, isRead: true } : n)));
    await fetch('/api/notifications', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, isRead: true }),
    }).catch(() => {});
  };

  const markAll = async () => {
    const unreadIds = items.filter((n) => !n.isRead).map((n) => n._id);
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    await Promise.allSettled(
      unreadIds.map((id) =>
        fetch('/api/notifications', {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, isRead: true }),
        })
      )
    );
  };

  const fmt = (d: string) => {
    const diff = Date.now() - new Date(d).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const text = (n: Notif) => {
    const lang = locale === 'ar' ? 'ar' : 'en';
    return {
      title: n.title?.[lang] || n.title?.en || 'Notification',
      message: n.message?.[lang] || n.message?.en || '',
    };
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={tx('Notifications')}
        title={tx('Notifications')}
        className="relative p-2 text-fg-muted hover:text-fg"
      >
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -end-0.5 min-w-[16px] h-4 px-1 flex items-center justify-center text-[10px] font-bold text-white bg-red-500 rounded-full">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute end-0 mt-2 w-80 max-w-[90vw] bg-surface border border-line rounded-xl shadow-xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-line">
            <h3 className="text-sm font-semibold text-fg">{tx('Notifications')}</h3>
            {unread > 0 && (
              <button type="button" onClick={markAll} className="text-xs text-kcc-green hover:text-kcc-green-light flex items-center gap-1">
                <Check size={12} />{tx('Mark all read')}</button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto divide-y divide-line/60">
            {loading ? (
              <div className="flex items-center justify-center h-24"><Loader2 className="animate-spin text-kcc-green" size={20} /></div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-28 text-fg-subtle gap-2">
                <Inbox size={22} /><p className="text-sm">{tx('No notifications')}</p>
              </div>
            ) : (
              items.slice(0, 30).map((n) => {
                const t = text(n);
                const href = hrefFor(n);

                const body = (
                  <div className="flex items-start gap-2">
                    {!n.isRead && <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-kcc-green shrink-0" />}
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm font-medium ${typeColor[n.type] || 'text-fg'}`}>{t.title}</p>
                      {t.message && <p className="text-xs text-fg-muted mt-0.5 line-clamp-2">{t.message}</p>}
                      <p className="text-[10px] text-fg-subtle mt-1">{fmt(n.createdAt)}</p>
                    </div>
                    {href && <ChevronRight size={14} className="rtl-flip mt-0.5 shrink-0 text-fg-subtle" />}
                  </div>
                );

                const cls = `block w-full text-start px-4 py-3 transition-colors ${
                  n.isRead ? 'opacity-60' : ''
                } ${href ? 'hover:bg-surface-2/50' : 'cursor-default'}`;

                // Marking it read is a side effect of opening it, not the point
                // of clicking. Navigate first so the page is already loading.
                return href ? (
                  <Link
                    key={n._id}
                    href={href}
                    className={cls}
                    onClick={() => {
                      setOpen(false);
                      if (!n.isRead) markRead(n._id);
                    }}
                  >
                    {body}
                  </Link>
                ) : (
                  <button
                    key={n._id}
                    type="button"
                    onClick={() => !n.isRead && markRead(n._id)}
                    className={cls}
                  >
                    {body}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
