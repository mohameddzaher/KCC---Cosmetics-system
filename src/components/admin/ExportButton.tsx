'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Download, Loader2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { downloadFile } from '@/lib/download';

/**
 * Excel on every list: what the filters are showing, or the whole thing.
 *
 * With no filter the two are the same, so it is a plain button. The server reads
 * the rows again under its own permission check; see /api/export.
 */
export default function ExportButton({
  what, shown, total, extra, resolveShown,
}: {
  what: string;
  /** Ids of the rows on screen after filtering. */
  shown?: string[];
  total?: number;
  /** For a paged list, where the filtered rows are not all on screen. */
  resolveShown?: () => Promise<string[]>;
  extra?: Record<string, unknown>;
}) {
  const { tx } = useLanguage();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const filtered = !!resolveShown || (!!shown && total !== undefined && shown.length !== total);

  useEffect(() => {
    const close = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  async function run(ids?: string[]) {
    setOpen(false);
    setBusy(true);
    setError(null);
    try {
      await downloadFile('/api/export', `kcc-${what}.xlsx`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ what, ids, ...extra }),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The export failed.');
    } finally {
      setBusy(false);
    }
  }

  const look = 'btn btn-outline print:hidden';
  const icon = busy ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />;

  return (
    <div ref={box} className="relative inline-block">
      {filtered ? (
        <button type="button" className={look} disabled={busy} onClick={() => setOpen((o) => !o)}>
          {icon}{tx('Export to Excel')}<ChevronDown size={13} />
        </button>
      ) : (
        <button type="button" className={look} disabled={busy} onClick={() => run()}>{icon}{tx('Export to Excel')}</button>
      )}
      {open && (
        <div className="absolute end-0 z-30 mt-1 w-56 rounded-xl border border-line bg-surface p-1 shadow-lg">
          <button type="button" onClick={async () => run(resolveShown ? await resolveShown() : shown)} className="w-full rounded-lg px-3 py-2 text-start text-sm text-fg hover:bg-surface-2">
            {tx('With the filters')}{shown ? ` (${shown.length})` : ''}
          </button>
          <button type="button" onClick={() => run()} className="w-full rounded-lg px-3 py-2 text-start text-sm text-fg hover:bg-surface-2">
            {tx('Everything')}{total !== undefined ? ` (${total})` : ''}
          </button>
        </div>
      )}
      {error && <p className="absolute end-0 mt-1 whitespace-nowrap text-xs text-danger">{tx(error)}</p>}
    </div>
  );
}
