'use client';

import { useRef, useState } from 'react';
import { Upload, Loader2, X, ImageIcon } from 'lucide-react';

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
      <label className="block text-xs font-medium text-dark-400 mb-1.5">{label}</label>
      <div className="flex items-start gap-3">
        {/* Preview */}
        <div className="w-20 h-20 rounded-lg border border-dark-700 bg-dark-950 overflow-hidden flex items-center justify-center shrink-0">
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="preview" className="w-full h-full object-cover" />
          ) : (
            <ImageIcon size={22} className="text-dark-600" />
          )}
        </div>

        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-dark-200 border border-dark-700 rounded-lg hover:border-kcc-green/40 hover:text-kcc-green disabled:opacity-50"
            >
              {uploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
              {uploading ? 'Uploading…' : 'Upload image'}
            </button>
            {value && (
              <button type="button" onClick={() => onChange('')}
                className="inline-flex items-center gap-1 px-2 py-1.5 text-xs text-dark-400 hover:text-red-400">
                <X size={13} /> Remove
              </button>
            )}
          </div>
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="…or paste an image URL"
            className="w-full px-3 py-1.5 text-xs bg-dark-950 border border-dark-700 rounded-lg text-dark-100 focus:border-kcc-green focus:outline-none"
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
