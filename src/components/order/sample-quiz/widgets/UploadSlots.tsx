'use client';

import { useRef, useState } from 'react';
import { FileText, ImageIcon, Loader2, Paperclip, Upload, X } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { UploadAnswer } from '@/lib/sample-quiz/types';

interface Slot {
  value: string;
  label: string;
  description?: string;
  required?: boolean;
}

/**
 * One drop zone per named slot — "Product photo", "Ingredient list",
 * "Existing formula". Files go to /api/upload/quiz, which stores them outside
 * the public folder and hands back a download-only URL.
 */
export default function UploadSlots({
  slots,
  value,
  onChange,
  accept,
}: {
  slots: Slot[];
  value: UploadAnswer;
  onChange: (next: UploadAnswer) => void;
  accept?: string;
}) {
  const { t } = useLanguage();

  return (
    <div className="grid w-full gap-3 lg:grid-cols-2">
      {slots.map((slot) => (
        <SlotBox
          key={slot.value}
          slot={slot}
          accept={accept}
          files={value?.[slot.value] ?? []}
          onFiles={(files) => onChange({ ...(value || {}), [slot.value]: files })}
          t={t}
        />
      ))}
    </div>
  );
}

function SlotBox({
  slot,
  files,
  onFiles,
  accept,
  t,
}: {
  slot: Slot;
  files: Array<{ name: string; url: string }>;
  onFiles: (f: Array<{ name: string; url: string }>) => void;
  accept?: string;
  t: (k: string, v?: Record<string, string | number>) => string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  async function upload(list: FileList | null) {
    if (!list || list.length === 0) return;
    setBusy(true);
    setError(null);
    const uploaded: Array<{ name: string; url: string }> = [];
    try {
      for (const file of Array.from(list)) {
        const fd = new FormData();
        fd.append('file', file);
        const res = await fetch('/api/upload/quiz', { method: 'POST', body: fd });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || t('quiz.uploadFailed'));
        uploaded.push({ name: data.name || file.name, url: data.url });
      }
      onFiles([...files, ...uploaded]);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('quiz.uploadFailed'));
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div className="rounded-xl border-2 border-cream-300 bg-surface p-4">
      <div className="mb-2 flex items-start gap-2">
        <Paperclip size={15} className="mt-0.5 shrink-0 text-kcc-rose-dark" />
        <div className="min-w-0">
          <p className="text-sm font-semibold leading-snug text-ink-800">
            {slot.label}
            {slot.required && <span className="ms-1 text-blush-600">*</span>}
          </p>
          {slot.description && (
            <p className="mt-0.5 text-xs leading-snug text-cream-700">{slot.description}</p>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          upload(e.dataTransfer.files);
        }}
        disabled={busy}
        className={`flex w-full flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed px-4 py-6 transition-colors ${
          dragging ? 'border-ink-700 bg-cream-100' : 'border-cream-400 bg-cream-50 hover:border-ink-700'
        } disabled:opacity-60`}
      >
        {busy ? (
          <Loader2 size={18} className="animate-spin text-cream-700" />
        ) : (
          <Upload size={18} className="text-cream-700" />
        )}
        <span className="text-xs font-medium text-cream-800">
          {busy ? t('quiz.uploading') : t('quiz.uploadPrompt')}
        </span>
        <span className="text-[11px] text-cream-600">{t('quiz.maxFileSize')}</span>
      </button>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept={accept || 'image/png,image/jpeg,image/webp,application/pdf'}
        onChange={(e) => upload(e.target.files)}
        className="sr-only"
        aria-label={slot.label}
      />

      {error && <p className="mt-2 text-xs text-blush-700">{error}</p>}

      {files.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {files.map((f, i) => (
            <li
              key={f.url}
              className="flex items-center gap-2 rounded-lg border border-cream-300 bg-cream-50 px-2.5 py-2"
            >
              {f.url.endsWith('.pdf') ? (
                <FileText size={14} className="shrink-0 text-cream-700" />
              ) : (
                <ImageIcon size={14} className="shrink-0 text-cream-700" />
              )}
              <span className="min-w-0 flex-1 truncate text-xs text-ink-800">{f.name}</span>
              <button
                type="button"
                onClick={() => onFiles(files.filter((_, idx) => idx !== i))}
                aria-label={t('quiz.removeFile')}
                title={t('quiz.removeFile')}
                className="shrink-0 rounded p-1 text-cream-700 hover:bg-cream-200 hover:text-ink-800"
              >
                <X size={13} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
