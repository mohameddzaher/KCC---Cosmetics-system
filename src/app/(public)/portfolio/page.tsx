'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';

interface PortfolioItem {
  id: string;
  title: string;
  category: string;
  client: string;
  description: string;
  image: string;
}

const categories = ['All', 'Skincare', 'Haircare', 'Makeup', 'Suncare', 'Body Care'];

const demoItems: PortfolioItem[] = [
  { id: '1', title: 'Vitamin C Brightening Serum', category: 'Skincare', client: 'GlowUp Beauty', description: 'A high-potency 20% Vitamin C serum formulated for brightening and anti-aging.', image: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800&q=80' },
  { id: '2', title: 'Hydrating Gel Moisturizer', category: 'Skincare', client: 'PureGlow', description: 'Lightweight gel moisturizer with hyaluronic acid for all skin types.', image: 'https://images.unsplash.com/photo-1611930022073-b7a4ba5fcccd?w=800&q=80' },
  { id: '3', title: 'Keratin Repair Shampoo', category: 'Haircare', client: 'SilkStrand', description: 'Professional keratin shampoo for damaged and chemically treated hair.', image: 'https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?w=800&q=80' },
  { id: '4', title: 'SPF 50+ Sunscreen Cream', category: 'Suncare', client: 'SunShield Arabia', description: 'Broad-spectrum SPF 50+ sunscreen specially formulated for Gulf climate.', image: 'https://images.unsplash.com/photo-1556227834-09f1de7a7d14?w=800&q=80' },
  { id: '5', title: 'Matte Liquid Foundation', category: 'Makeup', client: 'Dalal Cosmetics', description: 'Long-wear matte foundation with buildable coverage in 24 shades.', image: 'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=800&q=80' },
  { id: '6', title: 'Retinol Night Cream', category: 'Skincare', client: 'NightRevive', description: 'Anti-aging night cream with encapsulated retinol and peptide complex.', image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800&q=80' },
  { id: '7', title: 'Argan Oil Hair Mask', category: 'Haircare', client: 'Moroccan Essence', description: 'Deep conditioning hair mask with pure argan oil and natural extracts.', image: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=800&q=80' },
  { id: '8', title: 'Shea Butter Body Lotion', category: 'Body Care', client: 'Nourish Arabia', description: 'Rich body lotion with organic shea butter for intense hydration.', image: 'https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=800&q=80' },
  { id: '9', title: 'Niacinamide Pore Serum', category: 'Skincare', client: 'ClearSkin Labs', description: '10% niacinamide serum for pore minimizing and oil control.', image: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800&q=80' },
];

export default function PortfolioPage() {
  const { t, locale } = useLanguage();
  const [activeCategory, setActiveCategory] = useState('All');
  const [list, setList] = useState<PortfolioItem[]>(demoItems);

  useEffect(() => {
    let cancelled = false;
    const pick = (v: any) => (typeof v === 'object' && v ? (v[locale] || v.en || '') : (v || ''));
    fetch('/api/content/portfolio', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (cancelled || !Array.isArray(data) || data.length === 0) return;
        setList(
          data.map((p: any, i: number) => ({
            id: p._id || String(i),
            title: pick(p.title),
            category: pick(p.category) || 'Skincare',
            client: p.client || '',
            description: pick(p.description),
            image: p.imageUrl || demoItems[i % demoItems.length].image,
          }))
        );
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [locale]);

  const filtered = activeCategory === 'All'
    ? list
    : list.filter((item) => item.category === activeCategory);

  return (
    <div className="min-h-screen bg-cream-100">
      {/* Hero */}
      <section className="relative pt-8 pb-20 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-cream-100 to-cream-50" />
        <div className="absolute bottom-0 -left-32 w-80 h-80 rounded-full bg-kcc-beige-light/45 blur-[120px]" />

        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-4xl sm:text-5xl font-bold text-ink-700 mb-4">{t('portfolio.title')}</h1>
            <p className="text-lg text-cream-800">{t('portfolio.subtitle')}</p>
          </motion.div>
        </div>
      </section>

      {/* Filter & Grid */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Category Filters */}
          <div className="flex flex-wrap gap-2 mb-10 justify-center">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-2 text-sm font-medium rounded-xl transition-all ${
                  activeCategory === cat
                    ? 'bg-kcc-green text-white shadow-lg shadow-kcc-green/20'
                    : 'bg-cream-200 text-cream-700 hover:text-ink-700 hover:bg-white border border-cream-300'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Grid */}
          <motion.div layout className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence mode="popLayout">
              {filtered.map((item) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3 }}
                  className="group bg-white border border-cream-300 shadow-soft rounded-2xl overflow-hidden hover:border-cream-400 transition-all"
                >
                  {/* Product image */}
                  <div className="aspect-square overflow-hidden relative">
                    <img
                      src={item.image}
                      alt={item.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-cream-50/70 to-transparent" />
                  </div>

                  <div className="p-5">
                    <span className="inline-block text-xs font-medium text-kcc-beige-dark bg-kcc-beige/10 px-2.5 py-1 rounded-full mb-3">
                      {item.category}
                    </span>
                    <h3 className="text-lg font-semibold text-ink-700 mb-1 group-hover:text-kcc-green transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-xs text-cream-800 mb-3">Client: {item.client}</p>
                    <p className="text-sm text-cream-700 leading-relaxed">{item.description}</p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>

          {filtered.length === 0 && (
            <div className="text-center py-16">
              <p className="text-cream-700">{t('common.noResults')}</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
