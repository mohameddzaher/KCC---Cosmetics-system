'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Beaker, Truck, ArrowRight } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export default function OrderPage() {
  const { t } = useLanguage();
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  const orderTypes = [
    {
      key: 'sample',
      icon: Beaker,
      title: t('order.sampleTitle'),
      description: 'Start here. Take our 5-minute quiz, design your sample, and we\'ll send you a personalized prototype.',
      href: '/order/sample',
      badge: 'Step 1 · Start here',
      gradient: 'from-kcc-rose-light/40 to-kcc-rose/15',
      borderColor: 'border-kcc-rose-dark/40',
      iconColor: 'text-kcc-rose-dark',
      hoverBorder: 'hover:border-kcc-rose-dark/70',
      ctaLabel: t('hero.requestSample'),
    },
    {
      key: 'bulk',
      icon: Truck,
      title: t('order.bulkTitle'),
      description: 'Already approved a sample? Pick it from your samples and scale it to bulk production with the same exact specs.',
      href: '/order/bulk',
      badge: 'Step 2 · After your sample',
      gradient: 'from-kcc-beige/30 to-kcc-beige/10',
      borderColor: 'border-kcc-beige/45',
      iconColor: 'text-kcc-beige-dark',
      hoverBorder: 'hover:border-kcc-beige-dark/70',
      ctaLabel: t('hero.placeBulkOrder'),
    },
  ];

  return (
    <div className="min-h-screen bg-cream-100 flex items-center justify-center pt-8 pb-20 px-4">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-32 w-96 h-96 rounded-full bg-kcc-rose-light/40 blur-[120px]" />
        <div className="absolute bottom-1/4 -right-32 w-80 h-80 rounded-full bg-kcc-beige-light/45 blur-[100px]" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto w-full">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl sm:text-5xl font-bold text-ink-700 mb-4">
            {t('order.title')}
          </h1>
          <p className="text-cream-700 text-lg max-w-xl mx-auto">
            {t('order.subtitle')}
          </p>
        </motion.div>

        {/* Cards */}
        <div className="grid md:grid-cols-2 gap-6 lg:gap-8">
          {orderTypes.map((type, index) => {
            const Icon = type.icon;
            return (
              <motion.div
                key={type.key}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 + index * 0.15 }}
              >
                <Link
                  href={type.href}
                  className={`group block relative p-8 lg:p-10 rounded-2xl border ${type.borderColor} ${type.hoverBorder} bg-white/85 backdrop-blur-sm transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl`}
                  onMouseEnter={() => setHoveredCard(type.key)}
                  onMouseLeave={() => setHoveredCard(null)}
                >
                  {/* Gradient overlay */}
                  <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${type.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />

                  <div className="relative z-10">
                    {/* Step badge */}
                    <span className="inline-block text-[10px] font-semibold uppercase tracking-[0.22em] text-cream-700 mb-4">
                      {type.badge}
                    </span>

                    {/* Icon */}
                    <div className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-cream-200 ${type.iconColor} mb-5 group-hover:scale-110 transition-transform duration-300`}>
                      <Icon size={28} />
                    </div>

                    {/* Title */}
                    <h2 className="text-2xl font-bold text-ink-700 mb-3">
                      {type.title}
                    </h2>

                    {/* Description */}
                    <p className="text-cream-700 leading-relaxed mb-8">
                      {type.description}
                    </p>

                    {/* CTA */}
                    <div className={`inline-flex items-center gap-2 text-sm font-semibold ${type.iconColor} group-hover:gap-3 transition-all duration-300`}>
                      <span>{type.ctaLabel}</span>
                      <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform duration-300 rtl-flip" />
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
