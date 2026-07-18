'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Factory as FactoryIcon, Gauge, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface FactoryData {
  id: string;
  name: string;
  location: string;
  capacity: string;
  area: string;
  features: string[];
  description: string;
  image: string;
}

const demoFactories: FactoryData[] = [
  {
    id: '1',
    name: 'KCC Main Production Facility',
    location: 'Riyadh Industrial City, Saudi Arabia',
    capacity: '10,000 units/day',
    area: '5,000 sqm',
    features: [
      'ISO 22716 GMP Certified',
      'Automated production lines',
      'Clean room environments (ISO Class 7)',
      'Advanced emulsion manufacturing',
      'Stability testing chambers',
      'In-house quality control lab',
    ],
    description: 'Our flagship manufacturing facility equipped with the latest technology for producing a wide range of cosmetics and personal care products.',
    image: 'https://images.unsplash.com/photo-1581093458791-9f3c3250a8b0?w=800&q=80',
  },
  {
    id: '2',
    name: 'KCC R&D and Innovation Center',
    location: 'Riyadh, Saudi Arabia',
    capacity: '500 formulations/month',
    area: '1,200 sqm',
    features: [
      'Advanced analytical instruments',
      'Pilot production line',
      'Sensory evaluation rooms',
      'Raw material testing lab',
      'Microbiological testing',
      'Dedicated formulation labs',
    ],
    description: 'Our research and development center where innovation meets science. Home to our team of expert cosmetic chemists and formulation specialists.',
    image: 'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=800&q=80',
  },
  {
    id: '3',
    name: 'KCC Packaging & Filling Center',
    location: 'Riyadh 2nd Industrial City, Saudi Arabia',
    capacity: '20,000 units/day',
    area: '3,500 sqm',
    features: [
      'High-speed filling lines',
      'Multi-format packaging capability',
      'Tube, bottle, jar, and sachet filling',
      'Automated labeling systems',
      'Shrink wrapping & cartoning',
      'Batch tracking & serialization',
    ],
    description: 'Dedicated packaging and filling facility capable of handling diverse product formats with precision and efficiency.',
    image: 'https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=800&q=80',
  },
];

export default function FactoriesPage() {
  const { t, locale } = useLanguage();
  const [list, setList] = useState<FactoryData[]>(demoFactories);

  useEffect(() => {
    let cancelled = false;
    const pick = (v: any) => (typeof v === 'object' && v ? (v[locale] || v.en || '') : (v || ''));
    fetch('/api/content/factories', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (cancelled || !Array.isArray(data) || data.length === 0) return;
        setList(
          data.map((f: any, i: number) => ({
            id: f._id || String(i),
            name: pick(f.name),
            location: pick(f.location),
            capacity: pick(f.capacity),
            area: f.area || demoFactories[i % demoFactories.length].area,
            features: Array.isArray(f.features) ? f.features.map((x: any) => pick(x)) : [],
            description: pick(f.description),
            image: f.imageUrl || demoFactories[i % demoFactories.length].image,
          }))
        );
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [locale]);

  return (
    <div className="min-h-screen bg-cream-100">
      {/* Hero */}
      <section className="relative pt-8 pb-20 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-cream-100 to-cream-50" />
        <div className="absolute top-1/4 -right-32 w-80 h-80 rounded-full bg-kcc-rose-light/40 blur-[120px]" />

        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-4xl sm:text-5xl font-bold text-ink-700 mb-4">{t('factories.title')}</h1>
            <p className="text-lg text-cream-800">{t('factories.subtitle')}</p>
          </motion.div>
        </div>
      </section>

      {/* Factories */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto space-y-8">
          {list.map((factory, i) => (
            <motion.div
              key={factory.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
              className="bg-white border border-cream-300 shadow-soft rounded-2xl overflow-hidden hover:border-cream-400 transition-colors"
            >
              <div className="grid lg:grid-cols-5 gap-0">
                {/* Factory image */}
                <div className="lg:col-span-2 aspect-video lg:aspect-auto overflow-hidden min-h-[250px] relative">
                  <img
                    src={factory.image}
                    alt={factory.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent to-cream-100/20" />
                </div>

                {/* Content */}
                <div className="lg:col-span-3 p-6 lg:p-8">
                  <h3 className="text-xl font-bold text-ink-700 mb-2">{factory.name}</h3>

                  <div className="flex flex-wrap items-center gap-4 text-sm text-cream-700 mb-4">
                    <span className="flex items-center gap-1.5">
                      <MapPin size={14} className="text-kcc-green" />
                      {factory.location}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Gauge size={14} className="text-kcc-beige-dark" />
                      {factory.capacity}
                    </span>
                    <span className="text-cream-600">
                      Area: {factory.area}
                    </span>
                  </div>

                  <p className="text-cream-800 text-sm leading-relaxed mb-5">
                    {factory.description}
                  </p>

                  {/* Features */}
                  <div className="grid sm:grid-cols-2 gap-2">
                    {factory.features.map((feature, j) => (
                      <div key={j} className="flex items-start gap-2 text-sm text-cream-700">
                        <CheckCircle2 size={14} className="text-kcc-green mt-0.5 shrink-0" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
}
