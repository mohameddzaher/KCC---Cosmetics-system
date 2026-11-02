'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

/**
 * One box that finds a customer, an order, an invoice, an account or a product,
 * from any page. Ctrl/⌘ K opens it. What comes back is already limited by the
 * server to what this person may see.
 */

interface Hit { type: string; id: string; title: string; subtitle?: string; href: string }

export default function GlobalSearch() {
  const { tx } = useLanguage();
  const router = useRouter();
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<Hit[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const box = useRef<HTMLDivElement>(null);

  const TYPES: Record<string, string> = {
    order: tx('Order'), customer: tx('Customer'), account: tx('CRM account'),
    invoice: tx('Invoice'), product: tx('Product'), stock: tx('Stock item'),
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        input.current?.focus();
      }
    };
    const onClick = (e: MouseEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
    };
  }, []);

  useEffect(() => {
    const term = q.trim();
    let live = true;
    const t = setTimeout(async () => {
      if (term.length < 2) { if (live) setHits([]); return; }
      const r = await fetch(`/api/search?q=${encodeURIComponent(term)}`, { cache: 'no-store' }).catch(() => null);
      const j = r?.ok ? await r.json() : { hits: [] };
      if (live) { setHits(j.hits); setActive(0); }
    }, 200);
    return () => { live = false; clearTimeout(t); };
  }, [q]);

  function go(hit: Hit) {
    setOpen(false);
    setQ('');
    router.push(hit.href);
  }

  return (
    <div ref={box} className="relative hidden w-full max-w-sm md:block">
      <Search size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-fg-subtle" />
      <input
        ref={input}
        type="search"
        value={q}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, hits.length - 1)); }
          if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
          if (e.key === 'Enter' && hits[active]) go(hits[active]);
          if (e.key === 'Escape') { setOpen(false); input.current?.blur(); }
        }}
        placeholder={tx('Search customers, orders, invoices…')}
        aria-label={tx('Search')}
        className="h-9 w-full rounded-lg border border-line bg-surface-2 pe-3 ps-9 text-sm text-fg placeholder:text-fg-subtle focus:border-brand focus:outline-none"
      />
      {open && q.trim().length >= 2 && (
        <div className="absolute inset-x-0 top-11 z-50 max-h-96 overflow-y-auto rounded-xl border border-line bg-surface p-1 shadow-lg">
          {hits.length === 0 && <p className="p-3 text-sm text-fg-muted">{tx('Nothing found')}</p>}
          {hits.map((h, i) => (
            <button
              key={`${h.type}${h.id}`}
              type="button"
              onMouseEnter={() => setActive(i)}
              onClick={() => go(h)}
              className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-start ${i === active ? 'bg-surface-2' : ''}`}
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-fg">{h.title}</span>
                {h.subtitle && <span className="block truncate text-xs text-fg-muted">{h.subtitle}</span>}
              </span>
              <span className="shrink-0 text-[11px] text-fg-subtle">{TYPES[h.type]}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
