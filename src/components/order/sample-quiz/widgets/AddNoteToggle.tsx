'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface AddNoteToggleProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function AddNoteToggle({ value = '', onChange, placeholder }: AddNoteToggleProps) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(value.length > 0);

  return (
    // Centred on the same axis as the question heading and the action row —
    // it used to hug the left edge and broke the column.
    <div className="mt-8 flex flex-col items-center">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.2em] text-cream-700 transition-colors hover:text-kcc-rose-dark"
        >
          <Plus size={14} strokeWidth={2.5} />
          <span>{t('quiz.addNote')}</span>
        </button>
      ) : (
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="w-full max-w-xl overflow-hidden"
          >
            <div className="flex items-start gap-2">
              <textarea
                rows={3}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder ?? t('quiz.notePlaceholder')}
                className="flex-1 px-4 py-3 bg-surface border border-cream-300 rounded-2xl text-sm text-ink-700 placeholder:text-cream-700 focus:outline-none focus:border-ink-700 transition-colors resize-none"
              />
              <button
                type="button"
                onClick={() => { setOpen(false); onChange(''); }}
                className="p-2 text-cream-700 hover:text-ink-800 transition-colors"
                aria-label={t('ui.remove')}
              >
                <X size={16} />
              </button>
            </div>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}
