'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X } from 'lucide-react';

interface AddNoteToggleProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function AddNoteToggle({ value = '', onChange, placeholder = 'Anything else we should know?' }: AddNoteToggleProps) {
  const [open, setOpen] = useState(value.length > 0);

  return (
    <div className="mt-6">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.2em] text-cream-700 hover:text-kcc-rose-dark transition-colors"
        >
          <Plus size={14} strokeWidth={2.5} />
          <span>Add a note</span>
        </button>
      ) : (
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="flex items-start gap-2">
              <textarea
                rows={3}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="flex-1 px-4 py-3 bg-white border border-cream-300 rounded-2xl text-sm text-ink-700 placeholder:text-cream-700 focus:outline-none focus:border-ink-700 transition-colors resize-none"
              />
              <button
                type="button"
                onClick={() => { setOpen(false); onChange(''); }}
                className="p-2 text-cream-700 hover:text-ink-800 transition-colors"
                aria-label="Remove note"
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
