'use client';

import { useRef, useState } from 'react';
import { Upload, Loader2, X, ImageIcon } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface Props {
  value: string;
  onChange: (url: string) => void;
  label?: string;
}

/**
 * Upload an image (to /api/upload) OR paste a URL. Shows a live preview.
 * The upload endpoint validates type/size and returns a hosted URL.
 */
export default function ImageUpload({ value, onChange, label = 'Image' }: Props) {
  const { tx } = useLanguage();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setError(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (res.ok && data.url) {
        onChange(data.url);
      } else {
        setError(data.error || 'Upload failed');
      }
    } catch {
      setError('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <label className="block text-xs font-medium text-fg-muted mb-1.5">{label}</label>
      <div className="flex items-start gap-3">
        {/* Preview */}
        <div className="w-20 h-20 rounded-lg border border-line bg-bg overflow-hidden flex items-center justify-center shrink-0">
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt={tx('preview')} className="w-full h-full object-cover" />
          ) : (
            <ImageIcon size={22} className="text-fg-subtle" />
          )}
        </div>

        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-fg border border-line rounded-lg hover:border-kcc-green/40 hover:text-kcc-green disabled:opacity-50"
            >
              {uploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
              {uploading ? 'Uploading…' : 'Upload image'}
            </button>
            {value && (
              <button type="button" onClick={() => onChange('')}
                className="inline-flex items-center gap-1 px-2 py-1.5 text-xs text-fg-muted hover:text-red-400">
                <X size={13} />{tx('Remove')}</button>
            )}
          </div>
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={tx('…or paste an image URL')}
            className="w-full px-3 py-1.5 text-xs bg-bg border border-line rounded-lg text-fg focus:border-kcc-green focus:outline-none"
          />
          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }}
        />
      </div>
    </div>
  );
}
